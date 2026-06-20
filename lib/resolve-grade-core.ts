// resolve-grade 공용 파이프라인 (서버 전용). resolve-grade·extract-grade 라우트가 공유.
// 동작: normalize → cacheGet → parseGrade(무료) → resolve-LLM rate limit → haiku → sanitize → cacheSet.
// 외부 계약은 라우트(thin wrapper)가 유지. 본 모듈은 서버에서만 import(supabaseAdmin·ANTHROPIC 사용).
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase/server';
import { RESIN_KB } from '@/lib/resin-kb';
import { parseGrade, normalizeGrade } from '@/lib/grade-parser';
import type { GradeParseResult, Filler, FlameRetardant, FlameRetardantType } from '@/lib/grade-parser';

const DAILY_LIMIT = 30;                       // resolve-LLM 실호출만 카운트
const LLM_MODEL = 'claude-haiku-4-5-20251001';
const TTL_FOUND_MS = 90 * 24 * 3600 * 1000;   // 확정 90일
const TTL_NULL_MS = 7 * 24 * 3600 * 1000;     // 미상 7일

const VALID_FILLER = new Set<Filler>(['없음', 'GF(유리섬유)', 'CF(탄소섬유)', 'GF+CF', '미네랄', '탈크', 'GB(유리비드)', '기타']);
const VALID_FLAME = new Set<FlameRetardant>(['없음', 'UL94 V-0', 'UL94 V-1', 'UL94 V-2', 'UL94 HB', 'UL94 5VA', 'UL94 5VB']);
const VALID_FLAMETYPE = new Set<FlameRetardantType>(['해당없음', '할로겐', '할로겐프리', '적인계', '멜라민계']);
const RESIN_KEYS = new Set(Object.keys(RESIN_KB));

export type ResolveResult = Omit<GradeParseResult, 'source'> & { source: 'pattern' | 'llm' };
export type UnknownResult = {
  resinType: null; filler: '없음'; fillerContent: ''; flameRetardant: '없음';
  flameRetardantType: '해당없음'; confidence: 'low'; source: 'pattern' | 'llm'; note?: string;
};
export type CacheValue = ResolveResult | UnknownResult;

// 라우트가 HTTP 응답으로 매핑하는 결과(429/500을 보존하기 위한 판별 유니온)
export type ResolveOutcome =
  | { kind: 'ok'; result: CacheValue; cached: boolean }
  | { kind: 'rate_limited' }
  | { kind: 'rl_error' };

function unknownResult(source: 'pattern' | 'llm', note?: string): UnknownResult {
  return { resinType: null, filler: '없음', fillerContent: '', flameRetardant: '없음', flameRetardantType: '해당없음', confidence: 'low', source, ...(note ? { note } : {}) };
}

// ── 캐시 (service_role, RLS 우회). 테이블 부재·오류는 비치명적(미스 취급) ──
async function cacheGet(cacheKey: string): Promise<CacheValue | null> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('grade_cache')
      .select('found, result, source, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', nowIso)
      .maybeSingle();
    if (error || !data) return null;
    const src = data.source === 'llm' ? 'llm' : 'pattern';
    if (!data.found || !data.result) return unknownResult(src);
    return { ...(data.result as ResolveResult), source: src };
  } catch {
    return null;
  }
}

async function cacheBumpHit(cacheKey: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin.from('grade_cache').select('hit_count').eq('cache_key', cacheKey).maybeSingle();
    const next = ((data?.hit_count as number | undefined) ?? 0) + 1;
    await supabaseAdmin.from('grade_cache').update({ hit_count: next }).eq('cache_key', cacheKey);
  } catch { /* best-effort */ }
}

async function cacheSet(cacheKey: string, value: CacheValue): Promise<void> {
  try {
    const found = value.resinType !== null;
    const expiresAt = new Date(Date.now() + (found ? TTL_FOUND_MS : TTL_NULL_MS)).toISOString();
    await supabaseAdmin.from('grade_cache').upsert({
      cache_key: cacheKey,
      found,
      result: found ? value : null,
      source: value.source,
      expires_at: expiresAt,
    }, { onConflict: 'cache_key' });
  } catch { /* 비치명적 */ }
}

// ── LLM 응답 방어적 검증 (ocr-parse-hardening) ──
function sanitizeLlm(raw: unknown): CacheValue {
  const o = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const rt = typeof o.resinType === 'string' && RESIN_KEYS.has(o.resinType) ? o.resinType : null;
  if (rt === null) return unknownResult('llm');
  const filler = (typeof o.filler === 'string' && VALID_FILLER.has(o.filler as Filler)) ? o.filler as Filler : '없음';
  const rawContent = o.fillerContent ?? o.fillerPct;
  const fillerContent = (typeof rawContent === 'string' && /^\d{1,2}$/.test(rawContent)) ? rawContent
    : (typeof rawContent === 'number' && Number.isFinite(rawContent)) ? String(rawContent) : '';
  const flame = (typeof o.flameRetardant === 'string' && VALID_FLAME.has(o.flameRetardant as FlameRetardant)) ? o.flameRetardant as FlameRetardant : '없음';
  const flameType = (typeof o.flameRetardantType === 'string' && VALID_FLAMETYPE.has(o.flameRetardantType as FlameRetardantType)) ? o.flameRetardantType as FlameRetardantType : '해당없음';
  const confidence = (o.confidence === 'high' || o.confidence === 'med' || o.confidence === 'low') ? o.confidence : 'med';
  const note = typeof o.note === 'string' ? o.note.slice(0, 200) : undefined;
  return { resinType: rt, filler, fillerContent: filler === '없음' ? '' : fillerContent, flameRetardant: flame, flameRetardantType: flameType, confidence, source: 'llm', ...(note ? { note } : {}) };
}

/**
 * 공용 resolve 파이프라인. rawGrade(비어있지 않다고 가정) + userId.
 * rate limit/오류는 ResolveOutcome으로 신호 → 라우트가 HTTP로 매핑(작업2 계약 보존).
 */
export async function resolveGradeCore(rawGrade: string, userId: string): Promise<ResolveOutcome> {
  const cacheKey = normalizeGrade(rawGrade);
  if (!cacheKey) return { kind: 'ok', result: unknownResult('pattern'), cached: false };

  // 1) 캐시
  const hit = await cacheGet(cacheKey);
  if (hit) {
    void cacheBumpHit(cacheKey);
    return { kind: 'ok', result: hit, cached: true };
  }

  // 2) 패턴 (무료)
  const pattern = parseGrade(rawGrade);
  if (pattern && pattern.resinType !== null) {
    const result: ResolveResult = { ...pattern, source: 'pattern' };
    void cacheSet(cacheKey, result);
    return { kind: 'ok', result, cached: false };
  }

  // 3) LLM rate limit (실호출만 카운트)
  const today = new Date().toISOString().split('T')[0];
  const { data: rlData, error: rlErr } = await supabaseAdmin.rpc('increment_resolve_count', {
    p_user_id: userId, p_date: today, p_limit: DAILY_LIMIT,
  });
  if (rlErr) return { kind: 'rl_error' };
  const rl = rlData as { ok: boolean; count: number };
  if (!rl?.ok) return { kind: 'rate_limited' };

  // 4) LLM (haiku)
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) return { kind: 'rl_error' }; // 키 미설정 → 500 처리 위임
  const client = new Anthropic({ apiKey });
  const keyList = Object.keys(RESIN_KB).join(' ');
  const sys = `너는 사출 성형 수지 그레이드명에서 재료 정보를 식별하는 도구다. 사용자가 입력한 그레이드명을 식별(echo)할 뿐, 특정 제조사·브랜드를 추천하지 않는다.
다음 JSON 객체 하나만 반환하라(머리말·설명·코드펜스 없이 '{'로 시작):
{ "resinType": <아래 키 중 하나 또는 null>, "filler": <"없음"|"GF(유리섬유)"|"CF(탄소섬유)"|"GF+CF"|"미네랄"|"탈크"|"GB(유리비드)"|"기타">, "fillerContent": "<숫자만 또는 빈문자열>", "flameRetardant": <"없음"|"UL94 V-0"|"UL94 V-1"|"UL94 V-2"|"UL94 HB"|"UL94 5VA"|"UL94 5VB">, "flameRetardantType": <"해당없음"|"할로겐"|"할로겐프리"|"적인계"|"멜라민계">, "confidence": "high"|"med"|"low", "note": "" }
resinType 허용 키: ${keyList}
규칙:
- 확실하지 않으면 resinType=null, confidence="low". 모르는 그레이드를 아는 척하지 마라(환각 금지).
- 필러 종류는 알지만 함량(%)이 불명확하면 filler만 채우고 fillerContent="".
- 대체 그레이드·타사 제품 추천을 출력하지 마라.`;

  let llmResult: CacheValue;
  try {
    const resp = await client.messages.create({
      model: LLM_MODEL,
      max_tokens: 512,
      system: sys,
      messages: [{ role: 'user', content: `그레이드명: ${rawGrade}` }],
    });
    const tb = resp.content.find((b) => b.type === 'text');
    let txt = (tb && tb.type === 'text' ? tb.text : '').trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
    const a = txt.indexOf('{'); const b = txt.lastIndexOf('}');
    if (a !== -1 && b > a) txt = txt.slice(a, b + 1);
    llmResult = sanitizeLlm(JSON.parse(txt));
  } catch {
    llmResult = unknownResult('llm'); // 파싱 실패도 환각 대신 미상
  }

  void cacheSet(cacheKey, llmResult);
  return { kind: 'ok', result: llmResult, cached: false };
}

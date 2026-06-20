import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { tryMock } from '@/lib/mock';
import { supabaseAdmin } from '@/lib/supabase/server';
import { RESIN_KB } from '@/lib/resin-kb';
import { parseGrade, normalizeGrade } from '@/lib/grade-parser';
import type { GradeParseResult, Filler, FlameRetardant, FlameRetardantType } from '@/lib/grade-parser';

// ── 상수 ────────────────────────────────────────────────────────────────
const DAILY_LIMIT = 30;                 // LLM 실호출만 카운트 (캐시/패턴 히트는 미소비)
const LLM_MODEL = 'claude-haiku-4-5-20251001';
const TTL_FOUND_MS = 90 * 24 * 3600 * 1000;  // 확정: 90일
const TTL_NULL_MS = 7 * 24 * 3600 * 1000;    // 미상: 7일

const VALID_FILLER = new Set<Filler>(['없음', 'GF(유리섬유)', 'CF(탄소섬유)', 'GF+CF', '미네랄', '탈크', 'GB(유리비드)', '기타']);
const VALID_FLAME = new Set<FlameRetardant>(['없음', 'UL94 V-0', 'UL94 V-1', 'UL94 V-2', 'UL94 HB', 'UL94 5VA', 'UL94 5VB']);
const VALID_FLAMETYPE = new Set<FlameRetardantType>(['해당없음', '할로겐', '할로겐프리', '적인계', '멜라민계']);
const RESIN_KEYS = new Set(Object.keys(RESIN_KB));

type ResolveResult = Omit<GradeParseResult, 'source'> & { source: 'pattern' | 'llm' };
type UnknownResult = {
  resinType: null; filler: '없음'; fillerContent: ''; flameRetardant: '없음';
  flameRetardantType: '해당없음'; confidence: 'low'; source: 'pattern' | 'llm'; note?: string;
};
type CacheValue = ResolveResult | UnknownResult;

function unknownResult(source: 'pattern' | 'llm', note?: string): UnknownResult {
  return { resinType: null, filler: '없음', fillerContent: '', flameRetardant: '없음', flameRetardantType: '해당없음', confidence: 'low', source, ...(note ? { note } : {}) };
}

// ── 캐시 (service_role, RLS 우회). 테이블 부재(마이그레이션 전)·오류는 비치명적 처리 ──
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
    return null; // 테이블 없음/네트워크 등 → 캐시 미스로 취급
  }
}

async function cacheBumpHit(cacheKey: string): Promise<void> {
  try {
    // 원자 증가가 이상적이나 RPC 미정의 환경 호환 위해 read-modify-write best-effort
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
  } catch { /* 테이블 부재 등 → 저장 생략(비치명적) */ }
}

// ── LLM 응답 방어적 검증 (ocr-parse-hardening 패턴) ──────────────────────
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const mock = tryMock(body, 'resolve'); if (mock) return mock;

    // ── 인증 (extract-settings 패턴) ─────────────────────────
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
    const userId = userData.user.id;

    // ── 입력 ─────────────────────────────────────────────────
    const rawGrade = typeof body.grade === 'string' ? body.grade : (typeof body.gradeName === 'string' ? body.gradeName : '');
    const cacheKey = normalizeGrade(rawGrade);
    if (!cacheKey) return NextResponse.json({ error: '그레이드명이 비어 있습니다.', code: 'EMPTY_INPUT' }, { status: 400 });

    // ── 1) 캐시 조회 (외부 호출 0) ───────────────────────────
    const cached = await cacheGet(cacheKey);
    if (cached) {
      void cacheBumpHit(cacheKey);
      return NextResponse.json({ ...cached, cached: true });
    }

    // ── 2) 패턴 파서 (무료, Stage 1 재사용) ──────────────────
    const pattern = parseGrade(rawGrade);
    if (pattern && pattern.resinType !== null) {
      const result: ResolveResult = { ...pattern, source: 'pattern' };
      void cacheSet(cacheKey, result);
      return NextResponse.json({ ...result, cached: false });
    }

    // ── 3) LLM 폴백 (haiku) — 캐시 미스 + 패턴 미확정 시에만 ──
    // rate limit: LLM 실호출만 카운트 (여기서 증가)
    const today = new Date().toISOString().split('T')[0];
    const { data: rlData, error: rlErr } = await supabaseAdmin.rpc('increment_resolve_count', {
      p_user_id: userId, p_date: today, p_limit: DAILY_LIMIT,
    });
    if (rlErr) return NextResponse.json({ error: 'Rate limit 확인 중 오류', code: 'RL_ERROR' }, { status: 500 });
    const rl = rlData as { ok: boolean; count: number };
    if (!rl?.ok) {
      return NextResponse.json(
        { error: `오늘 자동 조회 한도(${DAILY_LIMIT}회)를 초과했습니다. 직접 입력은 계속 가능합니다.`, code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) return NextResponse.json({ error: '서버 환경변수 ANTHROPIC_API_KEY 미설정' }, { status: 500 });
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
      llmResult = unknownResult('llm'); // 파싱 실패도 환각 대신 미상 처리
    }

    void cacheSet(cacheKey, llmResult);
    return NextResponse.json({ ...llmResult, cached: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '그레이드 해석 실패' },
      { status: 500 }
    );
  }
}

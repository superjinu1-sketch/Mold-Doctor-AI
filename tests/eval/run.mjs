#!/usr/bin/env node
/**
 * tests/eval/run.mjs  —  Mold Doctor AI accuracy eval (LLM-as-judge)
 *
 * Usage:
 *   # dev server running on port 3000 (npm run dev in another terminal)
 *   node tests/eval/run.mjs
 *
 *   # custom port
 *   node tests/eval/run.mjs --port 3001
 *
 * 채점 기준 (0-100):
 *   phase 정확  20점 | root cause 40점 | recommendations 30점 | severity 10점
 *   hard trap 회피 시 최대 +10 bonus → 110 캡
 *   PASS 임계 = 70점
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { request as httpRequest } from 'http';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { costKrw } from './cost.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '../..');

/* ── config ─────────────────────────────────────────── */
const PORT = (() => {
  const idx = process.argv.indexOf('--port');
  return idx !== -1 ? process.argv[idx + 1] : (process.env.EVAL_PORT || '3000');
})();
const MEASURE_COST = process.argv.includes('--measure-cost');
const NO_CACHE = process.argv.includes('--no-cache'); // 캐시 우회(읽기·쓰기 안 함) — before/after 신선비교용
const IDS_FILTER = (() => {
  const i = process.argv.indexOf('--ids');
  return i !== -1 && process.argv[i + 1] ? new Set(process.argv[i + 1].split(',').map(s => s.trim()).filter(Boolean)) : null;
})();
const HOST = '127.0.0.1';
const PASS_THRESHOLD = 70;
const INTERVAL_MS = 6000; // rate-limit 회피 간격
const MAX_RETRIES = 5;    // 529 overloaded 재시도 (diagnose + judge 공통)
const JUDGE_MODEL = 'claude-haiku-4-5-20251001'; // Sonnet 대비 ~1/10 비용
const PROMPT_VERSION = 'v19';  // 흡습성 정확성 가드(흡습=극성기, ≠결정도) 추가 → 캐시 무효화
const CACHE_DIR = join(ROOT, 'tests/eval/.cache');
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000; // 7일

/* ── diagnose 응답 캐시 (프롬프트 버전 기준 7일 유효) ─── */
function cacheKey(caseId) {
  return createHash('sha256').update(`${caseId}:${PROMPT_VERSION}`).digest('hex').slice(0, 16);
}
function loadDiagnoseCache(caseId) {
  const path = join(CACHE_DIR, `${cacheKey(caseId)}.json`);
  if (!existsSync(path)) return null;
  try {
    const d = JSON.parse(readFileSync(path, 'utf-8'));
    if (Date.now() - d.ts > CACHE_TTL_MS) return null;
    return d.body;
  } catch { return null; }
}
function saveDiagnoseCache(caseId, body) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `${cacheKey(caseId)}.json`), JSON.stringify({ ts: Date.now(), body }));
}

/* ── API key — EVAL 전용 (billing 격리) ──────────────────
 * eval은 ANTHROPIC_API_KEY_EVAL만 사용한다. prod 키(ANTHROPIC_API_KEY)로의 silent fallback 금지.
 * (2026-06-21: eval이 prod와 같은 잔액을 써서 라이브 진단이 다운된 사고 재발 방지.)
 * 미설정 시 null 반환 → 호출부에서 명시적 에러로 중단. */
function loadApiKey() {
  if (process.env.ANTHROPIC_API_KEY_EVAL) return process.env.ANTHROPIC_API_KEY_EVAL;
  const envFile = join(ROOT, '.env.local');
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf-8').match(/^\s*ANTHROPIC_API_KEY_EVAL\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].trim();
  }
  return null;
}

/* ── KB_VERSION 추출 (lib/defect-kb.ts에서 — 하드코딩 회피) ─── */
function loadKbVersion() {
  try {
    const f = readFileSync(join(ROOT, 'lib/defect-kb.ts'), 'utf-8');
    const m = f.match(/KB_VERSION\s*=\s*'([^']+)'/);
    return m ? m[1] : 'unknown';
  } catch { return 'unknown'; }
}

/* ── field mapping: cases.json → /api/diagnose body ─── */
function buildPayload(c) {
  const ms = c.input.machine_settings || {};
  const mi = c.input.mold_info || {};
  const pi = c.input.product_info || {};

  const settings = {
    nozzleTemp:   String(ms.nozzle_temp ?? ''),
    zone1Temp:    String(ms.zone1_temp ?? ''),
    zone2Temp:    String(ms.zone2_temp ?? ''),
    zone3Temp:    String(ms.zone3_temp ?? ''),
    zone4Temp:    String(ms.zone4_temp ?? ''),
    moldTempFixed:   String(ms.mold_temp_fixed ?? ''),
    moldTempMoving:  String(ms.mold_temp_moving ?? ''),
    injPressure1:    String(ms.injection_pressure ?? ''),
    holdPressure:    String(ms.holding_pressure ?? ''),
    injSpeed1:       String(ms.injection_speed_1 ?? ''),
    injSpeed2:       String(ms.injection_speed_2 ?? ''),
    holdTime:        String(ms.holding_time ?? ''),
    coolTime:        String(ms.cooling_time ?? ''),
    injTime:         '',
    metering:        String(ms.metering ?? ''),
    cushion:         String(ms.cushion ?? ''),
    backPressure:    String(ms.back_pressure ?? ''),
    screwRpm:        String(ms.screw_rpm ?? ''),
    clampForce:      String(ms.clamp_force ?? ''),
  };

  const advSettings = {
    vpTransferPos: '', vpTransferPressure: '',
    preInjectDecompDist: '', preInjectDecompSpeed: '', postMeterDecompDist: '',
    actualFillTime: '', actualPeakPressure: String(ms.actual_peak_pressure ?? ''), actualCushion: String(ms.actual_cushion ?? ''), actualCycleTime: '', actualPartWeight: '',
    dryTemp:  String(ms.drying_temp ?? ''),
    dryTime:  String(ms.drying_time ?? ''),
    dryerType: ms.dryer_type || '없음',
    moistureContent: '',
    hrManifoldTemp: '', hrNozzle1Temp: '', hrNozzle2Temp: '', hrNozzle3Temp: '', hrNozzle4Temp: '', valveGate: '없음',
    regrindRatio: String(c.input.color_info?.regrind_ratio ?? ''),
    colorType: c.input.color_info?.masterbatch_type || '없음',
    mbRatio: String(c.input.color_info?.masterbatch_ratio ?? ''),
    machineModel: '', screwDiameter: '', maxClampForce: String(ms.max_clamp_force ?? ''), maxInjPressure: String(ms.max_inj_pressure ?? ''),
  };

  return {
    defectType: c.input.defect_type || '',
    defectDescription: c.input.defect_description || '',
    resinInfo: {
      resinType:   c.input.resin_type || '',
      filler:      '없음',
      fillerContent: '',
      flameRetardant: '없음',
      flameRetardantThickness: '미입력',
      flameRetardantType: '해당없음',
      resinDetail: c.input.resin_detail || '',
      resinGrade:  '',
    },
    settings,
    advSettings,
    moldInfo: {
      moldType:   mi.mold_type || '',
      gateType:   mi.gate_type || '',
      cavities:   String(mi.cavity_count ?? ''),
      runnerType: mi.runner_type || '',
    },
    productInfo: {
      weight:           String(pi.product_weight ?? ''),
      wallThicknessMin: String(pi.wall_thickness_min ?? ''),
      wallThicknessMax: String(pi.wall_thickness_max ?? ''),
      notes: '',
    },
    images: [],
    moldDrawings: [],
  };
}

/* ── HTTP POST helper ────────────────────────────────── */
function httpPost(path, bodyObj, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const req = httpRequest({
      host: HOST, port: Number(PORT), path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

/* ── server ready check (GET /) ─────────────────────── */
function httpGet(path, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: HOST, port: Number(PORT), path, method: 'GET' }, resolve);
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function waitForServer(maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try { await httpGet('/', 3000); return true; }
    catch { await new Promise(r => setTimeout(r, 1000)); }
  }
  return false;
}

/* ── exponential backoff helper ─────────────────────── */
async function withRetry(fn, label = '') {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String(e?.message || e);
      const isOverload = msg.includes('529') || msg.includes('overloaded') || msg.includes('529') || msg.includes('rate_limit') || msg.includes('429');
      if (isOverload && attempt < MAX_RETRIES) {
        const wait = Math.min(attempt * 15000, 60000);
        process.stdout.write(` [${label} 529 retry ${attempt}/${MAX_RETRIES}, ${wait/1000}s]`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw e;
      }
    }
  }
}

/* ── LLM-as-judge ───────────────────────────────────── */
async function judgeCase(c, aiRaw, client) {
  const aiResult = (() => { try { return JSON.parse(aiRaw); } catch { return null; } })();
  if (!aiResult) return { score: 0, pass: false, reasoning: 'AI 응답 JSON 파싱 실패', phase_ok: false, trap_avoided: null };

  const exp = c.expected;
  const hasTrap = !!exp.trap;

  const causeSummary = (aiResult.causes || [])
    .map(ca => `[${ca.probability}%] ${ca.description}`)
    .join(' / ');
  const recSummary = (aiResult.recommendations || [])
    .slice(0, 5)
    .map(r => `${r.parameter}: ${r.current}→${r.recommended}`)
    .join(' / ');

  const prompt = `당신은 사출 성형 트러블슈팅 전문가이자 채점관이다.

## AI 응답 요약
- defect_phase: ${aiResult.defect_phase}
- severity: ${aiResult.severity}
- summary: ${aiResult.summary}
- 주요 원인(상위 3개): ${causeSummary || '없음'}
- 주요 조치(상위 5개): ${recSummary || '없음'}

## 정답 기준 (cases.json expected)
- 정답 root_cause: ${exp.root_cause}
- 정답 key_recommendations: ${exp.key_recommendations.join(', ')}
- 정답 phase: ${exp.expected_phase}${exp.phase_also_accept?.length ? ` (이 결함은 표면 스킨 형성 단계가 본질적으로 모호 → 다음 phase도 정답으로 인정: ${exp.phase_also_accept.join(', ')})` : ''}
- 정답 severity: ${exp.severity}
${hasTrap ? `- 오진 함정(trap): ${exp.trap}` : ''}

## 채점 기준 (총 100점, hard trap 회피 시 +10 bonus)
1. phase 정확 (20점): AI의 defect_phase가 정답 phase와 일치하면 만점. 위 "정답으로 인정" 목록이 있으면 그 중 하나와 일치해도 만점.
2. root cause 정확도 (40점): AI가 핵심 근본 원인을 올바르게 지목했는가 (부분 점수 가능)
3. recommendations 적합성 (30점): AI 조치가 정답 key_recommendations와 방향이 맞는가
4. severity 정확 (10점): high/medium/low 일치
${hasTrap ? '5. trap 회피 보너스 (10점): AI가 오진 함정을 피했는가 (건조 탓으로 돌리지 않음 등)' : ''}

다음 JSON으로만 응답하라 (마크다운 없이):
{
  "score": 75,
  "phase_ok": true,
  "root_cause_score": 30,
  "rec_score": 25,
  "severity_ok": true,
  "trap_avoided": null,
  "pass": true,
  "reasoning": "2-3문장 채점 근거"
}
trap_avoided는 hard case가 아니면 null. pass = score >= 70.`;

  try {
    const res = await withRetry(() => client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    }), 'judge');
    const txt = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
    const j = JSON.parse(txt.replace(/^```json\s*/i,'').replace(/\s*```$/,''));
    const ju = res.usage;
    j._judgeUsage = { in: ju.input_tokens, out: ju.output_tokens, model: JUDGE_MODEL };
    return j;
  } catch (e) {
    return { score: 0, pass: false, reasoning: `Judge 오류: ${e.message}`, phase_ok: false, trap_avoided: null };
  }
}

/* ── main ────────────────────────────────────────────── */
async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  Mold Doctor AI — Eval Runner (LLM-as-judge)');
  console.log(`  대상: http://${HOST}:${PORT}/api/diagnose`);
  console.log(`  케이스: ${join(__dir, 'cases.json')}`);
  console.log(`${'═'.repeat(60)}\n`);

  // API key
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('[eval] ANTHROPIC_API_KEY_EVAL 미설정 — eval은 EVAL 전용 키만 사용합니다(prod 키 fallback 금지).');
    console.error('       .env.local에 ANTHROPIC_API_KEY_EVAL=<dev-eval 워크스페이스 키> 추가 후 다시 실행하세요.');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });

  // Server check
  console.log('서버 확인 중...');
  const ready = await waitForServer(8000);
  if (!ready) {
    console.error(`\nFAIL: 서버가 응답하지 않습니다 (${HOST}:${PORT})`);
    console.error(`  → 별도 터미널에서 먼저 실행: PORT=${PORT} npm run dev`);
    process.exit(1);
  }
  console.log(`서버 준비 완료 (포트 ${PORT})\n`);

  let cases = JSON.parse(readFileSync(join(__dir, 'cases.json'), 'utf-8'));
  if (IDS_FILTER) {
    cases = cases.filter(c => IDS_FILTER.has(c.id));
    console.log(`  --ids: ${cases.length}건만 실행 → ${cases.map(c => c.id).join(', ')}\n`);
  }
  const results = [];
  const costRows = [];      // --measure-cost 케이스별 비용
  let judgeTotalKrw = 0;    // judge(haiku) 원가 별도 집계

  if (MEASURE_COST) {
    console.log('  ⚠️  --measure-cost: 캐시 우회 + 헤더 usage 수집 모드\n');
  }

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const tag = `[${i+1}/${cases.length}] ${c.id} (${c.difficulty.toUpperCase()})`;
    process.stdout.write(`${tag} ${c.title.slice(0, 40)}... `);

    // 1. Call /api/diagnose — 캐시 히트 시 API 스킵 (--measure-cost 시 항상 실콜)
    let aiRaw = '';
    let diagError = null;
    let diagHeaders = {};
    const cached = (MEASURE_COST || NO_CACHE) ? null : loadDiagnoseCache(c.id);
    if (cached) {
      process.stdout.write(' [cached]');
      aiRaw = cached;
    } else
    try {
      const payload = buildPayload(c);
      const diagRes = await withRetry(async () => {
        const r = await httpPost('/api/diagnose', payload, 120000);
        if (r.status === 529 || (r.status === 500 && r.body.includes('overloaded'))) {
          throw new Error(`529 overloaded: ${r.body.slice(0, 80)}`);
        }
        return r;
      }, 'diag');
      if (diagRes.status !== 200) {
        diagError = `HTTP ${diagRes.status}: ${diagRes.body.slice(0, 120)}`;
      } else {
        aiRaw = diagRes.body;
        diagHeaders = diagRes.headers || {};
        if (!MEASURE_COST && !NO_CACHE) saveDiagnoseCache(c.id, aiRaw);
      }
    } catch (e) {
      diagError = e.message;
    }
    if (diagError) {
      console.log(` ✗ (${diagError.slice(0, 60)})`);
      results.push({ id: c.id, title: c.title, difficulty: c.difficulty, score: 0, pass: false, error: diagError, reasoning: '' });
      if (i < cases.length - 1) await new Promise(r => setTimeout(r, INTERVAL_MS));
      continue;
    }

    // 1b. prevent_image_fallback 회귀 assert
    if (c.prevent_image_fallback) {
      let parsed = null;
      try { parsed = JSON.parse(aiRaw); } catch { /* ignore */ }
      const fallbackTypes = ['No_Defect_Detected', 'Image_Unreadable'];
      const gotFallback = parsed && fallbackTypes.includes(parsed.defect_type?.en);
      if (gotFallback) {
        const ft = parsed.defect_type.en;
        console.log(` ❌ REGRESSION (이미지 폴백 오분기: ${ft})`);
        results.push({ id: c.id, title: c.title, difficulty: c.difficulty, score: 0, pass: false,
          error: `이미지 폴백 오분기 — ${ft} (이미지 없는 텍스트 경로에서 발생하면 안 됨)`, reasoning: '' });
        if (i < cases.length - 1) await new Promise(r => setTimeout(r, INTERVAL_MS));
        continue;
      }
    }

    // 2. Judge
    let judgment;
    try {
      judgment = await judgeCase(c, aiRaw, client);
    } catch (e) {
      judgment = { score: 0, pass: false, reasoning: `Judge 오류: ${e.message}`, phase_ok: false, trap_avoided: null };
    }

    // 2b. judge 안정화 (v1.4) — 경계 점수(65~75)는 judge만 2회 추가 실행 후 3회 중앙값으로 확정.
    //     diagnose 응답·채점 기준·threshold(70)는 불변. 동일 aiRaw 재사용(추가 비용=haiku 2회).
    const judgeScores = [judgment.score];
    if (judgment.score >= 65 && judgment.score <= 75) {
      for (let k = 0; k < 2; k++) {
        try {
          const extra = await judgeCase(c, aiRaw, client);
          if (typeof extra.score === 'number') judgeScores.push(extra.score);
        } catch { /* 추가 judge 실패 시 첫 점수 유지 */ }
      }
      if (judgeScores.length === 3) {
        const median = [...judgeScores].sort((a, b) => a - b)[1];
        judgment.score = median;
        judgment.pass = median >= PASS_THRESHOLD;
        process.stdout.write(` [judge×3 ${judgeScores.join('/')}→med ${median}]`);
      }
    }
    judgment.judge_scores = judgeScores;

    // cost 집계 (--measure-cost 시)
    if (MEASURE_COST) {
      const usageIn  = parseInt(diagHeaders['x-usage-in']        || '0', 10);
      const usageOut = parseInt(diagHeaders['x-usage-out']       || '0', 10);
      const cachRead = parseInt(diagHeaders['x-usage-cacheread'] || '0', 10);
      const cachWrite= parseInt(diagHeaders['x-usage-cachewrite']|| '0', 10);
      const model    = diagHeaders['x-usage-model'] || 'claude-sonnet-4-6';
      const krw = costKrw({ model, in: usageIn, out: usageOut, cacheRead: cachRead, cacheWrite: cachWrite });
      costRows.push({ id: c.id, model, in: usageIn, out: usageOut, cacheRead: cachRead, cacheWrite: cachWrite, krw });
      if (judgment._judgeUsage) {
        const ju = judgment._judgeUsage;
        judgeTotalKrw += costKrw({ model: ju.model, in: ju.in, out: ju.out });
      }
    }

    const passStr = judgment.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${passStr} (${judgment.score}점)${MEASURE_COST && costRows.length ? ` [₩${costRows[costRows.length-1].krw}]` : ''}`);

    results.push({
      id: c.id,
      title: c.title,
      difficulty: c.difficulty,
      score: judgment.score,
      pass: judgment.pass,
      phase_ok: judgment.phase_ok,
      trap_avoided: judgment.trap_avoided,
      judge_scores: judgment.judge_scores || [judgment.score],
      reasoning: judgment.reasoning || '',
      error: null,
    });

    if (i < cases.length - 1) await new Promise(r => setTimeout(r, INTERVAL_MS));
  }

  // ── Results summary ──────────────────────────────────
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / total);
  const basicResults = results.filter(r => r.difficulty === 'basic');
  const hardResults  = results.filter(r => r.difficulty === 'hard');
  const basicPass = basicResults.filter(r => r.pass).length;
  const hardPass  = hardResults.filter(r => r.pass).length;
  const basicAvg  = Math.round(basicResults.reduce((s,r) => s + r.score, 0) / (basicResults.length || 1));
  const hardAvg   = Math.round(hardResults.reduce((s,r) => s + r.score, 0) / (hardResults.length || 1));

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  평가 결과');
  console.log(`${'═'.repeat(60)}`);
  console.log(`  전체 정확도: ${passed}/${total} PASS  (평균 ${avgScore}점)`);
  console.log(`  Basic:  ${basicPass}/${basicResults.length} PASS  (평균 ${basicAvg}점)`);
  console.log(`  Hard:   ${hardPass}/${hardResults.length} PASS  (평균 ${hardAvg}점)`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  ${'ID'.padEnd(12)} ${'난이도'.padEnd(8)} ${'점수'.padEnd(6)} ${'결과'.padEnd(8)} 제목`);
  console.log(`  ${'─'.repeat(55)}`);
  for (const r of results) {
    const mark = r.pass ? '✅' : '❌';
    const diff = r.difficulty === 'hard' ? 'HARD ' : 'basic';
    console.log(`  ${r.id.padEnd(12)} ${diff.padEnd(8)} ${String(r.score).padEnd(6)} ${mark}      ${r.title.slice(0, 30)}`);
  }
  console.log(`${'─'.repeat(60)}`);

  // Failure analysis
  const failures = results.filter(r => !r.pass);
  if (failures.length > 0) {
    console.log('\n  실패 케이스 분석:');
    for (const r of failures) {
      console.log(`\n  [${r.id}] ${r.title}`);
      if (r.error) console.log(`    ERROR: ${r.error}`);
      else console.log(`    사유: ${r.reasoning}`);
    }
  }

  // Trap avoidance summary (hard cases)
  const hardWithTrap = hardResults.filter(r => r.trap_avoided !== null);
  if (hardWithTrap.length > 0) {
    const trapAvoided = hardWithTrap.filter(r => r.trap_avoided).length;
    console.log(`\n  Trap 회피율 (hard): ${trapAvoided}/${hardWithTrap.length}`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FINAL: ${Math.round(passed/total*100)}% PASS  (${passed}/${total})  평균 ${avgScore}/100`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── 결과 영속화 (git-tracked, v6 per-case 데이터 부재 재발 방지) ──
  // 판정 로직·점수 산식은 손대지 않고 저장만 추가한다.
  const kbVersion = loadKbVersion();
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const RESULTS_DIR = join(__dir, 'results');
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  const persisted = {
    kb_version: kbVersion,
    prompt_version: PROMPT_VERSION,
    timestamp: now.toISOString(),
    summary: {
      total, passed, pass_rate: Math.round(passed / total * 100), avg_score: avgScore,
      basic: { total: basicResults.length, passed: basicPass, avg: basicAvg },
      hard:  { total: hardResults.length,  passed: hardPass,  avg: hardAvg },
    },
    cases: results.map(r => ({
      id: r.id,
      difficulty: r.difficulty,
      score: r.score,
      pass: r.pass,
      trap_avoided: r.trap_avoided ?? null,
      judge_scores: r.judge_scores ?? [r.score],
      judge_reasoning: r.reasoning || r.error || '',
    })),
  };
  const resultsPath = join(RESULTS_DIR, `eval-${kbVersion}-${stamp}.json`);
  writeFileSync(resultsPath, JSON.stringify(persisted, null, 2));
  console.log(`  결과 영속화 저장: ${resultsPath}\n`);

  // ── Cost report (--measure-cost 시) ─────────────────────
  if (MEASURE_COST && costRows.length > 0) {
    const krwList = costRows.map(r => r.krw).sort((a, b) => a - b);
    const sum = krwList.reduce((s, v) => s + v, 0);
    const mean = Math.round(sum / krwList.length);
    const median = krwList[Math.floor(krwList.length / 2)];
    const p90 = krwList[Math.floor(krwList.length * 0.9)];
    const min = krwList[0];
    const max = krwList[krwList.length - 1];

    console.log(`\n${'═'.repeat(60)}`);
    console.log('  원가 측정 결과 (진단 경로 KRW)');
    console.log(`${'═'.repeat(60)}`);
    console.log(`  ${'케이스ID'.padEnd(12)} ${'모델'.padEnd(22)} ${'in'.padEnd(7)} ${'out'.padEnd(7)} KRW`);
    console.log(`  ${'─'.repeat(55)}`);
    for (const r of costRows) {
      console.log(`  ${r.id.padEnd(12)} ${r.model.padEnd(22)} ${String(r.in).padEnd(7)} ${String(r.out).padEnd(7)} ₩${r.krw}`);
    }
    console.log(`${'─'.repeat(60)}`);
    console.log(`  min=₩${min}  median=₩${median}  mean=₩${mean}  p90=₩${p90}  max=₩${max}`);
    console.log(`  judge(haiku) 원가 합계: ₩${judgeTotalKrw}  (QA 내부 원가, 사용자 미부담)`);
    console.log(`  이미지 경로: N/A — no fixture`);
    console.log(`  재료분석: N/A — feature not built`);
    console.log(`${'═'.repeat(60)}\n`);

    const costReport = {
      generated: new Date().toISOString(),
      note: '잠정가 — 토큰 실측 후 가격 확정 예정',
      cases: costRows,
      aggregate: { min, median, mean, p90, max, count: krwList.length },
      judge_total_krw: judgeTotalKrw,
      image_path: 'N/A — no fixture',
      material_analysis: 'N/A — feature not built',
    };
    const reportPath = join(__dir, 'cost-report.json');
    writeFileSync(reportPath, JSON.stringify(costReport, null, 2));
    console.log(`  cost-report.json 저장 완료: ${reportPath}\n`);
  }

  // Machine-readable JSON for piping
  const jsonOut = {
    timestamp: new Date().toISOString(),
    server: `http://${HOST}:${PORT}`,
    summary: {
      total, passed, pass_rate: Math.round(passed/total*100),
      avg_score: avgScore,
      basic: { total: basicResults.length, passed: basicPass, avg: basicAvg },
      hard:  { total: hardResults.length,  passed: hardPass,  avg: hardAvg },
    },
    cases: results,
  };
  process.stdout.write('\n--- JSON_RESULT_START ---\n');
  process.stdout.write(JSON.stringify(jsonOut, null, 2));
  process.stdout.write('\n--- JSON_RESULT_END ---\n');
}

main().catch(e => { console.error('Eval runner 오류:', e); process.exit(1); });

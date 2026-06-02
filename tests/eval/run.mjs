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

import { readFileSync, existsSync } from 'fs';
import { request as httpRequest } from 'http';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '../..');

/* ── config ─────────────────────────────────────────── */
const PORT = (() => {
  const idx = process.argv.indexOf('--port');
  return idx !== -1 ? process.argv[idx + 1] : (process.env.EVAL_PORT || '3000');
})();
const HOST = '127.0.0.1';
const PASS_THRESHOLD = 70;
const INTERVAL_MS = 6000; // rate-limit 회피 간격
const MAX_RETRIES = 3;    // 529 overloaded 재시도

/* ── API key (from env or .env.local) ───────────────── */
function loadApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envFile = join(ROOT, '.env.local');
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf-8').match(/ANTHROPIC_API_KEY=(.+)/);
    if (m) return m[1].trim();
  }
  return null;
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
    metering:        '',
    cushion:         '',
    backPressure:    String(ms.back_pressure ?? ''),
    screwRpm:        String(ms.screw_rpm ?? ''),
    clampForce:      String(ms.clamp_force ?? ''),
  };

  const advSettings = {
    vpTransferPos: '', vpTransferPressure: '',
    preInjectDecompDist: '', preInjectDecompSpeed: '', postMeterDecompDist: '',
    actualFillTime: '', actualPeakPressure: '', actualCushion: '', actualCycleTime: '', actualPartWeight: '',
    dryTemp:  String(ms.drying_temp ?? ''),
    dryTime:  String(ms.drying_time ?? ''),
    dryerType: ms.dryer_type || '없음',
    moistureContent: '',
    hrManifoldTemp: '', hrNozzle1Temp: '', hrNozzle2Temp: '', hrNozzle3Temp: '', hrNozzle4Temp: '', valveGate: '없음',
    regrindRatio: String(c.input.color_info?.regrind_ratio ?? ''),
    colorType: c.input.color_info?.masterbatch_type || '없음',
    mbRatio: String(c.input.color_info?.masterbatch_ratio ?? ''),
    machineModel: '', screwDiameter: '', maxClampForce: '', maxInjPressure: '',
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
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
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
- 정답 phase: ${exp.expected_phase}
- 정답 severity: ${exp.severity}
${hasTrap ? `- 오진 함정(trap): ${exp.trap}` : ''}

## 채점 기준 (총 100점, hard trap 회피 시 +10 bonus)
1. phase 정확 (20점): AI의 defect_phase가 정답 phase와 일치하는가
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
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });
    const txt = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
    const j = JSON.parse(txt.replace(/^```json\s*/i,'').replace(/\s*```$/,''));
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
    console.error('ANTHROPIC_API_KEY 없음 — .env.local 또는 환경변수 필요');
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

  const cases = JSON.parse(readFileSync(join(__dir, 'cases.json'), 'utf-8'));
  const results = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const tag = `[${i+1}/${cases.length}] ${c.id} (${c.difficulty.toUpperCase()})`;
    process.stdout.write(`${tag} ${c.title.slice(0, 40)}... `);

    // 1. Call /api/diagnose (with retry for 529 overloaded)
    let aiRaw = '';
    let diagError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const payload = buildPayload(c);
        const diagRes = await httpPost('/api/diagnose', payload, 120000);
        if (diagRes.status === 529 || (diagRes.status === 500 && diagRes.body.includes('overloaded'))) {
          const wait = attempt * 15000;
          process.stdout.write(` [529 retry ${attempt}/${MAX_RETRIES}, ${wait/1000}s]`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        if (diagRes.status !== 200) {
          diagError = `HTTP ${diagRes.status}: ${diagRes.body.slice(0, 120)}`;
          break;
        }
        aiRaw = diagRes.body;
        diagError = null;
        break;
      } catch (e) {
        diagError = e.message;
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, attempt * 8000));
      }
    }
    if (diagError) {
      console.log(` ✗ (${diagError.slice(0, 60)})`);
      results.push({ id: c.id, title: c.title, difficulty: c.difficulty, score: 0, pass: false, error: diagError, reasoning: '' });
      if (i < cases.length - 1) await new Promise(r => setTimeout(r, INTERVAL_MS));
      continue;
    }

    // 2. Judge
    let judgment;
    try {
      judgment = await judgeCase(c, aiRaw, client);
    } catch (e) {
      judgment = { score: 0, pass: false, reasoning: `Judge 오류: ${e.message}`, phase_ok: false, trap_avoided: null };
    }

    const passStr = judgment.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${passStr} (${judgment.score}점)`);

    results.push({
      id: c.id,
      title: c.title,
      difficulty: c.difficulty,
      score: judgment.score,
      pass: judgment.pass,
      phase_ok: judgment.phase_ok,
      trap_avoided: judgment.trap_avoided,
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

#!/usr/bin/env node
/**
 * smoke-diagnose.mjs
 * POST /api/diagnose 서버사이드 키 동작 확인.
 * X-Api-Key 헤더 없음 — 서버가 process.env.ANTHROPIC_API_KEY를 사용해야 함.
 * Usage: node .claude/scripts/smoke-diagnose.mjs [port=3000]
 */
import { request as httpRequest } from 'http';

const PORT = process.argv[2] || '3000';
const HOST = '127.0.0.1';

const PAYLOAD = JSON.stringify({
  defectType: '은줄(Silver Streak)',
  resinInfo: { resinType: 'PA66' },
  settings: {
    nozzleTemp: '290',
    moldTempFixed: '80',
    holdPressure: '80',
    injSpeed1: '65',
    coolTime: '15',
  },
});

function httpPost(path, body, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
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

function httpGet(path, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: HOST, port: Number(PORT), path, method: 'GET' }, resolve);
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function waitForServer(maxMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      await httpGet('/', 4000);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

async function main() {
  console.log(`[smoke] 서버 대기 중 http://${HOST}:${PORT} ...`);
  const ready = await waitForServer();
  if (!ready) {
    console.error('[smoke] FAIL: 서버가 30초 내 응답하지 않음');
    process.exit(1);
  }

  console.log('[smoke] 서버 준비 완료. POST /api/diagnose 전송 (X-Api-Key 헤더 없음)...');
  let res;
  try {
    res = await httpPost('/api/diagnose', PAYLOAD, 120000);
  } catch (err) {
    console.error('[smoke] FAIL: 요청 오류', err.message);
    process.exit(1);
  }

  console.log(`[smoke] HTTP ${res.status}`);

  let json = null;
  try { json = JSON.parse(res.body); } catch { /* non-json */ }

  if (res.status === 401) {
    const msg = json?.error || res.body;
    if (msg.includes('ANTHROPIC_API_KEY') || msg.includes('미설정')) {
      console.error('[smoke] FAIL: 서버 process.env.ANTHROPIC_API_KEY 미설정 또는 .env.local 미로드');
    } else {
      console.error('[smoke] FAIL: 401', msg);
    }
    process.exit(1);
  }

  if (res.status !== 200) {
    console.error('[smoke] FAIL: 예상외 HTTP 상태', res.status, res.body.slice(0, 300));
    process.exit(1);
  }

  const missing = [];
  if (!json?.defect_type) missing.push('defect_type');
  if (!json?.causes) missing.push('causes');
  if (!json?.recommendations) missing.push('recommendations');

  if (missing.length > 0) {
    console.error('[smoke] FAIL: 응답에 필수 필드 누락:', missing.join(', '));
    console.error('        응답 미리보기:', res.body.slice(0, 400));
    process.exit(1);
  }

  console.log('[smoke] ✅ OK: 키 서버사이드 동작 확인');
  console.log(`  defect_type : ${json.defect_type?.ko} (${json.defect_type?.en})`);
  console.log(`  severity    : ${json.severity}`);
  console.log(`  causes      : ${json.causes?.length}개`);
  console.log(`  recs        : ${json.recommendations?.length}개`);
  if (json.summary) console.log(`  summary     : ${json.summary}`);
}

main().catch(err => { console.error('[smoke] FAIL:', err); process.exit(1); });

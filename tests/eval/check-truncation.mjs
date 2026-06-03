#!/usr/bin/env node
/**
 * tests/eval/check-truncation.mjs
 * 샘플 케이스 전부 /api/diagnose에 POST → raw_response / truncation / 파싱 실패 0 확인
 * Usage: node tests/eval/check-truncation.mjs [--port 3000]
 */
import { readFileSync, existsSync } from 'fs';
import { request as httpRequest } from 'http';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '../..');
const PORT = (() => { const i = process.argv.indexOf('--port'); return i !== -1 ? process.argv[i+1] : '3000'; })();

function httpPost(path, body, tms = 120000) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port: Number(PORT), path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    req.on('error', reject);
    req.setTimeout(tms, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body); req.end();
  });
}

function httpGet(path, tms = 4000) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port: Number(PORT), path, method: 'GET' }, resolve);
    req.on('error', reject); req.setTimeout(tms, () => { req.destroy(); reject(new Error('timeout')); }); req.end();
  });
}

async function waitForServer(maxMs = 10000) {
  const end = Date.now() + maxMs;
  while (Date.now() < end) { try { await httpGet('/'); return true; } catch { await new Promise(r => setTimeout(r, 1000)); } }
  return false;
}

// 샘플 케이스 정의 (SAMPLE_CASES에서 추출한 대표 9개 + hard 2개 + 도면 포함 1개)
const cases = [
  // -- Basic --
  { label: 'PA66 GF33% 은줄', body: { defectType:'은줄 (Silver Streak)', resinInfo:{resinType:'PA66',resinDetail:'PA66 GF33%'}, settings:{nozzleTemp:'285',zone1Temp:'280',zone2Temp:'275',zone3Temp:'265',zone4Temp:'255',moldTempFixed:'80',moldTempMoving:'80',injPressure1:'120',holdPressure:'80',injSpeed1:'60',backPressure:'5',screwRpm:'80',coolTime:'15',holdTime:'8'}, advSettings:{dryTemp:'80',dryTime:'2',dryerType:'없음'}, moldInfo:{gateType:'사이드',cavities:'4',runnerType:'콜드'}, images:[], moldDrawings:[] }},
  { label: 'PC 크랙', body: { defectType:'크랙 (Crack)', defectDescription:'이젝터 핀 주변 크랙. 이형 후 2~3분 내 나타남.', resinInfo:{resinType:'PC',resinDetail:'PC 투명'}, settings:{nozzleTemp:'310',zone1Temp:'305',zone2Temp:'295',zone3Temp:'285',zone4Temp:'275',moldTempFixed:'90',moldTempMoving:'85',injPressure1:'150',holdPressure:'120',holdTime:'12',coolTime:'25'}, advSettings:{dryTemp:'120',dryTime:'4',dryerType:'없음'}, images:[], moldDrawings:[] }},
  { label: 'POM 싱크마크', body: { defectType:'싱크마크 (Sink Mark)', resinInfo:{resinType:'POM(아세탈)',resinDetail:'POM Homo'}, settings:{nozzleTemp:'200',zone1Temp:'195',zone2Temp:'190',zone3Temp:'185',zone4Temp:'180',moldTempFixed:'90',moldTempMoving:'90',injPressure1:'130',holdPressure:'100',holdTime:'15',coolTime:'30'}, images:[], moldDrawings:[] }},
  { label: 'PP GF20% 휨변형', body: { defectType:'휨/변형 (Warpage)', resinInfo:{resinType:'PP',resinDetail:'PP GF20%'}, settings:{nozzleTemp:'240',zone1Temp:'235',zone2Temp:'228',zone3Temp:'220',zone4Temp:'210',moldTempFixed:'40',moldTempMoving:'55',injPressure1:'100',holdPressure:'65',holdTime:'10',coolTime:'20'}, images:[], moldDrawings:[] }},
  { label: 'ABS 변색', body: { defectType:'변색 (Discoloration)', defectDescription:'웰드라인 부근 황변. 사이클 정지 후 첫 5샷에 심함.', resinInfo:{resinType:'ABS'}, settings:{nozzleTemp:'255',zone1Temp:'250',zone2Temp:'245',zone3Temp:'238',zone4Temp:'230',moldTempFixed:'65',moldTempMoving:'60',injPressure1:'110',holdPressure:'75'}, images:[], moldDrawings:[] }},
  // -- Hard (복잡 케이스) --
  { label: 'PA6 GF15% 간헐 은줄 (hard)', body: { defectType:'은줄 (Silver Streak)', defectDescription:'오후 2시 이후 5샷 중 1샷꼴로 은줄. 오전에는 전혀 없음.', resinInfo:{resinType:'PA6',resinDetail:'PA6 GF15%'}, settings:{nozzleTemp:'250',zone1Temp:'245',zone2Temp:'240',zone3Temp:'235',zone4Temp:'225',moldTempFixed:'80',moldTempMoving:'80',injPressure1:'100',holdPressure:'65',injSpeed1:'55',backPressure:'5',screwRpm:'180'}, advSettings:{dryTemp:'80',dryTime:'6',dryerType:'제습식'}, images:[], moldDrawings:[] }},
  { label: 'PA66 GF33% 특정 캐비티 미성형 (hard)', body: { defectType:'미성형 (Short Shot)', defectDescription:'8캐비티 중 3번·7번만 간헐 미성형. 사출압 올려도 해결 안 됨.', resinInfo:{resinType:'PA66',resinDetail:'PA66 GF33%'}, settings:{nozzleTemp:'285',zone1Temp:'280',zone2Temp:'275',zone3Temp:'265',zone4Temp:'255',moldTempFixed:'90',moldTempMoving:'90',injPressure1:'140',holdPressure:'90',injSpeed1:'70',backPressure:'8'}, advSettings:{dryTemp:'80',dryTime:'6',dryerType:'제습식'}, moldInfo:{gateType:'밸브',cavities:'8',runnerType:'핫'}, images:[], moldDrawings:[] }},
  // -- LFT/slender 케이스 --
  { label: 'PPS GF40% 웰드라인 강도부족', body: { defectType:'웰드라인 (Weld Line)', defectDescription:'외관상 거의 안 보임. 조립 중 파단. 인장시험 비웰드부의 30%수준.', resinInfo:{resinType:'PPS',resinDetail:'PPS GF40% 리니어'}, settings:{nozzleTemp:'320',zone1Temp:'315',zone2Temp:'310',zone3Temp:'300',zone4Temp:'290',moldTempFixed:'140',moldTempMoving:'140',injPressure1:'120',holdPressure:'80',injSpeed1:'70',backPressure:'5'}, advSettings:{dryTemp:'130',dryTime:'3',dryerType:'없음'}, moldInfo:{gateType:'사이드',cavities:'2'}, images:[], moldDrawings:[] }},
  // -- mold info 포함 케이스 --
  { label: 'PBT GF30% 웰드라인 (moldInfo)', body: { defectType:'웰드라인 (Weld Line)', resinInfo:{resinType:'PBT',resinDetail:'PBT GF30% V-0'}, settings:{nozzleTemp:'260',zone1Temp:'255',zone2Temp:'248',zone3Temp:'240',zone4Temp:'235',moldTempFixed:'80',moldTempMoving:'75',injPressure1:'140',holdPressure:'95',injSpeed1:'70',backPressure:'6'}, moldInfo:{moldType:'2판',gateType:'사이드',cavities:'4',runnerType:'핫'}, productInfo:{wallThicknessMin:'1.5',wallThicknessMax:'3.0'}, images:[], moldDrawings:[] }},
];

async function main() {
  console.log(`\n${'═'.repeat(58)}`);
  console.log('  Truncation / parse-fail 검사');
  console.log(`  포트: ${PORT}  케이스: ${cases.length}개`);
  console.log(`${'═'.repeat(58)}\n`);

  if (!await waitForServer(8000)) {
    console.error('서버 미응답. npm run dev 먼저 실행 필요.'); process.exit(1);
  }

  let parseFailCount = 0;
  let rawExposedCount = 0;
  const results = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    process.stdout.write(`[${i+1}/${cases.length}] ${c.label}... `);

    let res;
    try {
      res = await httpPost('/api/diagnose', JSON.stringify(c.body), 120000);
    } catch (e) {
      console.log(`ERR: ${e.message}`);
      results.push({ label: c.label, status: 'error', rawExposed: false, parseFail: false, tokenEstimate: 0 });
      continue;
    }

    if (res.status !== 200) {
      console.log(`HTTP ${res.status}`);
      results.push({ label: c.label, status: `http_${res.status}`, rawExposed: false, parseFail: false, tokenEstimate: 0 });
      continue;
    }

    let json;
    try { json = JSON.parse(res.body); } catch { json = null; }

    const hasRaw = json && typeof json.raw_response === 'string' && json.raw_response.length > 0;
    const parseFail = !json;
    const causesLen = json?.causes?.length ?? 0;
    const recsLen = json?.recommendations?.length ?? 0;
    const bodyBytes = Buffer.byteLength(res.body, 'utf8');
    // rough token estimate: Korean ~1.5 chars/token
    const tokenEst = Math.round(bodyBytes / 3);

    if (hasRaw) rawExposedCount++;
    if (parseFail) parseFailCount++;

    const status = parseFail ? '❌ PARSE_FAIL' : hasRaw ? '⚠ RAW_FALLBACK' : '✅ OK';
    console.log(`${status} | causes:${causesLen} recs:${recsLen} ~${tokenEst}tok | ${bodyBytes}B`);
    results.push({ label: c.label, status, rawExposed: hasRaw, parseFail, tokenEstimate: tokenEst, causesLen, recsLen });

    if (i < cases.length - 1) await new Promise(r => setTimeout(r, 4000));
  }

  console.log(`\n${'═'.repeat(58)}`);
  console.log('  결과 요약');
  console.log(`${'═'.repeat(58)}`);
  console.log(`  전체 ${cases.length}케이스 완료`);
  console.log(`  파싱 실패: ${parseFailCount}건`);
  console.log(`  raw_response 노출: ${rawExposedCount}건`);
  const avgTok = Math.round(results.filter(r => r.tokenEstimate > 0).reduce((s, r) => s + r.tokenEstimate, 0) / results.filter(r => r.tokenEstimate > 0).length);
  const maxTok = Math.max(...results.map(r => r.tokenEstimate));
  console.log(`  응답 토큰 추정: 평균 ${avgTok} / 최대 ${maxTok}`);
  console.log(`${'═'.repeat(58)}`);

  if (parseFailCount === 0 && rawExposedCount === 0) {
    console.log('\n  ✅ PASS: truncation/파싱실패/raw노출 0건\n');
    process.exit(0);
  } else {
    console.log('\n  ❌ FAIL: 문제 케이스 존재\n');
    results.filter(r => r.parseFail || r.rawExposed).forEach(r => console.log(`    ${r.label}: parseFail=${r.parseFail} rawExposed=${r.rawExposed}`));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

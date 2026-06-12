#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '../../..');

let pass = 0, fail = 0, warn = 0;

function run(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe' });
    return { ok: true, output: '' };
  } catch (e) {
    const out = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
    return { ok: false, output: out };
  }
}

// Walk directories and return all .ts/.tsx files
function walk(dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, results);
    else if (['.ts', '.tsx'].includes(extname(entry))) results.push(full);
  }
  return results;
}

console.log('=========================================');
console.log('  Mold Doctor 자동 검증 시작');
console.log('=========================================\n');

// [1/5] TypeScript
console.log('[1/5] TypeScript 타입 체크...');
const ts = run('npx tsc --noEmit --pretty false');
if (ts.ok) {
  console.log('  ✅ 타입 에러 없음');
  pass++;
} else {
  console.log('  ❌ 타입 에러 발견');
  ts.output.split('\n').filter(Boolean).slice(0, 20).forEach(l => console.log('    ' + l));
  fail++;
}

// [2/5] Build
console.log('\n[2/5] 빌드 체크...');
const build = run('npm run build');
if (build.ok) {
  console.log('  ✅ 빌드 성공');
  pass++;
} else {
  console.log('  ❌ 빌드 실패');
  build.output.split('\n').filter(Boolean).slice(-20).forEach(l => console.log('    ' + l));
  fail++;
}

// [3/5] console.log 확인 (Node.js fs로 직접 검색)
console.log('\n[3/5] console.log 잔여 확인...');
const srcFiles = [
  ...walk(join(ROOT, 'app')),
  ...walk(join(ROOT, 'components')),
];
const logMatches = [];
for (const f of srcFiles) {
  const lines = readFileSync(f, 'utf-8').split('\n');
  lines.forEach((line, i) => {
    if (/console\.log/.test(line)) logMatches.push(`${f.replace(ROOT, '.')}:${i + 1}: ${line.trim()}`);
  });
}
if (logMatches.length === 0) {
  console.log('  ✅ console.log 없음');
  pass++;
} else {
  console.log(`  ⚠️  console.log ${logMatches.length}개 발견`);
  logMatches.slice(0, 10).forEach(l => console.log('    ' + l));
  warn++;
}

// [4/5] API 키 노출 확인 (Node.js fs로 직접 검색)
// placeholder(sk-ant-api03-...)나 주석은 제외하고 실제 키 패턴만 검출
// 실제 Claude API 키 형식: sk-ant-api03-[Base64 40자 이상]
console.log('\n[4/5] API 키 노출 확인...');
const REAL_KEY_RE = /sk-ant-api[0-9]{2}-[A-Za-z0-9_\-]{20,}/;
const keyMatches = [];
for (const f of srcFiles) {
  const content = readFileSync(f, 'utf-8');
  if (REAL_KEY_RE.test(content)) keyMatches.push(f.replace(ROOT, '.'));
}
if (keyMatches.length === 0) {
  console.log('  ✅ API 키 노출 없음');
  pass++;
} else {
  console.log('  ❌ API 키 코드 내 노출 의심:');
  keyMatches.forEach(f => console.log('    ' + f));
  fail++;
}

// [5/5] 필수 파일 확인
console.log('\n[5/5] 필수 파일 확인...');
const required = [
  'app/api/diagnose/route.ts',
  'app/api/diagnose-chat/route.ts',
  'app/api/extract-settings/route.ts',
  'components/DiagnosisResultPanel.tsx',
];
const missing = required.filter(f => !existsSync(join(ROOT, f)));
if (missing.length === 0) {
  console.log('  ✅ 필수 파일 모두 존재');
  pass++;
} else {
  missing.forEach(f => console.log(`  ❌ 누락: ${f}`));
  fail++;
}

console.log('\n=========================================');
console.log('  검증 결과');
console.log('=========================================');
console.log(`  ✅ 통과: ${pass}개`);
console.log(`  ⚠️  경고: ${warn}개`);
console.log(`  ❌ 실패: ${fail}개`);
console.log('=========================================\n');

if (fail > 0) {
  console.log('❌ 실패 항목이 있습니다. 수정이 필요합니다.');
  process.exit(1);
} else {
  console.log('✅ 검증 완료. 배포 가능 상태입니다.');
}

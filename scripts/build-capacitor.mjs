#!/usr/bin/env node
// Capacitor 전용 정적 export 빌드 — POST-only API route 7개 + middleware.ts는
// `output: 'export'`를 깨므로, 빌드 동안만 .cap-excluded/로 옆으로 치웠다가 무조건 원위치 복원한다.
import { existsSync, renameSync, mkdirSync, rmdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API_BASE_URL_DEFAULT = 'https://mold-doctor-ai.vercel.app';

const apiSrc = join(root, 'app', 'api');
const apiDest = join(root, '.cap-excluded', 'api');
const middlewareSrc = join(root, 'middleware.ts');
const middlewareDest = join(root, '.cap-excluded', 'middleware.ts');

function moveOut() {
  mkdirSync(join(root, '.cap-excluded'), { recursive: true });
  if (existsSync(apiSrc)) renameSync(apiSrc, apiDest);
  if (existsSync(middlewareSrc)) renameSync(middlewareSrc, middlewareDest);
}

function restore() {
  const errors = [];
  if (existsSync(apiDest)) {
    try {
      renameSync(apiDest, apiSrc);
    } catch (e) {
      errors.push(`app/api 복원 실패: ${e.message}`);
    }
  }
  if (existsSync(middlewareDest)) {
    try {
      renameSync(middlewareDest, middlewareSrc);
    } catch (e) {
      errors.push(`middleware.ts 복원 실패: ${e.message}`);
    }
  }
  if (errors.length > 0) {
    console.error('[build:cap] ⚠ 원위치 복원 실패 — 수동 복원 필요:');
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`  수동 복원: mv ${apiDest} ${apiSrc} && mv ${middlewareDest} ${middlewareSrc}`);
    process.exitCode = 1;
    return false;
  }
  try {
    rmdirSync(join(root, '.cap-excluded'));
  } catch {
    // 비어있지 않거나 이미 없으면 무시 (정리는 선택 사항)
  }
  return true;
}

console.log('[build:cap] app/api, middleware.ts 를 .cap-excluded/ 로 이동 (빌드 동안만)...');
moveOut();

let buildFailed = false;
try {
  const result = spawnSync('npx', ['next', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      BUILD_TARGET: 'capacitor',
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_URL_DEFAULT,
    },
  });
  buildFailed = result.status !== 0;
} catch (e) {
  console.error(`[build:cap] 빌드 실행 중 예외: ${e.message}`);
  buildFailed = true;
} finally {
  console.log('[build:cap] app/api, middleware.ts 원위치 복원 중...');
  const restored = restore();
  if (restored) console.log('[build:cap] 원위치 복원 완료.');
}

if (buildFailed) {
  console.error('[build:cap] next build 실패.');
  process.exit(1);
}

const outDir = join(root, 'out');
const outApiDir = join(root, 'out', 'api');
if (!existsSync(outDir)) {
  console.error('[build:cap] out/ 디렉토리가 생성되지 않았습니다.');
  process.exit(1);
}
if (existsSync(outApiDir)) {
  console.error('[build:cap] out/api 가 존재합니다 — export에 API route가 포함됨(예상치 못한 상태).');
  process.exit(1);
}
console.log('[build:cap] 검증 완료: out/ 존재, out/api 부재.');

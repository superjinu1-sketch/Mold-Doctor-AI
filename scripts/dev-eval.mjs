#!/usr/bin/env node
// eval 전용 dev 서버 — prod 키 대신 EVAL 키로 next dev 기동 (billing 격리).
// 비용 대부분인 diagnose(Sonnet)는 dev 서버가 호출하므로, 이 서버가 EVAL 키로 떠야 prod 잔액과 진짜 격리된다.
// prod 진단(/api/*)·일반 `npm run dev`·Vercel 배포는 영향 0 (이 스크립트로 띄울 때만 키 교체).
import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function evalKey() {
  if (process.env.ANTHROPIC_API_KEY_EVAL) return process.env.ANTHROPIC_API_KEY_EVAL;
  const f = join(root, '.env.local');
  if (existsSync(f)) {
    const m = readFileSync(f, 'utf-8').match(/^\s*ANTHROPIC_API_KEY_EVAL\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].trim();
  }
  return null;
}

const key = evalKey();
if (!key) {
  console.error('[dev:eval] ANTHROPIC_API_KEY_EVAL 미설정 — prod 키로 기동을 거부합니다(silent fallback 금지).');
  console.error('           .env.local 에 ANTHROPIC_API_KEY_EVAL=<dev-eval 워크스페이스 키> 추가 후 다시 실행하세요.');
  process.exit(1);
}

console.log('[dev:eval] EVAL 키로 next dev 기동 — prod 진단 잔액과 격리됨. (eval은 순차 실행만, 동시 실행 금지)');
// 자식 프로세스 env에서 ANTHROPIC_API_KEY 를 EVAL 키로 덮어쓴다.
// Next.js는 "이미 설정된 process.env"가 .env.local 보다 우선 → 라우트의 process.env.ANTHROPIC_API_KEY = EVAL 키.
const child = spawn('npx', ['next', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ANTHROPIC_API_KEY: key, ANTHROPIC_API_KEY_EVAL: key },
});
child.on('exit', (code) => process.exit(code ?? 0));

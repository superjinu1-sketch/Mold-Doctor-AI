/**
 * tests/eval/cost.mjs — tokens + model → KRW 환산 유틸
 * 상수는 여기 한 곳에서 관리 — 가격 변경 시 이 파일만 수정.
 */

export const USD_KRW = 1500;

// per 1M tokens, USD
export const PRICE = {
  'claude-sonnet-4-6':         { in: 3,  out: 15 },
  'claude-haiku-4-5-20251001': { in: 1,  out: 5  },
};

// cache: read = in * 0.1, write = in * 1.25 (Anthropic 표준 비율)
function cacheFactor(modelIn, type) {
  return type === 'read' ? modelIn * 0.1 : modelIn * 1.25;
}

/**
 * costKrw({ model, in: inTok, out, cacheRead = 0, cacheWrite = 0 }) → ₩(반올림)
 * vision 토큰은 input_tokens에 이미 포함 → 별도 계산 불필요.
 */
export function costKrw({ model, in: inTok, out, cacheRead = 0, cacheWrite = 0 }) {
  const p = PRICE[model] ?? PRICE['claude-sonnet-4-6'];
  const billableIn  = Math.max(0, inTok - cacheRead - cacheWrite); // 실 청구 입력
  const usd =
    (billableIn  / 1e6) * p.in +
    (cacheRead   / 1e6) * cacheFactor(p.in, 'read') +
    (cacheWrite  / 1e6) * cacheFactor(p.in, 'write') +
    (out         / 1e6) * p.out;
  return Math.round(usd * USD_KRW);
}

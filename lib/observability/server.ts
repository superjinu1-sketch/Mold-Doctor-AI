import * as Sentry from '@sentry/node';
import { scrubEvent } from './scrub';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
let initialized = false;

function ensureInit() {
  if (!dsn || initialized) return;
  initialized = true;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event) as typeof event,
  });
}

// API route top-level catch 전용. console.error는 기존 로그 포맷 그대로 유지하고,
// DSN이 있을 때만 Sentry로도 전송한다(DSN 없으면 console만 — no-op).
export function reportError(scope: string, error: unknown) {
  console.error(`[${scope}] error:`, error);
  if (!dsn) return;
  ensureInit();
  Sentry.captureException(error, { tags: { scope } });
}

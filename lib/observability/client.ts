'use client';

import * as Sentry from '@sentry/react';
import { scrubEvent } from './scrub';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
let initialized = false;

// DSN 미설정 시 완전 no-op — 베타 초기엔 Sentry 프로젝트 없이도 앱이 정상 동작해야 함.
export function initClientObservability() {
  if (!dsn || initialized) return;
  initialized = true;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event) as typeof event,
  });
}

export function reportClientError(scope: string, error: unknown) {
  if (!dsn) return;
  Sentry.captureException(error, { tags: { scope } });
}

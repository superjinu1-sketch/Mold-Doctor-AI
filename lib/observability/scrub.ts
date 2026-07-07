// Sentry 이벤트에서 PII·대용량 페이로드를 제거하는 공용 beforeSend 스크럽.
// 클라(client.ts)·서버(server.ts) 양쪽에서 동일 규칙을 쓰기 위해 분리.

const BASE64_IMAGE_PREFIX = 'data:image';
const LONG_BASE64_RE = /^[A-Za-z0-9+/]{200,}={0,2}$/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const IMAGE_KEY_RE = /photo|image/i;

function scrubString(value: string): string {
  if (value.startsWith(BASE64_IMAGE_PREFIX) || LONG_BASE64_RE.test(value)) {
    return '[scrubbed:image]';
  }
  return value.replace(EMAIL_RE, '[scrubbed:email]');
}

function scrubObject(obj: Record<string, unknown>, depth = 0): void {
  if (depth > 5) return; // 순환/과深 방어
  for (const key of Object.keys(obj)) {
    if (IMAGE_KEY_RE.test(key)) {
      delete obj[key];
      continue;
    }
    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = scrubString(val);
    } else if (val && typeof val === 'object') {
      scrubObject(val as Record<string, unknown>, depth + 1);
    }
  }
}

// Sentry.Event 타입은 SDK(@sentry/react vs @sentry/node)마다 미묘히 달라
// unknown으로 받아 duck-typing — 호출부에서 원래 타입으로 캐스팅해 반환한다.
export function scrubEvent(event: unknown): unknown {
  const e = event as Record<string, unknown>;
  const req = e.request as { data?: unknown } | undefined;
  if (req && 'data' in req) delete req.data;
  if (e.extra) scrubObject(e.extra as Record<string, unknown>);
  if (e.contexts) scrubObject(e.contexts as Record<string, unknown>);
  if (Array.isArray(e.breadcrumbs)) {
    for (const crumb of e.breadcrumbs as Record<string, unknown>[]) {
      if (crumb.data && typeof crumb.data === 'object') {
        scrubObject(crumb.data as Record<string, unknown>);
      }
      if (typeof crumb.message === 'string') crumb.message = scrubString(crumb.message);
    }
  }
  return e;
}

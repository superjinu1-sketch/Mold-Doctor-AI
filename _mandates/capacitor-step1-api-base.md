# Capacitor Step 1 — fetch 절대경로화 + API CORS

## 목적
Capacitor(Android) 앱은 origin이 `https://localhost`(또는 `capacitor://localhost`)라서 상대경로 `/api/*` fetch가 깨진다.
모든 API 호출을 `NEXT_PUBLIC_API_BASE_URL` 기반 절대경로로 바꾸고, Vercel API가 앱 origin의 cross-origin 요청을 받도록 CORS를 연다.

## 절대 원칙 (지킬 것)
- **웹(Vercel) 동작은 절대 바뀌면 안 된다.** 헬퍼는 env가 없으면 빈 문자열을 반환해 기존 상대경로를 그대로 쓴다.
- **`next.config.ts`는 건드리지 마라.** static export(`output: 'export'`)는 다음 step. 지금 넣으면 API route가 깨진다.
- **Vercel/.env.local 에 `NEXT_PUBLIC_API_BASE_URL`을 설정하지 마라.** 이 값은 Capacitor 빌드 때만 주입한다(웹에선 unset 유지).
- 디자인 토큰/거버넌스 규칙 변경 없음. 순수 네트워크 레이어 작업.

## 작업 1 — API base 헬퍼 생성
새 파일 `lib/apiBase.ts`:

```ts
// Capacitor 앱은 origin이 https://localhost 라 상대경로 API가 깨진다.
// 웹(Vercel): env 미설정 → '' → 상대경로 그대로 (동작 변화 0)
// Capacitor 빌드: NEXT_PUBLIC_API_BASE_URL='https://<프로젝트>.vercel.app' → 절대경로
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
```

## 작업 2 — fetch 3곳 절대경로화
아래 3곳의 `fetch('/api/...'`를 `fetch(apiUrl('/api/...')`로 바꾸고, 각 파일 상단에 `import { apiUrl } from '@/lib/apiBase';` 추가.

1. `app/diagnose/page.tsx`
   - L311 근처: `fetch('/api/extract-settings', {` → `fetch(apiUrl('/api/extract-settings'), {`
   - L518 근처: `fetch('/api/diagnose', {` → `fetch(apiUrl('/api/diagnose'), {`
2. `components/DiagnosisResultPanel.tsx`
   - L338 근처: `fetch('/api/diagnose-chat', {` → `fetch(apiUrl('/api/diagnose-chat'), {`

※ `_mandates/` 폴더 안의 옛 mandate 문서에 있는 fetch 문자열은 건드리지 마라(문서일 뿐 코드 아님).

## 작업 3 — CORS 미들웨어 (route 파일 3개는 건드리지 말 것)
프로젝트 루트에 새 파일 `middleware.ts` 생성. route 핸들러를 일일이 고치지 않고 `/api/*`에 중앙에서 CORS 적용 + OPTIONS 프리플라이트 처리.

```ts
import { NextRequest, NextResponse } from 'next/server';

// Capacitor 앱이 띄우는 WebView origin 허용 목록.
// (웹앱은 same-origin이라 CORS 자체가 불필요 — 여기 없어도 동작함)
const ALLOWED_ORIGINS = new Set([
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
]);

function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
  }
  return {};
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  // 프리플라이트
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
```

## 검증 (끝나면 반드시)
1. `npx tsc --noEmit` 통과 (타입 에러 0).
2. `npm run build` 통과.
3. 로컬 `npm run dev`에서 웹으로 진단/OCR/챗 3개 호출이 **기존과 동일하게** 동작(상대경로 유지 확인 — `NEXT_PUBLIC_API_BASE_URL` unset 상태).
4. **push 하지 마라.** 변경 파일 목록만 보고.

## 변경 파일 요약 (예상)
- 신규: `lib/apiBase.ts`, `middleware.ts`
- 수정: `app/diagnose/page.tsx`(2곳), `components/DiagnosisResultPanel.tsx`(1곳)
- 불변: `next.config.ts`, `app/api/**/route.ts`, `.env.local`

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

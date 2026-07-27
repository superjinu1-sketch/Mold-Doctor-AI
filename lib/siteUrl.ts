// 사이트 표시용 절대 URL 단일 소스. canonical·hreflang·sitemap·robots·og:url·JSON-LD 전용.
// ⚠ API 호출 베이스가 아니다 — 그건 lib/apiBase.ts의 NEXT_PUBLIC_API_BASE_URL이며 건드리지 않는다.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://molddoctor.jinsimlabs.com';

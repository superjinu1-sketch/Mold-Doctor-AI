import type { Metadata } from 'next';

// app/auth/callback/page.tsx는 'use client'라 export const metadata를 쓸 수 없다
// (domain-migration-redirect-canonical-v1). OAuth 콜백 전용 경로 — 색인 대상이 아니다.
// 페이지 파일은 쪼개지 않고 라우트 layout.tsx에만 noindex를 둔다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}

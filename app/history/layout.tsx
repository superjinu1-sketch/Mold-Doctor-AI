import type { Metadata } from 'next';

// app/history/page.tsx는 'use client'라 export const metadata를 쓸 수 없다(domain-migration-redirect-canonical-v1).
// /account로 리다이렉트되는 레거시 경로지만 그 전에도 색인 대상이 아니다. 페이지 파일은 쪼개지 않고
// 라우트 layout.tsx에만 noindex를 둔다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}

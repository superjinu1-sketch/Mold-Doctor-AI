import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

// app/pricing/page.tsx는 'use client'라 export const metadata를 쓸 수 없다(domain-migration-redirect-canonical-v1).
// 페이지 파일을 서버/클라이언트로 쪼개지 않고, 라우트 layout.tsx에 canonical만 둔다 — 제목·설명은 아직 없음(추가하지 않음).
export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/pricing` },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

// app/tryout/page.tsx·app/tryout/detail/page.tsx 둘 다 'use client'라 export const metadata를
// 쓸 수 없다(domain-migration-redirect-canonical-v1). 로그인 후 전용 페이지 — 색인 대상이 아니다.
// 페이지 파일은 쪼개지 않고 이 라우트 layout.tsx 하나로 /tryout·/tryout/detail 둘 다 noindex 적용
// (Next.js metadata는 하위 세그먼트로 상속되며, 두 라우트 모두 자체 metadata가 없어 이 값을 그대로 물려받는다).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TryoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

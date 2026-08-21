'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ko } from '@/messages/ko';
import { en } from '@/messages/en';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { isNativeApp } from '@/lib/platform';
import StoreBadges from '@/components/StoreBadges';
import LandingFooter from '@/components/landing/LandingFooter';

// 영문 라우트(/en/*)에서는 페이지 내용이 영문이므로 푸터도 영문이어야 함(실측 확인된 한국어 잔존 수정).
// 기존 locale 토글 상태와 무관하게 URL 경로가 표시 언어를 결정 — 크롤러가 보는 SSR HTML도 항상 정확.
export default function Footer() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { user } = useAuth();
  // 웹 로그아웃 랜딩(homepage-revamp-web-v1)에서만 다단 푸터로 교체 — 다른 모든 페이지는 아래
  // 기존 컴팩트 푸터 그대로(전역 교체는 blast radius가 커서 CC 판단으로 랜딩 한정, mandate §대상파일).
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  // loading을 조건에 넣지 않는다 — HomeClient.tsx·Navbar.tsx의 랜딩 분기와 동일 공식으로 맞춰
  // auth 확인 중 구간에 컴포넌트별로 다른 화면이 뒤섞여 렌더되는 걸 피한다.
  if (pathname === '/' && !user && !native) {
    return <LandingFooter />;
  }
  // 언어 판정 = 경로 OR 토글.
  // 경로(/en/*)는 SSR HTML을 크롤러에게 항상 영문으로 보여주기 위해 유지하고,
  // 토글은 앱 내부 화면(/tools, /tryout 등 en 변형이 없는 경로)에서 en 사용자를 커버한다.
  // (Navbar의 isEnRoute + nt() 패턴과 동일 원칙)
  // /ja/*(ja-notes-axis-v1)는 ja 전용 셸이 아직 없어 영문 셸로 폴백 — 한국어 SSR 잔존 방지가 목적이며
  // 3-way 로케일 토글 신설이 아니다(messages/*·LocaleContext 무변경).
  const isEn = (pathname?.startsWith('/en') ?? false) || (pathname?.startsWith('/ja') ?? false) || locale === 'en';
  const m = isEn ? en : ko;

  return (
    <footer className="border-t border-border bg-canvas py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-6 text-center">
          <Link href="/ledger" className="text-faint text-xs hover:text-muted transition-colors">{m['landing.tool_ledger_title']}</Link>
          <Link href="/tryout" className="text-faint text-xs hover:text-muted transition-colors">{m['landing.tool_tryout_title']}</Link>
          <Link href={isEn ? '/en/resins' : '/resins'} className="text-faint text-xs hover:text-muted transition-colors">{m['landing.tool_resins_title']}</Link>
          <Link href={isEn ? '/en/guide' : '/guide'} className="text-faint text-xs hover:text-muted transition-colors">{m['footer.guide']}</Link>
          <Link href="/en/notes" className="text-faint text-xs hover:text-muted transition-colors">{m['footer.notes']}</Link>
          <Link href="/en/about" className="text-faint text-xs hover:text-muted transition-colors">{m['footer.about']}</Link>
        </nav>
        {/* 스토어 배지(store-badges-v1) — 전 페이지 공통 노출(푸터 자연 확산). 네이티브 앱에서는
            StoreBadges 내부 게이팅으로 DOM 자체가 생성되지 않는다. */}
        <div className="mb-6">
          <StoreBadges variant="footer" />
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center shadow-sm">
              <span className="text-on-brand text-xs font-black">M</span>
            </div>
            <span className="text-sm text-muted">Mold Doctor AI</span>
          </Link>
          <p className="text-faint text-xs">jinsimlabs@jinsimlabs.com</p>
          <nav className="flex items-center gap-4">
            <Link href="/privacy" className="text-faint text-xs hover:text-muted transition-colors">{m['footer.privacy']}</Link>
            <Link href="/terms" className="text-faint text-xs hover:text-muted transition-colors">{m['footer.terms']}</Link>
          </nav>
          <p className="text-faint text-xs">© 2026 Mold Doctor AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

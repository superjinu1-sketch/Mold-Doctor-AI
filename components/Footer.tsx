'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ko } from '@/messages/ko';
import { en } from '@/messages/en';

// 영문 라우트(/en/*)에서는 페이지 내용이 영문이므로 푸터도 영문이어야 함(실측 확인된 한국어 잔존 수정).
// 기존 locale 토글 상태와 무관하게 URL 경로가 표시 언어를 결정 — 크롤러가 보는 SSR HTML도 항상 정확.
export default function Footer() {
  const pathname = usePathname();
  const isEn = pathname?.startsWith('/en') ?? false;
  const m = isEn ? en : ko;

  return (
    <footer className="border-t border-border bg-canvas py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-6 text-center">
          <Link href="/ledger" className="text-faint text-xs hover:text-muted transition-colors">{m['landing.tool_ledger_title']}</Link>
          <Link href="/tryout" className="text-faint text-xs hover:text-muted transition-colors">{m['landing.tool_tryout_title']}</Link>
          <Link href={isEn ? '/en/resins' : '/resins'} className="text-faint text-xs hover:text-muted transition-colors">{m['landing.tool_resins_title']}</Link>
          <Link href={isEn ? '/en/guide' : '/guide'} className="text-faint text-xs hover:text-muted transition-colors">{m['footer.guide']}</Link>
        </nav>
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

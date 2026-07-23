import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-canvas py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-6 text-center">
          <Link href="/ledger" className="text-faint text-xs hover:text-muted transition-colors">작업표준 저장소</Link>
          <Link href="/tryout" className="text-faint text-xs hover:text-muted transition-colors">시사출 체크리스트</Link>
          <Link href="/resins" className="text-faint text-xs hover:text-muted transition-colors">수지 라이브러리</Link>
          <Link href="/guide" className="text-faint text-xs hover:text-muted transition-colors">불량 가이드</Link>
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
            <Link href="/privacy" className="text-faint text-xs hover:text-muted transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="text-faint text-xs hover:text-muted transition-colors">이용약관</Link>
          </nav>
          <p className="text-faint text-xs">© 2026 Mold Doctor AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

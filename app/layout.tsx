import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Mold Doctor AI — 사출 불량 트러블슈팅',
  description: '사출기 셋팅 값과 불량 사진을 입력하면 AI가 원인을 분석하고 해결 조건을 제시합니다.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Mold Doctor AI — 사출 불량 트러블슈팅',
    description: '사출기 셋팅 값과 불량 사진을 입력하면 AI가 원인을 분석하고 해결 조건을 제시합니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Mold Doctor AI',
  },
  twitter: {
    card: 'summary',
    title: 'Mold Doctor AI',
    description: '사출 불량 AI 추정 — 원인 분석 + 셋팅 권장값 즉시 제공',
  },
  verification: {
    google: 'S-q5VyIQgHg2rVbOx2YfMhJdMFV3Ti578xivFZDTZFU',
  },
};

// viewport-fit=cover 없이는 env(safe-area-inset-*)가 iOS에서 값을 갖지 않는다(원인 실측: 기존엔 미설정).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard Variable — Korean-first sans-serif */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
        <meta name="theme-color" content="#F4F5F7" />
        <meta name="application-name" content="Mold Doctor AI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MoldDoc" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen flex flex-col bg-canvas text-ink">
        <LocaleProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

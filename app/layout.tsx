import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HelpWidget from '@/components/HelpWidget';
import UpdateGate from '@/components/UpdateGate';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SITE_URL } from '@/lib/siteUrl';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    google: [
      'S-q5VyIQgHg2rVbOx2YfMhJdMFV3Ti578xivFZDTZFU',
      'FpipNtxXjP6JlF6KNp_LDdD63c6Me8NF-CgUKziAUqs',
    ],
    other: {
      'naver-site-verification': [
        '70ac4bf16560e7a44c05dd3a4805801e5f810ba8',
        '9c02c60806abfe5f4274d9525b8314b9fd7646c9',
      ],
    },
  },
};

// viewport-fit=cover 없이는 env(safe-area-inset-*)가 iOS에서 값을 갖지 않는다(원인 실측: 기존엔 미설정).
// Android 15+ edge-to-edge: Capacitor 코어 SystemBars 플러그인이 이 viewport-fit=cover를 감지해
// 구형 WebView에서는 env() 대신 --safe-area-inset-*(document.documentElement 커스텀 프로퍼티)로 인셋을
// 주입한다. 그래서 앱 전역 env(safe-area-inset-*, var(--safe-area-inset-*, 0px)) 폴백 체인을 사용 —
// iOS/신형 WebView는 env()가 바로 채워지고, 구형 Android WebView는 두 번째 var() 폴백으로 흡수, 웹은 0px.
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
        {/* 정적 생성 시 <html lang="ko">가 /en/*·/ja/* 페이지에도 그대로 박힌다(App Router는 <html>이
            루트 레이아웃 1곳뿐). head 파싱 시점에 즉시 교정 — useEffect는 렌더 후라 늦다.
            file://로 서빙되는 Capacitor 앱은 location.pathname이 다르게 나올 수 있으나 에러 없이
            무해하게 스킵된다(앱은 SEO 대상이 아님). /ja/*는 ja-notes-axis-v1. */}
        {/* eslint-disable-next-line react/no-danger */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(location.pathname.startsWith('/en'))document.documentElement.lang='en';else if(location.pathname.startsWith('/ja'))document.documentElement.lang='ja'`,
          }}
        />
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
            <HelpWidget />
            <UpdateGate />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

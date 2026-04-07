import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
    description: '사출 불량 AI 진단 — 원인 분석 + 셋팅 권장값 즉시 제공',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#1E293B" />
        <meta name="application-name" content="Mold Doctor AI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MoldDoc" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

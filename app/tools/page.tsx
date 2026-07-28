import type { Metadata } from 'next';
import type { ComponentType } from 'react';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteUrl';
import { IconClipboard, IconCheckSquare, IconFlask, IconBook, type IconProps } from '@/components/icons';

export const metadata: Metadata = {
  title: '무료 도구 — 작업표준 저장소·시사출 체크리스트·수지 라이브러리·불량 가이드 | Mold Doctor',
  description: '사출 현장을 위한 무료 도구 모음. 설비별 작업표준 저장, 시사출 샷 로그, 52종 수지 요약, 불량 유형별 가이드까지 전부 무료, 크레딧 소모 없음.',
  alternates: {
    canonical: `${SITE_URL}/tools`,
  },
  openGraph: {
    title: '무료 도구 모음 | Mold Doctor',
    description: '작업표준 저장소·시사출 체크리스트·수지 라이브러리·불량 가이드 — 전부 무료.',
    type: 'website',
    locale: 'ko_KR',
  },
};

const TOOLS: { icon: ComponentType<IconProps>; title: string; desc: string; href: string }[] = [
  {
    icon: IconClipboard,
    title: '작업표준 저장소',
    desc: '설비별 작업표준 저장·현장 부착 PDF',
    href: '/ledger',
  },
  {
    icon: IconCheckSquare,
    title: '시사출 체크리스트',
    desc: '표준 템플릿·샷 로그·리포트 PDF',
    href: '/tryout',
  },
  {
    icon: IconFlask,
    title: '수지 라이브러리',
    desc: '52종 건조·온도·수축률 현장 요약',
    href: '/resins',
  },
  {
    icon: IconBook,
    title: '불량 가이드',
    desc: '불량 유형별 원인·대처',
    href: '/guide',
  },
];

export default function ToolsHubPage() {
  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-2">현장을 위한 무료 도구</h1>
          <p className="text-muted text-body">전부 무료, 크레딧 소모 없음</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {TOOLS.map(tool => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="ui-card ui-card-lg p-5 h-full flex flex-col items-start gap-1.5 hover:border-[var(--brand-border)] transition-colors"
              >
                <Icon size={24} className="text-brand" />
                <span className="font-bold text-ink text-body break-keep">{tool.title}</span>
                <span className="text-muted text-label leading-snug">{tool.desc}</span>
              </Link>
            );
          })}
        </div>

        <div className="ui-card ui-card-lg p-6 text-center">
          <p className="text-ink text-body font-bold mb-4">불량 원인이 궁금하면 — AI 추정</p>
          <Link href="/diagnose" className="ui-cta w-full sm:w-auto sm:px-10">
            무료로 추정 시작
          </Link>
        </div>
      </div>
    </div>
  );
}

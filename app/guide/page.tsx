import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { defects, DEFECT_NUMS, headerColorMap } from '@/lib/defectGuide';
import GuideDeepLinkRedirect from '@/components/guide/GuideDeepLinkRedirect';
import { SITE_URL } from '@/lib/siteUrl';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '사출 불량 가이드 — 18종 원인과 해결 방법 | Mold Doctor',
  description: '미성형·플래시·싱크마크·웰드라인 등 사출성형 불량 18종의 원인과 해결 방법을 정리했습니다.',
  alternates: {
    canonical: `${SITE_URL}/guide`,
    languages: {
      ko: `${SITE_URL}/guide`,
      en: `${SITE_URL}/en/guide`,
      'x-default': `${SITE_URL}/en/guide`,
    },
  },
  openGraph: {
    title: '사출 불량 가이드 | Mold Doctor',
    description: '불량 유형별 원인과 해결 방향을 정리했습니다.',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default function GuidePage() {
  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-10">
      {/* 구 ?d=<id> 딥링크 → /guide/[slug] 리다이렉트(콘텐츠에 영향 없음) */}
      <Suspense fallback={null}>
        <GuideDeepLinkRedirect basePath="/guide" />
      </Suspense>

      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-border)] bg-brand-tint text-brand-ink text-[length:var(--text-label)] font-medium px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-brand rounded-full" />
            18종 불량 유형
          </div>
          <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-2">사출 불량 가이드</h1>
          <p className="text-muted text-body">18가지 주요 불량 유형별 원인과 해결 방향을 확인하세요.</p>
        </div>

        <div className="space-y-2">
          {defects.map(defect => (
            <Link
              key={defect.id}
              href={`/guide/${defect.id}`}
              className="flex items-center justify-between gap-3 p-5 border border-border bg-surface hover:border-[var(--brand-border)] rounded-[var(--radius-card-lg)] transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-full ${headerColorMap[defect.color]} text-on-brand flex items-center justify-center text-sm font-bold shrink-0`}>
                  {DEFECT_NUMS[defect.id]}
                </span>
                <div>
                  <span className="font-bold text-ink text-body">{defect.nameKo}</span>
                  <span className="text-faint ml-2 text-[length:var(--text-label)]">({defect.nameEn})</span>
                </div>
              </div>
              <svg className="w-5 h-5 text-faint shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

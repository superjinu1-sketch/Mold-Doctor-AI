import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { defects, DEFECT_NUMS, headerColorMap } from '@/lib/defectGuide';
import GuideDeepLinkRedirect from '@/components/guide/GuideDeepLinkRedirect';
import { SITE_URL } from '@/lib/siteUrl';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

const TITLE = 'Injection Molding Defect Guide — 12 Types, Causes & Fixes | Mold Doctor';
const DESCRIPTION = 'Short shot, flash, sink marks, weld lines, and more — causes and fixes for the 12 most common injection molding defects.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/en/guide`,
    languages: {
      ko: `${SITE_URL}/guide`,
      en: `${SITE_URL}/en/guide`,
      'x-default': `${SITE_URL}/en/guide`,
    },
  },
  openGraph: {
    title: 'Injection Molding Defect Guide | Mold Doctor',
    description: 'Causes and solutions for 18 major injection molding defect types.',
    type: 'website',
    locale: 'en_US',
  },
  // 루트 레이아웃의 twitter 메타는 한국어 고정값 — 영문 페이지에서는 페이지별 영문 title/description으로 덮어쓴다.
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function GuidePageEn() {
  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-10">
      {/* 구 ?d=<id> 딥링크 → /en/guide/[slug] 리다이렉트(/guide와 대칭, 콘텐츠에 영향 없음) */}
      <Suspense fallback={null}>
        <GuideDeepLinkRedirect basePath="/en/guide" />
      </Suspense>

      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-border)] bg-brand-tint text-brand-ink text-[length:var(--text-label)] font-medium px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-brand rounded-full" />
            12 Defect Types
          </div>
          <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-2">Injection Molding Defect Guide</h1>
          <p className="text-muted text-body">Causes and solutions for 18 major injection molding defect types.</p>
        </div>

        <div className="space-y-2">
          {defects.map(defect => (
            <Link
              key={defect.id}
              href={`/en/guide/${defect.id}`}
              className="flex items-center justify-between gap-3 p-5 border border-border bg-surface hover:border-[var(--brand-border)] rounded-[var(--radius-card-lg)] transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-full ${headerColorMap[defect.color]} text-on-brand flex items-center justify-center text-sm font-bold shrink-0`}>
                  {DEFECT_NUMS[defect.id]}
                </span>
                <span className="font-bold text-ink text-body">{defect.nameEn}</span>
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

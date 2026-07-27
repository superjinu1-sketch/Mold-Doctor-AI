import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { defects, getGuideDefectById } from '@/lib/defectGuide';
import { buildGuideTitle, buildGuideDescription, buildGuideJsonLd, getRelatedResinsForGuide } from '@/lib/guideDisplay';
import GuideDetailView from '@/components/guide/GuideDetailView';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

export function generateStaticParams() {
  return defects.map(d => ({ slug: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const defect = getGuideDefectById(slug);
  if (!defect) return {};
  const title = buildGuideTitle(defect, 'en');
  const description = buildGuideDescription(defect, 'en');
  const url = `https://mold-doctor-ai.vercel.app/en/guide/${slug}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ko: `https://mold-doctor-ai.vercel.app/guide/${slug}`,
        en: url,
        'x-default': url,
      },
    },
    openGraph: { title, description, type: 'article', locale: 'en_US', url },
    // 루트 레이아웃의 twitter 메타는 한국어 고정값 — 영문 페이지에서는 페이지별 영문 title/description으로 덮어쓴다.
    twitter: { card: 'summary', title, description },
  };
}

export default async function GuideDetailPageEn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const defect = getGuideDefectById(slug);
  if (!defect) notFound();
  const url = `https://mold-doctor-ai.vercel.app/en/guide/${slug}`;
  const jsonLd = buildGuideJsonLd(defect, 'en', url);
  const related = getRelatedResinsForGuide(slug);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GuideDetailView defect={defect} locale="en" basePath="/en/guide" resinsBasePath="/en/resins" related={related} />
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { defects, getGuideDefectById } from '@/lib/defectGuide';
import { buildGuideTitle, buildGuideDescription, buildGuideJsonLd, getRelatedResinsForGuide } from '@/lib/guideDisplay';
import GuideDetailView from '@/components/guide/GuideDetailView';
import { SITE_URL } from '@/lib/siteUrl';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

export function generateStaticParams() {
  return defects.map(d => ({ slug: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const defect = getGuideDefectById(slug);
  if (!defect) return {};
  const title = buildGuideTitle(defect, 'ko');
  const description = buildGuideDescription(defect, 'ko');
  const url = `${SITE_URL}/guide/${slug}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ko: url,
        en: `${SITE_URL}/en/guide/${slug}`,
        'x-default': `${SITE_URL}/en/guide/${slug}`,
      },
    },
    openGraph: { title, description, type: 'article', locale: 'ko_KR', url },
  };
}

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const defect = getGuideDefectById(slug);
  if (!defect) notFound();
  const url = `${SITE_URL}/guide/${slug}`;
  const jsonLd = buildGuideJsonLd(defect, 'ko', url);
  const related = getRelatedResinsForGuide(slug);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GuideDetailView defect={defect} locale="ko" basePath="/guide" resinsBasePath="/resins" related={related} />
    </>
  );
}

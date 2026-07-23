import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RESIN_KB } from '@/lib/resin-kb';
import { getAllResinSlugs, getResinKeyBySlug } from '@/lib/resinSlug';
import { getResinDisplayName, buildTitle, buildDescription, buildJsonLd } from '@/lib/resinDisplay';
import { getRelatedResinKeys } from '@/lib/resinPageData';
import ResinDetailView from '@/components/resins/ResinDetailView';

export function generateStaticParams() {
  return getAllResinSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const key = getResinKeyBySlug(slug);
  if (!key) return {};
  const spec = RESIN_KB[key];
  const displayName = getResinDisplayName(key, 'ko');
  const title = buildTitle(displayName, 'ko');
  const description = buildDescription(spec, displayName, 'ko');
  const url = `https://mold-doctor-ai.vercel.app/resins/${slug}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ko: url,
        en: `https://mold-doctor-ai.vercel.app/en/resins/${slug}`,
        'x-default': `https://mold-doctor-ai.vercel.app/en/resins/${slug}`,
      },
    },
    openGraph: { title, description, type: 'article', locale: 'ko_KR', url },
  };
}

export default async function ResinDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = getResinKeyBySlug(slug);
  if (!key) notFound();
  const spec = RESIN_KB[key];
  const displayName = getResinDisplayName(key, 'ko');
  const url = `https://mold-doctor-ai.vercel.app/resins/${slug}`;
  const jsonLd = buildJsonLd(spec, displayName, 'ko', url);
  const related = getRelatedResinKeys(key);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ResinDetailView resinKey={key} spec={spec} locale="ko" basePath="/resins" related={related} />
    </>
  );
}

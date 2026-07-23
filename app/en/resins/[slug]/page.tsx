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
  const displayName = getResinDisplayName(key, 'en');
  const title = buildTitle(displayName, 'en');
  const description = buildDescription(spec, displayName, 'en');
  const url = `https://mold-doctor-ai.vercel.app/en/resins/${slug}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ko: `https://mold-doctor-ai.vercel.app/resins/${slug}`,
        en: url,
        'x-default': url,
      },
    },
    openGraph: { title, description, type: 'article', locale: 'en_US', url },
  };
}

export default async function ResinDetailPageEn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = getResinKeyBySlug(slug);
  if (!key) notFound();
  const spec = RESIN_KB[key];
  const displayName = getResinDisplayName(key, 'en');
  const url = `https://mold-doctor-ai.vercel.app/en/resins/${slug}`;
  const jsonLd = buildJsonLd(spec, displayName, 'en', url);
  const related = getRelatedResinKeys(key);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ResinDetailView resinKey={key} spec={spec} locale="en" basePath="/en/resins" related={related} />
    </>
  );
}

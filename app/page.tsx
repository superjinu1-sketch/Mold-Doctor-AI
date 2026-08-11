import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteUrl';
import HomeClient from '@/components/HomeClient';
import { getLatestNotes, type HomeNoteCard } from '@/lib/notes';
import { readNoteThumbSvg } from '@/lib/notesDiagramSvg';

// Capacitor 정적 export(output:'export') 호환 — app/guide/page.tsx 선례와 동일.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  alternates: {
    canonical: `${SITE_URL}/`,
  },
};

const HOME_NOTES_COUNT = 4; // 홈에 노출할 최신 글 수 (조절 지점)

const homeNotes: HomeNoteCard[] = getLatestNotes(HOME_NOTES_COUNT).map(n => ({
  slug: n.slug,
  title: n.title,
  description: n.description,
  publishedAt: n.publishedAt,
  thumbSvg: n.thumb ? readNoteThumbSvg(n.thumb) : null,
}));

export default function HomePage() {
  return <HomeClient latestNotes={homeNotes} />;
}

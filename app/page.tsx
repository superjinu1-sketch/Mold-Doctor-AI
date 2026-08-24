import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteUrl';
import HomeClient from '@/components/HomeClient';
import { NOTES, type HomeNoteCard } from '@/lib/notes';
import { getNoteKoBySlug } from '@/lib/notesKo';
import { readNoteThumbSvg } from '@/lib/notesDiagramSvg';

// Capacitor 정적 export(output:'export') 호환 — app/guide/page.tsx 선례와 동일.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  alternates: {
    canonical: `${SITE_URL}/`,
  },
};

// 홈 Notes 섹션은 클라이언트에서 4건씩 페이지네이션(home-notes-pagination-v1).
// 정적 앱이라 페이지 전환에 서버 왕복이 없어 전체 노트를 미리 넘긴다.
const homeNotes: HomeNoteCard[] = NOTES.map(n => {
  const ko = getNoteKoBySlug(n.slug);
  return {
    slug: n.slug,
    title: n.title,
    description: n.description,
    titleKo: ko?.title ?? null,
    descriptionKo: ko?.description ?? null,
    publishedAt: n.publishedAt,
    thumbSvg: n.thumb ? readNoteThumbSvg(n.thumb) : null,
    thumbSvgKo: n.thumb ? readNoteThumbSvg(n.thumb, 'ko') : null,
    thumbImage: n.thumbImage ?? null,
  };
});

export default function HomePage() {
  return <HomeClient notes={homeNotes} />;
}

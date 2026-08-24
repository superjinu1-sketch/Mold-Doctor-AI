import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteUrl';
import { NOTES, type NoteBlock } from '@/lib/notes';
import { getNoteKoBySlug } from '@/lib/notesKo';
import { readNoteThumbSvg } from '@/lib/notesDiagramSvg';
import { SearchableNotesList, type NoteSearchItem } from '@/components/notes/SearchableNotesList';
import { ko } from '@/messages/ko';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

const TITLE = '현장 노트 — Mold Doctor';
const DESCRIPTION = '사출성형 AI를 만들며 기록한 현장 노트. 무엇이 틀렸고, 왜 틀렸는지.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/notes`,
    languages: {
      ko: `${SITE_URL}/notes`,
      en: `${SITE_URL}/en/notes`,
      ja: `${SITE_URL}/ja/notes`,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function NotesIndexPageKo() {
  // NOTES(EN, 전체·정본 순서)를 돈다 — KO 있으면 KO로 표시, 없으면 EN + "번역 준비 중" 뱃지.
  const items: NoteSearchItem[] = NOTES.map(enNote => {
    const koNote = getNoteKoBySlug(enNote.slug);
    const display = koNote ?? enNote;
    return {
      slug: enNote.slug,
      search: [display.title, display.description, ...display.body.filter((b): b is NoteBlock & { type: 'h2' } => b.type === 'h2').map(b => b.text)]
        .join(' ').normalize('NFC').toLowerCase(),
      card: (
        <article key={enNote.slug} className="ui-card ui-card-lg p-5">
          <div className="flex flex-col sm:flex-row sm:gap-5">
            {display.thumbImage ? (
              <img src={display.thumbImage} alt="" aria-hidden="true" loading="lazy"
                className="mb-4 sm:mb-0 shrink-0 self-start w-[180px] max-w-full h-auto rounded-lg border border-[color:var(--border)]" />
            ) : display.thumb && (
              <div
                aria-hidden="true"
                className="mb-4 sm:mb-0 shrink-0 self-start w-[180px] max-w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-sunken,transparent)] p-2 [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: readNoteThumbSvg(display.thumb, 'ko') }}
              />
            )}
            <div className="min-w-0">
              <Link href={`/notes/${enNote.slug}`} className="font-bold text-ink text-body hover:text-brand-ink transition-colors">
                {display.title}
              </Link>
              {!koNote && (
                <span className="ml-2 inline-block align-middle text-[length:var(--text-label)] text-faint border border-[color:var(--border)] rounded px-1.5 py-0.5">
                  {ko['field_notes.ko_pending']}
                </span>
              )}
              <p className="text-muted text-body leading-relaxed mt-2">{display.description}</p>
              <p className="text-faint text-[length:var(--text-label)] mt-3">{formatDate(display.publishedAt)}</p>
            </div>
          </div>
        </article>
      ),
    };
  });

  return (
    <div className="max-w-[65ch] mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-8">현장 노트</h1>
      <SearchableNotesList
        items={items}
        placeholder={ko['field_notes.search_placeholder']}
        emptyText={ko['field_notes.search_empty']}
        countLabel={ko['field_notes.search_count']}
      />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteUrl';
import { NOTES } from '@/lib/notes';
import { readNoteThumbSvg } from '@/lib/notesDiagramSvg';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

const TITLE = 'Field Notes — Mold Doctor';
const DESCRIPTION = 'Notes from building an injection molding AI. What it got wrong, and why.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/en/notes`,
    languages: {
      en: `${SITE_URL}/en/notes`,
      ja: `${SITE_URL}/ja/notes`,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'en_US',
  },
  // 루트 레이아웃의 twitter 메타는 한국어 고정값 — 영문 페이지에서는 페이지별 영문 title/description으로 덮어쓴다.
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function NotesIndexPageEn() {
  return (
    <div className="max-w-[65ch] mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-8">Field Notes</h1>
      <div className="space-y-6">
        {NOTES.map(note => (
          <article key={note.slug} className="ui-card ui-card-lg p-5">
            <div className="flex flex-col sm:flex-row sm:gap-5">
              {note.thumb && (
                <div
                  aria-hidden="true"
                  className="mb-4 sm:mb-0 shrink-0 self-start w-[180px] max-w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-sunken,transparent)] p-2 [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: readNoteThumbSvg(note.thumb) }}
                />
              )}
              <div className="min-w-0">
                <Link href={`/en/notes/${note.slug}`} className="font-bold text-ink text-body hover:text-brand-ink transition-colors">
                  {note.title}
                </Link>
                <p className="text-muted text-body leading-relaxed mt-2">{note.description}</p>
                <p className="text-faint text-[length:var(--text-label)] mt-3">{formatDate(note.publishedAt)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

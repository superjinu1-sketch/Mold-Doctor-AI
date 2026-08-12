import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteUrl';
import { NOTES_JA, JA_DISCLAIMER_TITLE, JA_DISCLAIMER_BODY } from '@/lib/notesJa';
import { readNoteThumbSvg } from '@/lib/notesDiagramSvg';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

const TITLE = '技術ノート — Mold Doctor';
const DESCRIPTION = '射出成形AIを作りながら書いた技術ノート。誤りと、その修正の記録。';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/ja/notes`,
    languages: {
      en: `${SITE_URL}/en/notes`,
      ja: `${SITE_URL}/ja/notes`,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'ja_JP',
  },
  // 루트 레이아웃의 twitter 메타는 한국어 고정값 — ja 페이지에서는 페이지별 ja title/description으로 덮어쓴다.
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function NotesIndexPageJa() {
  return (
    <div className="max-w-[65ch] mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-4">技術ノート</h1>

      {/* 디스클레이머 — 오역 한계 안내, 목록 상시 노출(ja-notes-axis-v1) */}
      <div className="ui-card bg-surface-sunken p-4 mb-6">
        <p className="font-bold text-label text-ink mb-1">{JA_DISCLAIMER_TITLE}</p>
        <p className="text-muted text-label leading-relaxed">{JA_DISCLAIMER_BODY}</p>
        <Link href="/en/notes" className="inline-block text-brand hover:text-brand-ink text-label font-medium mt-2 min-h-[44px] items-center">
          English version →
        </Link>
      </div>

      <div className="space-y-6">
        {NOTES_JA.map(note => (
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
                <Link href={`/ja/notes/${note.slug}`} className="font-bold text-ink text-body hover:text-brand-ink transition-colors">
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

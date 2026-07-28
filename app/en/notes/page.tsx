import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteUrl';
import { NOTES } from '@/lib/notes';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

const TITLE = 'Notes — Mold Doctor';
const DESCRIPTION = 'Notes from building an injection molding AI. What it got wrong, and why.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/en/notes`,
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
      <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-8">Notes</h1>
      <div className="space-y-6">
        {NOTES.map(note => (
          <article key={note.slug} className="ui-card ui-card-lg p-5">
            <Link href={`/en/notes/${note.slug}`} className="font-bold text-ink text-body hover:text-brand-ink transition-colors">
              {note.title}
            </Link>
            <p className="text-muted text-body leading-relaxed mt-2">{note.description}</p>
            <p className="text-faint text-[length:var(--text-label)] mt-3">{formatDate(note.publishedAt)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

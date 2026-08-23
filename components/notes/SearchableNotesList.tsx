'use client';
import { Fragment, useState, type ReactNode } from 'react';

export type NoteSearchItem = { slug: string; search: string; card: ReactNode };

export function SearchableNotesList({
  items, placeholder, emptyText, countLabel,
}: { items: NoteSearchItem[]; placeholder: string; emptyText: string; countLabel: string }) {
  const [q, setQ] = useState('');
  const nq = q.trim().normalize('NFC').toLowerCase();
  const shown = nq ? items.filter(i => i.search.includes(nq)) : items;
  return (
    <>
      <div className="mb-6">
        <input
          type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder={placeholder} aria-label={placeholder}
          className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-body text-ink placeholder:text-faint focus:outline-none focus:border-brand min-h-[44px]"
        />
        {nq && <p className="text-faint text-[length:var(--text-label)] mt-2">{countLabel.replace('%d', String(shown.length))}</p>}
      </div>
      <div className="space-y-6">
        {shown.map(i => <Fragment key={i.slug}>{i.card}</Fragment>)}
      </div>
      {shown.length === 0 && <p className="text-muted text-body py-8 text-center">{emptyText}</p>}
    </>
  );
}

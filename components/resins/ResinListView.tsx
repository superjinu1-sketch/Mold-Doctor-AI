'use client';

// /resins(ko)·/en/resins(en) 목록 — 서버 페이지가 전체 카드를 props로 넘겨 초기 HTML에 SSG로
// 포함시킨다(크롤러가 JS 없이도 전 카드 인덱싱). 검색·계열 필터만 클라이언트 상태로 동작.
import { useState } from 'react';
import Link from 'next/link';
import type { Tier, Hygro } from '@/lib/resin-kb';
import { TIER_LABEL, HYGRO_LABEL, type Locale } from '@/lib/resinDisplay';

export interface ResinListItem {
  key: string;
  slug: string;
  displayName: string;
  tier: Tier;
  hygro: Hygro;
  crystalline: boolean;
}

const TIERS: Tier[] = ['commodity', 'engineering', 'super-engineering', 'blend', 'elastomer'];

export default function ResinListView({ items, locale, basePath }: { items: ResinListItem[]; locale: Locale; basePath: string }) {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<Tier | 'all'>('all');

  const q = query.trim().toLowerCase();
  const filtered = items.filter(it =>
    (tier === 'all' || it.tier === tier) &&
    (q === '' || it.displayName.toLowerCase().includes(q) || it.key.toLowerCase().includes(q))
  );

  const L = (ko: string, en: string) => (locale === 'en' ? en : ko);

  return (
    <div>
      <div className="mb-5 space-y-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={L('수지명 검색 (예: PA66, 나일론)', 'Search resin (e.g. PA66, Nylon)')}
          className="ui-input w-full"
          aria-label={L('수지 검색', 'Search resins')}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTier('all')}
            className={`min-h-[44px] px-3.5 rounded-full text-[length:var(--text-label)] font-bold transition-colors ${tier === 'all' ? 'bg-brand text-on-brand' : 'bg-surface-sunken text-muted hover:text-ink'}`}
          >
            {L('전체', 'All')}
          </button>
          {TIERS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={`min-h-[44px] px-3.5 rounded-full text-[length:var(--text-label)] font-bold transition-colors ${tier === t ? 'bg-brand text-on-brand' : 'bg-surface-sunken text-muted hover:text-ink'}`}
            >
              {TIER_LABEL[t][locale]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted text-body py-8 text-center">{L('검색 결과가 없어요.', 'No results.')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(it => (
            <Link
              key={it.key}
              href={`${basePath}/${it.slug}`}
              className="ui-card ui-card-lg p-4 hover:border-[var(--brand-border)] hover:bg-brand-tint/40 transition-colors block"
            >
              <div className="font-bold text-ink text-body mb-2">{it.displayName}</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[length:var(--text-label)] font-medium px-2 py-0.5 rounded-full bg-brand-tint text-brand-ink">
                  {TIER_LABEL[it.tier][locale]}
                </span>
                <span className="text-[length:var(--text-label)] font-medium px-2 py-0.5 rounded-full bg-surface-sunken text-muted">
                  {it.crystalline ? L('결정성', 'Crystalline') : L('비정질', 'Amorphous')}
                </span>
                <span className="text-[length:var(--text-label)] font-medium px-2 py-0.5 rounded-full bg-surface-sunken text-muted">
                  {L('흡습', 'Hygro.')} {HYGRO_LABEL[it.hygro][locale]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

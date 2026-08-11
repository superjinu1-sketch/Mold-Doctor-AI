'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { IconClipboard, IconCheckSquare, IconFlask } from '@/components/icons';
import type { HomeNoteCard } from '@/lib/notes';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | 'ellipsis')[] = [1];
  if (current > 3) out.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) out.push(p);
  if (current < total - 2) out.push('ellipsis');
  out.push(total);
  return out;
}

const PAGE_SIZE = 4;

export default function HomeClient({ notes }: { notes: HomeNoteCard[] }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [page, setPage] = useState(1); // 1-indexed
  const notesSectionRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE));
  const pageNotes = notes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goToPage(next: number) {
    setPage(next);
    notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const name = (typeof meta.name === 'string' && meta.name)
    || (typeof meta.full_name === 'string' && meta.full_name)
    || user?.email?.split('@')[0]
    || '';

  const steps = [
    { t: t('landing.step1_t'), d: t('landing.step1_d') },
    { t: t('landing.step2_t'), d: t('landing.step2_d') },
    { t: t('landing.step3_t'), d: t('landing.step3_d') },
  ];

  return (
    <div className="bg-canvas min-h-screen">
      {/* Hero — 브랜드 블루 풀블리드 */}
      <section className="bg-brand text-on-brand px-5 pt-12 pb-14">
        <div className="max-w-md mx-auto">
          <p className="text-label font-semibold text-on-brand/80 mb-3">
            {user ? t('landing.hero_eyebrow_user').replace('{name}', String(name)) : t('landing.hero_eyebrow')}
          </p>
          <h1 className="font-bold leading-[1.12] mb-4" style={{ fontSize: 'clamp(2rem, 8vw, var(--text-display))' }}>
            {t('landing.hero_h1')}
          </h1>
          <p className="text-on-brand/85 text-body leading-relaxed mb-8">{t('landing.hero_sub')}</p>

          <div className="flex flex-col gap-3">
            {user ? (
              <>
                <Link href="/diagnose" className="ui-cta w-full bg-surface text-brand hover:bg-surface-sunken text-body">{t('landing.cta_primary_user')}</Link>
                <Link href="/account" className="ui-cta w-full bg-transparent border-2 border-[var(--on-brand)] text-on-brand hover:bg-brand-ink text-body">{t('landing.cta_account')}</Link>
                {/* 무료 도구 퀵액세스 — 마이페이지와 동급 아웃라인, 주 CTA보다 튀지 않게 */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/ledger"
                    className="min-h-[var(--touch-cta)] flex items-center justify-center gap-1.5 border-2 border-[var(--on-brand)] text-on-brand hover:bg-brand-ink rounded-full text-sm font-bold px-2 text-center transition-colors"
                  >
                    <IconClipboard className="shrink-0" /> {t('landing.tool_ledger_title')}
                  </Link>
                  <Link
                    href="/tryout"
                    className="min-h-[var(--touch-cta)] flex items-center justify-center gap-1.5 border-2 border-[var(--on-brand)] text-on-brand hover:bg-brand-ink rounded-full text-sm font-bold px-2 text-center transition-colors"
                  >
                    <IconCheckSquare className="shrink-0" /> {t('landing.tool_tryout_title')}
                  </Link>
                </div>
                <Link href="/tools" className="text-on-brand/80 hover:text-on-brand text-label text-center underline underline-offset-2 min-h-[44px] flex items-center justify-center">{t('landing.tools_all_link')}</Link>
              </>
            ) : (
              <>
                <Link href="/diagnose" className="ui-cta w-full bg-surface text-brand hover:bg-surface-sunken text-body">{t('landing.cta_primary_loggedout')}</Link>
                <Link href={locale === 'en' ? '/en/guide' : '/guide'} className="ui-cta w-full bg-transparent border-2 border-[var(--on-brand)] text-on-brand hover:bg-brand-ink text-body">{t('landing.cta_secondary')}</Link>
              </>
            )}
          </div>

          {!user && <p className="text-on-brand/70 text-label mt-4 text-center">{t('landing.hero_trust')}</p>}
        </div>
      </section>

      {/* 하단 흰 영역 — 이렇게 추정해요 + 커버리지 한 줄 */}
      <section className="px-5 py-12">
        <div className="max-w-md mx-auto">
          <h2 className="text-h3 font-bold text-ink mb-6">{t('landing.how_title')}</h2>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="ui-card flex gap-3 items-start">
                <span className="shrink-0 w-7 h-7 rounded-full bg-brand-tint text-brand-ink font-bold text-label flex items-center justify-center tabular-nums">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-ink text-body">{s.t}</h3>
                  <p className="text-muted text-label mt-0.5 leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-center text-muted text-label mt-6">{t('landing.coverage')}</p>

          {/* 무료 도구 — 작업표준 저장소 + 시사출 체크리스트 + 수지 라이브러리 */}
          <h2 className="text-h3 font-bold text-ink mt-10 mb-4">{t('landing.free_tools_title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/ledger" className="ui-card p-4 h-full flex flex-col items-start gap-1 hover:border-[var(--brand-border)] transition-colors">
              <IconClipboard size={24} className="text-brand" />
              <span className="font-bold text-ink text-body break-keep">{t('landing.tool_ledger_title')}</span>
              <span className="text-muted text-label leading-snug">{t('landing.tool_ledger_desc')}</span>
            </Link>
            <Link href="/tryout" className="ui-card p-4 h-full flex flex-col items-start gap-1 hover:border-[var(--brand-border)] transition-colors">
              <IconCheckSquare size={24} className="text-brand" />
              <span className="font-bold text-ink text-body break-keep">{t('landing.tool_tryout_title')}</span>
              <span className="text-muted text-label leading-snug">{t('landing.tool_tryout_desc')}</span>
            </Link>
            <Link href={locale === 'en' ? '/en/resins' : '/resins'} className="ui-card p-4 h-full flex flex-col items-start gap-1 hover:border-[var(--brand-border)] transition-colors">
              <IconFlask size={24} className="text-brand" />
              <span className="font-bold text-ink text-body break-keep">{t('landing.tool_resins_title')}</span>
              <span className="text-muted text-label leading-snug">{t('landing.tool_resins_desc')}</span>
            </Link>
          </div>
          <Link href="/tools" className="text-brand hover:text-brand-ink text-label font-medium mt-4 min-h-[44px] flex items-center justify-center">{t('landing.tools_all_link')}</Link>
        </div>

        {/* 기술 노트 — 크롤러가 홈에서 도달 가능한 링크 확보(internal-links-to-notes-v1).
            조건부 렌더 금지 대상이라 항상 렌더. 무료 도구 카드보다 시각적 위계를 낮게.
            컴팩트 스택 리스트(home-notes-redesign-v1) — 현재 페이지 4건, 전체 최신 1건에만 NEW 배지.
            행 안에 고정폭 썸네일이 들어가 max-w-md보다 넓은 컨테이너가 필요해 별도 wrapper로 분리.
            인플레이스 페이지네이션(home-notes-pagination-v1) — 서버가 전체 노트를 넘기고 클라이언트가
            PAGE_SIZE(4)씩 자른다. 정적 앱이라 페이지 전환에 서버 왕복 없음(URL 파라미터 없음).
            스케일 주의: 노트 전체의 인라인 썸네일 SVG가 홈 HTML에 직렬화된다 — 현재 5건은 무해(≈7KB).
            노트가 ~25건을 넘기면 홈 payload가 무거워지니 그때는 정적 서버 페이지네이션(/en/notes/page/N)
            전환을 검토한다. */}
        <div className="max-w-2xl mx-auto" ref={notesSectionRef}>
          <h2 className="text-h3 font-bold text-ink mt-10 mb-2">{t('landing.notes_title')}</h2>
          <p className="text-muted text-label mb-4">{t('landing.notes_sub')}</p>
          <div className="flex flex-col gap-2.5 mb-3">
            {pageNotes.map((n, i) => (
              <Link key={n.slug} href={`/en/notes/${n.slug}`} className="ui-card p-3.5 flex gap-3.5 items-start hover:border-[var(--brand-border)] transition-colors">
                {n.thumbSvg && (
                  <div
                    aria-hidden="true"
                    className="w-[104px] shrink-0 border border-[color:var(--border)] rounded-lg p-1 [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
                    dangerouslySetInnerHTML={{ __html: n.thumbSvg }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-ink text-[15.5px] leading-snug">{n.title}</span>
                    {page === 1 && i === 0 && (
                      <span className="text-[10px] font-extrabold text-white bg-brand rounded-full px-2 py-0.5 shrink-0">NEW</span>
                    )}
                  </div>
                  <p className="text-muted text-[13px] leading-relaxed mt-1 line-clamp-2">{n.description}</p>
                  <p className="text-faint text-[11px] mt-1.5">{formatDate(n.publishedAt)}</p>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Notes pagination" className="flex items-center justify-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="min-w-[36px] min-h-[36px] px-2 rounded-lg text-muted disabled:opacity-40 hover:bg-[color:var(--surface-sunken,#f4f5f7)] transition-colors"
              >‹</button>

              {pageWindow(page, totalPages).map((it, idx) =>
                it === 'ellipsis'
                  ? <span key={`e${idx}`} className="px-1 text-faint select-none">…</span>
                  : <button
                      key={it}
                      type="button"
                      onClick={() => goToPage(it)}
                      aria-current={it === page ? 'page' : undefined}
                      className={`min-w-[36px] min-h-[36px] rounded-lg text-sm font-medium transition-colors ${
                        it === page
                          ? 'bg-brand text-white'
                          : 'text-muted hover:bg-[color:var(--surface-sunken,#f4f5f7)]'
                      }`}
                    >{it}</button>
              )}

              <button
                type="button"
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="min-w-[36px] min-h-[36px] px-2 rounded-lg text-muted disabled:opacity-40 hover:bg-[color:var(--surface-sunken,#f4f5f7)] transition-colors"
              >›</button>
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}

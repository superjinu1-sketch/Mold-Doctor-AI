'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { isNativeApp } from '@/lib/platform';
import { IconClipboard, IconCheckSquare, IconFlask } from '@/components/icons';
import LandingHero from '@/components/landing/LandingHero';
import LandingOutputTile from '@/components/landing/LandingOutputTile';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingFreeTools from '@/components/landing/LandingFreeTools';
import LandingFieldNotes from '@/components/landing/LandingFieldNotes';
import LandingCoverage from '@/components/landing/LandingCoverage';
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
  // 웹 로그아웃 랜딩 분기(homepage-revamp-web-v1) — StoreBadges 네이티브 게이팅과 동일 패턴
  // (정적 export 프리렌더 시점엔 네이티브 브릿지가 없어 native=false로 시작, 마운트 후 재평가).
  // 앱 로그아웃 홈·로그인 홈은 현행 그대로(진우 확정 2) — 아래 두 분기는 무변경.
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
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

  // 웹 + 로그아웃만 새 애플식 랜딩. 로그인(웹/앱 공통)·앱 로그아웃은 아래 기존 JSX 그대로(진우 확정 2).
  if (!user && !native) {
    return (
      <div className="bg-surface min-h-screen" style={{ fontFamily: 'var(--font-landing)' }}>
        <LandingHero />
        <LandingOutputTile />
        <LandingHowItWorks />
        <LandingFreeTools />
        <LandingFieldNotes notes={notes} />
        <LandingCoverage />
      </div>
    );
  }

  return (
    <div className="bg-canvas min-h-screen" style={{ fontFamily: 'var(--font-landing)' }}>
      {/* Hero — app-home-redesign-v1: 파란 풀블리드 → 흰/캔버스, 개편 랜딩(LandingHero) 타이포
          재사용(토큰만). 콘텐츠는 작업 중심 유지(복귀 유저 = 바로 작업) — 작동방식·가입 trust
          라인은 로그인 홈엔 불필요한 마케팅이라 삭제. 히어로 우측 기계사진 모티프 없음(담백, 진우 확인). */}
      <section className="px-5 pt-12 pb-8 sm:pt-16">
        <div className="max-w-4xl mx-auto">
          <div className="max-w-[560px]">
            <p className="text-[19px] font-semibold text-brand mb-1.5 tracking-[-.02em]">
              {user ? t('landing.hero_eyebrow_user').replace('{name}', String(name)) : t('landing.hero_eyebrow')}
            </p>
            <h1 className="font-semibold tracking-[-.03em] text-ink" style={{ fontSize: 'clamp(2rem,7vw,3.5rem)', lineHeight: 1.07 }}>
              {t('landing.hero_h1')}
            </h1>
            <p className="font-normal text-muted mt-4" style={{ fontSize: '19px', lineHeight: 1.3, letterSpacing: '-.014em', maxWidth: '34ch' }}>
              {t('landing.hero_sub')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {user ? (
                <>
                  <Link href="/diagnose" className="ui-cta px-6 text-body">{t('landing.cta_primary_user')}</Link>
                  <Link href="/account" className="inline-flex items-center justify-center min-h-[var(--touch-cta-lg)] rounded-[var(--radius-cta)] border-2 border-brand text-brand bg-transparent hover:bg-brand-tint font-bold px-6 text-body transition-colors active:scale-[.97]">{t('landing.cta_account')}</Link>
                </>
              ) : (
                <>
                  <Link href="/diagnose" className="ui-cta px-6 text-body">{t('landing.cta_primary_loggedout')}</Link>
                  <Link href={locale === 'en' ? '/en/guide' : '/guide'} className="inline-flex items-center justify-center min-h-[var(--touch-cta-lg)] rounded-[var(--radius-cta)] border-2 border-brand text-brand bg-transparent hover:bg-brand-tint font-bold px-6 text-body transition-colors active:scale-[.97]">{t('landing.cta_secondary')}</Link>
                </>
              )}
            </div>

            {/* 축적 라인(app-home-redesign-v1 §카피) — "학습/개인화" 금지 카피 준수, 데이터가
                쌓인다는 사실만 진술(진단 엔진이 저장 이력을 입력으로 쓰지 않음, 과장 금지). */}
            <p className="text-muted text-label font-semibold mt-4">{t('home.accum_line')}</p>
          </div>
        </div>
      </section>

      {/* 무료 도구 3종 + 최근 추정 — 기존 ui-card·링크 그대로, locale 인식 유지 */}
      <section className="px-5 py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[19px] font-semibold text-brand mb-4 tracking-[-.02em]">{t('landing.free_tools_title')}</p>
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
          <Link href="/tools" className="text-brand hover:text-brand-ink text-label font-bold mt-4 min-h-[44px] flex items-center">{t('landing.tools_all_link')}</Link>

          {/* 최근 추정 → /history. 기존 "전체 기록 보기"(history.view_all) 패턴 재사용 — 단,
              라이브 건수 표시는 이 컴포넌트에 없던 신규 데이터 페칭이 필요해(가드: 로직·데이터
              무변경) 넣지 않음. 카운트가 꼭 필요하면 후속 mandate로 서버 컴포넌트 prop 전달 검토. */}
          <Link href="/history" className="ui-card mt-3 flex items-center justify-between px-4 py-3.5 hover:border-[var(--brand-border)] transition-colors">
            <span className="font-bold text-ink text-body">{t('account.history')}</span>
            <span className="text-brand font-bold text-label">{t('history.view_all')} →</span>
          </Link>
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
          <p className="text-[19px] font-semibold text-brand mt-10 mb-1.5 tracking-[-.02em]">{t('landing.notes_title')}</p>
          <p className="text-muted text-label mb-4">{t('landing.notes_sub')}</p>
          <div className="flex flex-col gap-2.5 mb-3">
            {pageNotes.map((n, i) => (
              <Link key={n.slug} href={locale === 'en' ? `/en/notes/${n.slug}` : `/notes/${n.slug}`} className="ui-card p-3.5 flex gap-3.5 items-start hover:border-[var(--brand-border)] transition-colors">
                {n.thumbImage ? (
                  <img src={n.thumbImage} alt="" aria-hidden="true" loading="lazy"
                    className="w-[104px] shrink-0 h-auto rounded-lg border border-[color:var(--border)]" />
                ) : n.thumbSvg && (
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

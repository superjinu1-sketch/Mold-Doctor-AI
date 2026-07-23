'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();

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
                    <span aria-hidden>📋</span> {t('landing.tool_ledger_title')}
                  </Link>
                  <Link
                    href="/tryout"
                    className="min-h-[var(--touch-cta)] flex items-center justify-center gap-1.5 border-2 border-[var(--on-brand)] text-on-brand hover:bg-brand-ink rounded-full text-sm font-bold px-2 text-center transition-colors"
                  >
                    <span aria-hidden>✅</span> {t('landing.tool_tryout_title')}
                  </Link>
                </div>
                <Link href="/tools" className="text-on-brand/80 hover:text-on-brand text-label text-center underline underline-offset-2 min-h-[44px] flex items-center justify-center">{t('landing.tools_all_link')}</Link>
              </>
            ) : (
              <>
                <Link href="/diagnose" className="ui-cta w-full bg-surface text-brand hover:bg-surface-sunken text-body">{t('landing.cta_primary_loggedout')}</Link>
                <Link href="/guide" className="ui-cta w-full bg-transparent border-2 border-[var(--on-brand)] text-on-brand hover:bg-brand-ink text-body">{t('landing.cta_secondary')}</Link>
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
            <Link href="/ledger" className="ui-card p-4 flex flex-col items-start gap-1 hover:border-[var(--brand-border)] transition-colors">
              <span className="text-2xl" aria-hidden>📋</span>
              <span className="font-bold text-ink text-body">{t('landing.tool_ledger_title')}</span>
              <span className="text-muted text-label leading-snug">{t('landing.tool_ledger_desc')}</span>
            </Link>
            <Link href="/tryout" className="ui-card p-4 flex flex-col items-start gap-1 hover:border-[var(--brand-border)] transition-colors">
              <span className="text-2xl" aria-hidden>✅</span>
              <span className="font-bold text-ink text-body">{t('landing.tool_tryout_title')}</span>
              <span className="text-muted text-label leading-snug">{t('landing.tool_tryout_desc')}</span>
            </Link>
            <Link href={locale === 'en' ? '/en/resins' : '/resins'} className="ui-card p-4 flex flex-col items-start gap-1 hover:border-[var(--brand-border)] transition-colors">
              <span className="text-2xl" aria-hidden>🧪</span>
              <span className="font-bold text-ink text-body">{t('landing.tool_resins_title')}</span>
              <span className="text-muted text-label leading-snug">{t('landing.tool_resins_desc')}</span>
            </Link>
          </div>
          <Link href="/tools" className="text-brand hover:text-brand-ink text-label font-medium mt-4 min-h-[44px] flex items-center justify-center">{t('landing.tools_all_link')}</Link>
        </div>
      </section>
    </div>
  );
}

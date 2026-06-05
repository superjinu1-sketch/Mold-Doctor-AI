'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';

const defectChips = [
  { ko: '은선/은줄', en: 'Silver Streak' },
  { ko: '플래시', en: 'Flash' },
  { ko: '웰드라인', en: 'Weld Line' },
  { ko: '싱크마크', en: 'Sink Mark' },
  { ko: '버닝/가스마크', en: 'Burn Mark' },
  { ko: '변색', en: 'Discoloration' },
  { ko: '크랙', en: 'Crack' },
  { ko: '휨/변형', en: 'Warpage' },
  { ko: '기포/보이드', en: 'Void/Bubble' },
  { ko: '제팅', en: 'Jetting' },
  { ko: '박리', en: 'Delamination' },
  { ko: 'GF 백화', en: 'Fiber Read-out' },
  { ko: '흐름자국', en: 'Flow Mark' },
  { ko: '미성형', en: 'Short Shot' },
];

export default function HomePage() {
  const { t, locale } = useLocale();

  const steps = [
    { n: '01', t: t('landing.step1_t'), d: t('landing.step1_d') },
    { n: '02', t: t('landing.step2_t'), d: t('landing.step2_d') },
    { n: '03', t: t('landing.step3_t'), d: t('landing.step3_d') },
  ];

  const stats = [
    { n: t('landing.stat_1'), l: t('landing.stat_1_label') },
    { n: t('landing.stat_2'), l: t('landing.stat_2_label') },
    { n: t('landing.stat_3'), l: t('landing.stat_3_label') },
  ];

  return (
    <div className="bg-canvas">

      {/* Hero */}
      <section className="pt-20 pb-28 px-4 sm:px-6 relative overflow-hidden">
        {/* Subtle light-theme tone blob — brand tint, low opacity */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-tint rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-border)] bg-brand-tint text-brand-ink text-xs font-medium px-3.5 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
            {t('landing.hero_badge')}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6 text-ink">
            {t('landing.hero_h1_1')}
            <br />
            <span className="text-brand">{t('landing.hero_h1_2')}</span>
            <br />
            {t('landing.hero_h1_3')}
          </h1>

          <p className="text-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('landing.hero_sub')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/diagnose"
              className="bg-brand text-on-brand px-8 py-3.5 rounded-full font-bold text-base hover:bg-brand-ink transition-all shadow-sm">
              {t('landing.cta_primary')}
            </Link>
            <Link href="/guide"
              className="border border-border-strong text-muted px-8 py-3.5 rounded-full font-medium text-base hover:bg-surface-sunken hover:text-ink transition-all">
              {t('landing.cta_secondary')}
            </Link>
          </div>

          {/* 5 Credits Banner */}
          <div className="mt-5 inline-flex items-center gap-2 bg-brand-tint border border-[var(--brand-border)] text-brand-ink px-5 py-2.5 rounded-full text-sm font-semibold">
            <span aria-hidden="true">🎁</span>
            {t('landing.credits_banner')}
          </div>

          {/* Stats */}
          <div className="mt-16 flex flex-wrap justify-center gap-x-12 gap-y-4">
            {stats.map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-2xl font-bold text-ink">{s.n}</div>
                <div className="text-xs text-faint mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Defect Coverage */}
      <section className="pb-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">{t('landing.defects_h2')}</h2>
            <p className="text-muted text-base">{t('landing.defects_sub')}</p>
          </div>

          {/* Defect chip cloud */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {defectChips.map((chip) => (
              <Link
                key={chip.en}
                href="/diagnose"
                className="px-3.5 py-2 bg-surface border border-border rounded-full text-sm font-medium text-muted hover:border-[var(--brand-border)] hover:text-brand-ink hover:bg-brand-tint transition-colors min-h-[44px] flex items-center"
              >
                {locale === 'en' ? chip.en : chip.ko}
              </Link>
            ))}
            <span className="px-3.5 py-2 bg-surface-sunken rounded-full text-sm font-medium text-faint min-h-[44px] flex items-center select-none">
              {locale === 'en' ? '+ many more' : '+ 그 외 다수'}
            </span>
          </div>

          {/* Safety net */}
          <div className="flex items-center justify-center gap-2.5 bg-surface-sunken border border-border rounded-xl px-5 py-3.5 max-w-md mx-auto">
            <svg className="w-5 h-5 text-brand-ink shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-muted text-base">{t('landing.defects_safety')}</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-surface border border-border rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-ink mb-10 text-center">{t('landing.how_h2')}</h2>
            <div className="grid md:grid-cols-3 gap-10">
              {steps.map((s) => (
                <div key={s.n}>
                  <div className="text-6xl font-black text-border leading-none mb-4 select-none">{s.n}</div>
                  <div className="text-xs font-semibold text-brand-ink uppercase tracking-widest mb-2">STEP</div>
                  <h3 className="text-base font-bold text-ink mb-2">{s.t}</h3>
                  <p className="text-muted text-sm leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-28 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink mb-4">
            {t('landing.cta_h2_1')}{' '}
            <span className="text-brand">{t('landing.cta_h2_2')}</span>
          </h2>
          <p className="text-muted text-sm mb-8">{t('landing.cta_sub')}</p>
          <Link href="/diagnose"
            className="inline-block bg-brand text-on-brand px-10 py-4 rounded-full font-bold text-base hover:bg-brand-ink transition-all shadow-sm">
            {t('landing.cta_btn')}
          </Link>
        </div>
      </section>

    </div>
  );
}

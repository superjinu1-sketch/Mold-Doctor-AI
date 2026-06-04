'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';

// color/dot fields kept for data compatibility but not rendered
const defects = [
  { koName: '미성형', en: 'Short Shot', descKo: '충전 부족으로 제품이 완성되지 않음', descEn: 'Incomplete fill — part not fully formed' },
  { koName: '플래시', en: 'Flash', descKo: '파팅 라인에서 수지가 새어 나옴', descEn: 'Resin bleeds past the parting line' },
  { koName: '싱크마크', en: 'Sink Mark', descKo: '두꺼운 부위 표면이 함몰됨', descEn: 'Surface depressions at thick sections' },
  { koName: '웰드라인', en: 'Weld Line', descKo: '수지 합류점에 선이 생김', descEn: 'Line forms at the melt-front junction' },
  { koName: '버닝/가스마크', en: 'Burn Mark', descKo: '공기 압축 발열로 탄 자국', descEn: 'Char marks from compressed-air combustion' },
  { koName: '은줄', en: 'Silver Streak', descKo: '수분/가스로 인한 은색 줄무늬', descEn: 'Silver lines from moisture or gas' },
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

      {/* Defect Types */}
      <section className="pb-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">{t('landing.defects_h2')}</h2>
            <p className="text-faint text-sm">{t('landing.defects_sub')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {defects.map((d) => (
              <Link key={d.en} href={`/diagnose?defect=${encodeURIComponent(d.koName)}`}
                className="group relative bg-surface border border-border rounded-2xl p-5 hover:border-[var(--brand-border)] transition-all hover:shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-brand" />
                  <span className="text-xs text-faint font-medium">{d.en}</span>
                </div>
                <h3 className="text-base font-bold text-ink mb-1">
                  {locale === 'en' ? d.en : d.koName}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {locale === 'en' ? d.descEn : d.descKo}
                </p>
                <span className="absolute top-4 right-4 text-faint group-hover:text-brand-ink transition-colors">→</span>
              </Link>
            ))}
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

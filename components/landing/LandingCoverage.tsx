'use client';

import { useLocale } from '@/contexts/LocaleContext';

export default function LandingCoverage() {
  const { t } = useLocale();
  const stats = [
    { v: t('landing.web_coverage_stat1_v'), l: t('landing.web_coverage_stat1_l') },
    { v: t('landing.web_coverage_stat2_v'), l: t('landing.web_coverage_stat2_l') },
    { v: t('landing.web_coverage_stat3_v'), l: t('landing.web_coverage_stat3_l') },
  ];

  return (
    <section className="py-24 max-md:py-[60px] text-center text-[color:var(--on-dark)]" style={{ background: 'var(--tile-dark)', fontFamily: 'var(--font-landing)' }}>
      <div className="max-w-[980px] mx-auto px-[22px]">
        <p className="text-[19px] font-semibold mb-1.5 tracking-[-.02em]" style={{ color: 'var(--accent-on-dark)' }}>{t('landing.web_coverage_eyebrow')}</p>
        <h2 className="font-semibold tracking-[-.028em]" style={{ fontSize: 'clamp(2rem,4vw,2.625rem)', lineHeight: 1.09 }}>{t('landing.web_coverage_h2')}</h2>

        <div className="flex justify-center flex-wrap mt-2">
          {stats.map((s, i) => (
            <div
              key={s.l}
              className="px-[42px] max-md:px-[22px] max-md:py-3"
              style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,.14)' : undefined }}
            >
              <div className="text-[42px] font-semibold tracking-[-.03em] tabular-nums">{s.v}</div>
              <div className="text-[15px] mt-1" style={{ color: 'var(--on-dark-muted)' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

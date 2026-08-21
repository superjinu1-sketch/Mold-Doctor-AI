'use client';

// 파치먼트 타일(how it works) — var(--canvas)가 레퍼런스의 parchment(#f5f5f7)와 사실상 동일값이라
// 별도 토큰 신설 없이 기존 --canvas 재사용(homepage-revamp-web-v1).
import { useLocale } from '@/contexts/LocaleContext';

export default function LandingHowItWorks() {
  const { t } = useLocale();
  const steps = [
    { n: '01', t: t('landing.web_how_1_t'), d: t('landing.web_how_1_d') },
    { n: '02', t: t('landing.web_how_2_t'), d: t('landing.web_how_2_d') },
    { n: '03', t: t('landing.web_how_3_t'), d: t('landing.web_how_3_d') },
  ];

  return (
    <section id="how" className="bg-canvas py-24 max-md:py-[60px] text-center" style={{ fontFamily: 'var(--font-landing)' }}>
      <div className="max-w-[1120px] mx-auto px-[22px]">
        <p className="text-[19px] font-semibold text-brand mb-1.5 tracking-[-.02em]">{t('landing.web_how_eyebrow')}</p>
        <h2 className="font-semibold tracking-[-.028em] text-ink" style={{ fontSize: 'clamp(2rem,4vw,2.625rem)', lineHeight: 1.09 }}>{t('landing.web_how_h2')}</h2>

        <div className="grid md:grid-cols-3 gap-[22px] text-left mt-12 max-md:mt-8">
          {steps.map(s => (
            <div key={s.n} className="bg-surface border border-border rounded-[18px] p-6">
              <div className="text-[15px] font-semibold text-faint mb-3 tabular-nums">{s.n}</div>
              <h3 className="text-[20px] font-semibold tracking-[-.02em] text-ink mb-1.5">{s.t}</h3>
              <p className="text-[15px] text-muted leading-snug">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

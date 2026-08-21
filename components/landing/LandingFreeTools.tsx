'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { IconClipboard, IconCheckSquare, IconFlask } from '@/components/icons';

export default function LandingFreeTools() {
  const { t, locale } = useLocale();
  const resinsHref = locale === 'en' ? '/en/resins' : '/resins';

  const cards = [
    { Icon: IconClipboard, title: t('landing.web_tools_1_t'), desc: t('landing.web_tools_1_d'), link: t('landing.web_tools_1_link'), href: '/ledger' },
    { Icon: IconCheckSquare, title: t('landing.web_tools_2_t'), desc: t('landing.web_tools_2_d'), link: t('landing.web_tools_2_link'), href: '/tryout' },
    { Icon: IconFlask, title: t('landing.web_tools_3_t'), desc: t('landing.web_tools_3_d'), link: t('landing.web_tools_3_link'), href: resinsHref },
  ];

  return (
    <section id="tools" className="bg-surface py-24 max-md:py-[60px] text-center" style={{ fontFamily: 'var(--font-landing)' }}>
      <div className="max-w-[1120px] mx-auto px-[22px]">
        <p className="text-[19px] font-semibold text-brand mb-1.5 tracking-[-.02em]">{t('landing.web_tools_eyebrow')}</p>
        <h2 className="font-semibold tracking-[-.028em] text-ink" style={{ fontSize: 'clamp(2rem,4vw,2.625rem)', lineHeight: 1.09 }}>{t('landing.web_tools_h2')}</h2>
        <p className="font-normal text-muted mx-auto mt-3.5" style={{ fontSize: 'clamp(1.25rem,2.2vw,1.5625rem)', lineHeight: 1.3, letterSpacing: '-.014em', maxWidth: '34ch' }}>
          {t('landing.web_tools_tagline')}
        </p>

        <div className="grid md:grid-cols-3 gap-[22px] text-left mt-12 max-md:mt-8">
          {cards.map(c => (
            <div key={c.title} className="bg-surface border border-border rounded-[18px] p-6">
              <div className="w-[46px] h-[46px] rounded-xl bg-brand-tint text-brand grid place-items-center mb-4">
                <c.Icon size={22} />
              </div>
              <h3 className="text-[20px] font-semibold tracking-[-.02em] text-ink mb-1.5">{c.title}</h3>
              <p className="text-[15px] text-muted leading-snug">{c.desc}</p>
              <Link href={c.href} className="inline-block mt-3.5 text-[15px] text-brand hover:underline">{c.link} ›</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

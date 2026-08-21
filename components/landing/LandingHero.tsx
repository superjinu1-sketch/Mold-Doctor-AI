'use client';

// 웹 로그아웃 랜딩 히어로(homepage-revamp-web-v1) — 애플식 화이트 타일 + 제품 카드(그림자 유일).
// 카피는 landing.web_* 키(ko.ts·en.ts 동일 영문, 진우 확정 3)라 로케일 토글과 무관하게 항상 영문.
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import StoreBadges from '@/components/StoreBadges';

export default function LandingHero() {
  const { t, locale } = useLocale();

  return (
    <section className="bg-surface pt-16 pb-20" style={{ fontFamily: 'var(--font-landing)' }}>
      <div className="max-w-[980px] mx-auto px-[22px] text-center">
        <p className="text-[19px] font-semibold text-brand mb-1.5 tracking-[-.02em]">{t('landing.web_eyebrow')}</p>
        <h1 className="font-semibold tracking-[-.03em] text-ink" style={{ fontSize: 'clamp(2.5rem,5.2vw,3.375rem)', lineHeight: 1.07 }}>
          {t('landing.web_h1_1')}<br />{t('landing.web_h1_2')}
        </h1>
        <p className="font-normal text-muted mx-auto mt-4" style={{ fontSize: 'clamp(1.25rem,2.2vw,1.5625rem)', lineHeight: 1.3, letterSpacing: '-.014em', maxWidth: '30ch' }}>
          {t('landing.web_tagline')}
        </p>

        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          <Link
            href="/diagnose"
            className="inline-flex items-center justify-center gap-1.5 text-[17px] font-normal tracking-[-.02em] rounded-full py-2.5 px-5 bg-brand text-on-brand hover:bg-brand-ink transition-colors active:scale-[.96]"
          >
            {t('landing.web_cta_primary')}
          </Link>
          <Link
            href={locale === 'en' ? '/en/guide' : '/guide'}
            className="inline-flex items-center justify-center gap-1.5 text-[17px] font-normal tracking-[-.02em] rounded-full py-2.5 px-5 bg-transparent text-brand border border-brand hover:bg-brand-tint transition-colors active:scale-[.96]"
          >
            {t('landing.web_cta_secondary')}
          </Link>
        </div>

        <div className="mt-4">
          <StoreBadges variant="inline" locale="en" />
        </div>
        <p className="text-[13px] text-faint mt-3.5">{t('landing.web_fineprint')}</p>

        <div className="max-w-[560px] mx-auto mt-10 bg-surface rounded-[18px] text-left overflow-hidden" style={{ boxShadow: 'var(--shadow-product)' }} aria-label="Example estimate result">
          <div className="flex items-center justify-between px-5 py-[15px] border-b border-border">
            <span className="text-[15px] font-semibold flex items-center gap-2 text-ink">
              <span className="w-2 h-2 rounded-full bg-ok" aria-hidden="true" />
              {t('landing.web_render_title')}
            </span>
            <span className="text-[12px] text-faint tabular-nums">{t('landing.web_render_id')}</span>
          </div>
          <div className="p-5">
            <div className="flex gap-4 items-center mb-4">
              <div className="w-[140px] h-[106px] shrink-0 rounded-xl bg-surface-sunken border border-border grid place-items-center" aria-hidden="true">
                <svg width="132" height="100" viewBox="0 0 132 100">
                  <rect x="20" y="22" width="92" height="56" rx="8" fill="var(--surface-sunken)" stroke="var(--border-strong)" strokeWidth="2" />
                  <rect x="33" y="33" width="22" height="15" rx="3" fill="var(--border-strong)" />
                  <rect x="64" y="33" width="22" height="15" rx="3" fill="var(--border-strong)" />
                  <path d="M92 62 Q108 62 108 78 L92 78 Z" fill="var(--warn-bg)" />
                  <circle cx="99" cy="69" r="13.5" fill="none" stroke="var(--danger)" strokeWidth="2.4" />
                  <line x1="108" y1="79" x2="118" y2="89" stroke="var(--danger)" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-[15px] text-muted leading-snug">
                <b className="text-ink">{t('landing.web_render_defect')}</b> {t('landing.web_render_defect_loc')}
                <span className="block mt-1.5 text-[13px]" style={{ color: 'var(--danger)' }}>● {t('landing.web_render_defect_tag')}</span>
              </div>
            </div>
            <div className="mb-4">
              <div className="text-[13px] text-faint mb-0.5">{t('landing.web_render_cause_label')}</div>
              <div className="flex justify-between items-baseline gap-3">
                <span className="text-[18px] font-semibold tracking-[-.02em] text-ink">{t('landing.web_render_cause')}</span>
                <span className="text-[14px] font-semibold text-brand whitespace-nowrap tabular-nums">{t('landing.web_render_cause_pct')}</span>
              </div>
            </div>
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr>
                  <th className="text-left text-[12px] font-normal text-faint pb-2">{t('landing.web_render_th_setting')}</th>
                  <th className="text-right text-[12px] font-normal text-faint pb-2">{t('landing.web_render_th_current')}</th>
                  <th className="text-right text-[12px] font-normal text-faint pb-2">{t('landing.web_render_th_recommended')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="py-2.5 text-ink">{t('landing.web_render_row1_name')}</td>
                  <td className="py-2.5 text-right text-muted tabular-nums">90 MPa</td>
                  <td className="py-2.5 text-right text-ok font-semibold tabular-nums">110 MPa</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2.5 text-ink">{t('landing.web_render_row2_name')}</td>
                  <td className="py-2.5 text-right text-muted tabular-nums">40 MPa</td>
                  <td className="py-2.5 text-right text-ok font-semibold tabular-nums">55 MPa</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2.5 text-ink">{t('landing.web_render_row3_name')}</td>
                  <td className="py-2.5 text-right text-muted tabular-nums">240°C</td>
                  <td className="py-2.5 text-right text-ok font-semibold tabular-nums">250°C</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2.5 text-ink">{t('landing.web_render_row4_name')}</td>
                  <td className="py-2.5 text-right text-muted tabular-nums">45 mm/s</td>
                  <td className="py-2.5 text-right text-ok font-semibold tabular-nums">60 mm/s</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-[12px] text-faint px-5 pb-4">{t('landing.web_render_footnote')}</div>
        </div>
      </div>
    </section>
  );
}

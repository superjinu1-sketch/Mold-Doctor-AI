'use client';

// 웹 로그아웃 랜딩 전용 다단 푸터(homepage-revamp-web-v1). 전역 Footer.tsx는 다른 모든 페이지에서
// 무변경 — 이 컴포넌트는 Footer.tsx가 랜딩 조건(웹+로그아웃+홈)에서만 조건부로 렌더한다(CC 판단:
// 전역 교체는 전 페이지 blast radius가 커서 위험 — mandate §대상파일의 "위험하면 랜딩 전용 푸터" 채택).
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import StoreBadges from '@/components/StoreBadges';
import Logo from '@/components/Logo';

export default function LandingFooter() {
  const { t, locale } = useLocale();
  const resinsHref = locale === 'en' ? '/en/resins' : '/resins';
  const guideHref = locale === 'en' ? '/en/guide' : '/guide';

  return (
    <footer className="bg-canvas text-muted py-14 pb-8 text-left" style={{ fontFamily: 'var(--font-landing)' }}>
      <div className="max-w-[1120px] mx-auto px-[22px]">
        <div className="grid md:grid-cols-[1.7fr_1fr_1fr_1fr] gap-9">
          <div>
            <Logo size={26} wordClassName="text-[19px]" />
            <p className="text-[14px] text-faint mt-3 mb-3.5 leading-relaxed" style={{ maxWidth: '32ch' }}>
              {t('landing.web_footer_desc')}
            </p>
            <StoreBadges variant="inline" locale="en" />
          </div>
          <div>
            <h4 className="text-[12px] font-semibold text-ink mb-1.5">{t('landing.web_footer_col_product')}</h4>
            <Link href="/diagnose" className="block text-[14px] text-muted hover:text-brand leading-[2.2]">{t('landing.web_footer_product_1')}</Link>
            <Link href="/pricing" className="block text-[14px] text-muted hover:text-brand leading-[2.2]">{t('landing.web_footer_product_2')}</Link>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold text-ink mb-1.5">{t('landing.web_footer_col_tools')}</h4>
            <Link href="/ledger" className="block text-[14px] text-muted hover:text-brand leading-[2.2]">{t('landing.web_footer_tools_1')}</Link>
            <Link href="/tryout" className="block text-[14px] text-muted hover:text-brand leading-[2.2]">{t('landing.web_footer_tools_2')}</Link>
            <Link href={resinsHref} className="block text-[14px] text-muted hover:text-brand leading-[2.2]">{t('landing.web_footer_tools_3')}</Link>
            <Link href={guideHref} className="block text-[14px] text-muted hover:text-brand leading-[2.2]">{t('landing.web_footer_tools_4')}</Link>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold text-ink mb-1.5">{t('landing.web_footer_col_company')}</h4>
            <Link href="/en/notes" className="block text-[14px] text-muted hover:text-brand leading-[2.2]">{t('landing.web_footer_company_1')}</Link>
            <Link href="/privacy" className="block text-[14px] text-muted hover:text-brand leading-[2.2]">{t('landing.web_footer_company_2')}</Link>
            <Link href="/terms" className="block text-[14px] text-muted hover:text-brand leading-[2.2]">{t('landing.web_footer_company_3')}</Link>
          </div>
        </div>
        <div className="mt-8 pt-5 border-t border-border flex justify-between gap-3.5 flex-wrap text-[12px] text-faint">
          <span>{t('landing.web_footer_copyright')}</span>
          <span>{t('landing.web_footer_domain')}</span>
        </div>
      </div>
    </footer>
  );
}

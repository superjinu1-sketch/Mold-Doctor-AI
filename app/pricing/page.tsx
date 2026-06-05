'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';

const creditPacks = [
  { nameKo: '스타터', nameEn: 'Starter', credits: 5,   priceKo: '₩5,500',  priceEn: '₩5,500',  perKo: '크레딧당 ₩1,100', perEn: '₩1,100 / credit', recommended: false },
  { nameKo: '베이직', nameEn: 'Basic',   credits: 10,  priceKo: '₩9,900',  priceEn: '₩9,900',  perKo: '크레딧당 ₩990',   perEn: '₩990 / credit',   recommended: true  },
  { nameKo: '프로',   nameEn: 'Pro',     credits: 30,  priceKo: '₩24,900', priceEn: '₩24,900', perKo: '크레딧당 ₩830',   perEn: '₩830 / credit',   recommended: false },
  { nameKo: '벌크',   nameEn: 'Bulk',    credits: 100, priceKo: '₩69,000', priceEn: '₩69,000', perKo: '크레딧당 ₩690',   perEn: '₩690 / credit',   recommended: false },
];

const creditPoints = [
  {
    ko: '1크레딧 = 진단 1건 + 그 건 추가 질문 5회',
    en: '1 credit = 1 diagnosis + 5 follow-up questions',
  },
  {
    ko: '셋팅 바꿔 다시 진단하면 새 크레딧 1개',
    en: 'Re-diagnosing with new settings uses 1 new credit',
  },
  {
    ko: '저장된 결과 다시 보기는 무료',
    en: 'Re-viewing saved results is free',
  },
];

const faqs = [
  {
    qKo: '크레딧은 어떻게 쓰나요?',
    qEn: 'How do credits work?',
    aKo: '크레딧 1개로 추정 1건을 받고, 그 결과에 대한 추가 질문을 5번까지 무료로 할 수 있어요. 셋팅을 바꿔 다시 진단하면 새 크레딧 1개가 쓰이고, 저장된 결과를 다시 보는 건 무료입니다.',
    aEn: '1 credit gives you 1 analysis result plus up to 5 free follow-up questions on that result. Re-running with new settings uses 1 new credit. Viewing saved results is always free.',
  },
  {
    qKo: '가입하면 뭘 받나요?',
    qEn: 'What do I get on sign-up?',
    aKo: '가입 즉시 5크레딧을 무료로 드려요. 모든 기능을 동일한 품질로 쓸 수 있고, 플랜별 기능 차등은 없습니다.',
    aEn: 'You get 5 free credits immediately on sign-up. All features are available at the same quality — no tier-based feature differences.',
  },
  {
    qKo: '어떤 수지를 지원하나요?',
    qEn: 'What resins are supported?',
    aKo: '범용 플라스틱(PP, PE, ABS, PS, PVC, PMMA)부터 엔지니어링(PA6, PA66, PA46, PBT, PET, PC, POM), 슈퍼엔프라(PPS, LCP, PEEK, PEI, PPSU), 블렌드(PC/ABS, PC/PBT, PA/ABS), TPE/TPU까지 거의 모든 사출용 열가소성 수지를 커버합니다. 50종 이상 지원.',
    aEn: 'We support nearly all injection-grade thermoplastics: commodity plastics (PP, PE, ABS, PS, PVC, PMMA), engineering plastics (PA6, PA66, PA46, PBT, PET, PC, POM), super engineering plastics (PPS, LCP, PEEK, PEI, PPSU), blends (PC/ABS, PC/PBT, PA/ABS), and TPE/TPU. 50+ resin types covered.',
  },
  {
    qKo: '추정 정확도는 어느 정도인가요?',
    qEn: 'How accurate is the analysis?',
    aKo: 'Mold Doctor AI는 AI 보조 도구입니다. 10년 이상의 사출 엔지니어링 지식을 기반으로 하지만, 최종 판단과 조치는 현장 엔지니어가 해야 합니다. 추정 결과를 참고 자료로 활용하세요.',
    aEn: 'Mold Doctor AI is an AI-assisted tool based on 10+ years of injection engineering knowledge. Final judgment and actions must be taken by the on-site engineer. Use the analysis results as reference material.',
  },
  {
    qKo: '모바일에서도 사용 가능한가요?',
    qEn: 'Can I use it on mobile?',
    aKo: '네, 반응형 웹앱으로 스마트폰에서도 최적화되어 있습니다. 카메라로 불량 사진을 직접 촬영해서 업로드할 수 있습니다.',
    aEn: "Yes — it's a responsive web app optimized for smartphones. You can take defect photos directly with your camera and upload them.",
  },
  {
    qKo: '우리 회사 수지 데이터를 등록할 수 있나요?',
    qEn: 'Can we register our proprietary resin data?',
    aKo: 'Enterprise 문의를 통해 자사 수지 DB 등록 및 맞춤형 추정을 지원합니다. 특수 Grade나 자체 배합 수지에 대한 커스텀 지원을 제공합니다.',
    aEn: 'Contact us for Enterprise to register your custom resin DB for tailored analysis. We support special grades and in-house compound resins.',
  },
];

export default function PricingPage() {
  const { t, locale } = useLocale();

  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-16">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-border)] bg-brand-tint text-brand-ink text-xs font-medium px-3.5 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-brand rounded-full" />
            {t('pricing.badge')}
          </div>
          <h1 className="text-4xl font-bold text-ink mb-4">{t('pricing.h1')}</h1>
          <p className="text-muted text-base">{t('pricing.sub')}</p>
        </div>

        {/* 가입 무료 강조 카드 */}
        <div className="bg-brand-tint border border-[var(--brand-border)] rounded-2xl p-8 sm:p-10 text-center mb-12">
          <h2 className="text-2xl font-bold text-brand-ink mb-3">
            {locale === 'en' ? '5 free credits on sign-up' : '가입 즉시 5크레딧 무료'}
          </h2>
          <p className="text-muted text-base mb-6">
            {locale === 'en'
              ? 'All features, no quality tiers. Start right away.'
              : '전 기능 그대로. 품질 차등 없이 바로 써보세요.'}
          </p>
          <Link
            href="/diagnose"
            className="inline-flex items-center justify-center bg-brand text-on-brand px-8 py-3.5 rounded-full font-bold text-base hover:bg-brand-ink transition-colors min-h-[var(--touch-cta)]"
          >
            {locale === 'en' ? 'Get started free' : '무료로 시작'}
          </Link>
        </div>

        {/* 크레딧 설명 */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-ink text-center mb-6">
            {locale === 'en' ? 'How credits work' : '크레딧이 뭐예요?'}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {creditPoints.map((pt, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-5 flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-brand-tint text-brand-ink text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-muted text-base leading-snug">
                  {locale === 'en' ? pt.en : pt.ko}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 크레딧 팩 그리드 */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-ink text-center mb-6">
            {locale === 'en' ? 'Credit packs' : '크레딧 팩'}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPacks.map((pack) => (
              <div
                key={pack.nameKo}
                className={`relative rounded-2xl border overflow-hidden ${
                  pack.recommended
                    ? 'border-brand bg-brand-tint shadow-sm'
                    : 'border-border bg-surface'
                }`}
              >
                {pack.recommended && (
                  <div className="text-center bg-brand text-on-brand text-xs font-black py-1.5 tracking-wider">
                    {t('pricing.recommended_badge')}
                  </div>
                )}
                <div className={`px-5 ${pack.recommended ? 'pt-5 pb-4' : 'pt-6 pb-4'}`}>
                  <div className="text-xs font-bold text-faint uppercase tracking-widest mb-2">
                    {locale === 'en' ? pack.nameEn : pack.nameKo}
                  </div>
                  <div className={`text-3xl font-bold mb-0.5 ${pack.recommended ? 'text-brand-ink' : 'text-ink'}`}>
                    {pack.credits}
                    <span className="text-base font-semibold text-muted ml-1">
                      {locale === 'en' ? 'credits' : '크레딧'}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-ink mt-1">
                    {locale === 'en' ? pack.priceEn : pack.priceKo}
                  </div>
                  <div className="text-xs text-faint mt-1">
                    {locale === 'en' ? pack.perEn : pack.perKo}
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 rounded-xl font-bold text-sm border border-border text-faint bg-surface-sunken disabled:opacity-60 cursor-not-allowed min-h-[var(--touch-min)]"
                  >
                    {locale === 'en' ? 'Coming soon' : '구매 준비 중'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-faint text-sm mt-4">
            {locale === 'en'
              ? 'Credit purchases are coming soon. For now, try it with your 5 free sign-up credits.'
              : '추가 크레딧 구매는 곧 제공됩니다. 지금은 가입 5크레딧으로 체험하세요.'}
          </p>
        </div>

        {/* Enterprise 카드 */}
        <div className="bg-surface border border-border rounded-2xl p-8 mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="text-xs font-bold text-faint uppercase tracking-widest mb-2">Enterprise</div>
              <h2 className="text-xl font-bold text-ink mb-3">
                {locale === 'en' ? 'Custom Quote' : t('pricing.custom_quote')}
              </h2>
              <ul className="space-y-1.5">
                {(locale === 'en'
                  ? ['Team accounts (multiple users)', 'Custom resin DB registration', 'API integration', 'Dedicated technical support']
                  : ['팀 계정 (다수 사용자)', '자사 수지 DB 등록', 'API 연동', '전담 기술 지원']
                ).map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-muted">
                    <span className="text-brand-ink shrink-0 mt-0.5">✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="mailto:contact@molddoctor.ai"
              className="shrink-0 inline-flex items-center justify-center border border-border-strong text-brand-ink hover:bg-brand-tint px-6 py-3 rounded-xl font-bold text-sm transition-colors min-h-[var(--touch-cta)]"
            >
              {locale === 'en' ? 'Contact' : t('pricing.contact')}
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-xl font-bold text-ink text-center mb-8">{t('pricing.faq_h2')}</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-5">
                <h3 className="font-semibold text-ink text-sm mb-2">
                  Q. {locale === 'en' ? faq.qEn : faq.qKo}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  A. {locale === 'en' ? faq.aEn : faq.aKo}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-ink mb-3">{t('pricing.cta_h2')}</h2>
          <p className="text-muted text-sm mb-6">{t('pricing.cta_sub')}</p>
          <Link
            href="/diagnose"
            className="inline-block bg-brand text-on-brand px-8 py-3.5 rounded-full font-bold text-sm hover:bg-brand-ink transition-all shadow-sm"
          >
            {t('pricing.cta_btn')}
          </Link>
        </div>

      </div>
    </div>
  );
}

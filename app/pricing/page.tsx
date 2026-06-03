'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';

const plans = [
  {
    name: 'Free',
    priceKo: '무료', priceEn: 'Free',
    priceDetailKo: '영원히', priceDetailKey: 'pricing.forever',
    recommended: false,
    featuresKo: ['월 3회 AI 추정', '기본 불량 가이드 (12종)', '추정 기록 저장 (로컬)', '12가지 불량 유형 지원'],
    featuresEn: ['3 AI analyses / month', 'Basic defect guide (12 types)', 'Local analysis history', '12 defect types supported'],
    notIncludedKo: ['상세 원인 분석 (확률 %)', '셋팅 비교표 상세', '클라우드 기록 저장', '수지별 권장 조건 DB', '이메일 리포트'],
    notIncludedEn: ['Detailed cause analysis (probability %)', 'Detailed settings comparison', 'Cloud history storage', 'Resin-specific condition DB', 'Email report'],
    btnTextKo: '무료로 시작', btnTextEn: 'Get Started Free',
    btnHref: '/diagnose',
  },
  {
    name: 'Pro',
    priceKo: '29,000원', priceEn: '$19.99',
    priceDetailKo: '월 / $19.99', priceDetailEn: '/month',
    recommended: true,
    featuresKo: ['무제한 AI 추정', '상세 원인 분석 (확률 %)', '현재 vs 권장 셋팅 비교표', '추정 기록 클라우드 저장', '수지별 권장 조건 DB', '이메일 추정 리포트', '50종 이상 수지 지원', 'PDF 저장'],
    featuresEn: ['Unlimited AI analyses', 'Detailed cause analysis (probability %)', 'Current vs. recommended settings comparison', 'Cloud analysis history', 'Resin-specific condition DB', 'Email analysis report', '50+ resins supported', 'PDF export'],
    notIncludedKo: [],
    notIncludedEn: [],
    btnTextKo: 'Pro 시작', btnTextEn: 'Start Pro',
    btnHref: '/diagnose',
  },
  {
    name: 'Enterprise',
    priceKo: '문의', priceKey: 'pricing.contact',
    priceDetailKo: '맞춤 견적', priceDetailKey: 'pricing.custom_quote',
    recommended: false,
    featuresKo: ['Pro 모든 기능 포함', '팀 계정 (다수 사용자)', '자사 수지 DB 등록', 'API 연동', '전담 기술 지원', '커스텀 AI 파인튜닝', 'SLA 보장'],
    featuresEn: ['All Pro features', 'Team accounts (multiple users)', 'Custom resin DB registration', 'API integration', 'Dedicated technical support', 'Custom AI fine-tuning', 'SLA guarantee'],
    notIncludedKo: [],
    notIncludedEn: [],
    btnTextKo: '문의하기', btnTextEn: 'Contact Us',
    btnHref: 'mailto:contact@molddoctor.ai',
  },
];

const faqs = [
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
    qKo: '우리 회사 수지 데이터를 학습시킬 수 있나요?',
    qEn: 'Can you train on our proprietary resin data?',
    aKo: 'Enterprise 플랜에서 자사 수지 DB를 등록하여 맞춤형 추정이 가능합니다. 특수 Grade나 자체 배합 수지에 대한 커스텀 지원을 제공합니다.',
    aEn: 'With the Enterprise plan, you can register your custom resin DB for tailored analysis. We provide custom support for special grades or in-house compound resins.',
  },
  {
    qKo: 'API 키는 어디서 발급받나요?',
    qEn: 'Where do I get an API key?',
    aKo: 'Anthropic의 console.anthropic.com에서 Claude API 키를 발급받으실 수 있습니다. API 키를 .env.local 파일에 입력하면 바로 사용 가능합니다.',
    aEn: "You can obtain a Claude API key from console.anthropic.com. Enter it in the .env.local file and you're ready to go immediately.",
  },
];

export default function PricingPage() {
  const { t, locale } = useLocale();

  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-16">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-border)] bg-brand-tint text-brand-ink text-xs font-medium px-3.5 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-brand rounded-full" />
            {t('pricing.badge')}
          </div>
          <h1 className="text-4xl font-bold text-ink mb-4">{t('pricing.h1')}</h1>
          <p className="text-muted text-base">{t('pricing.sub')}</p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-4 mb-20">
          {plans.map((plan) => {
            const price = locale === 'en' ? (plan.priceEn ?? t(plan.priceKey ?? 'pricing.contact')) : plan.priceKo;
            const priceDetail = locale === 'en' ? (plan.priceDetailEn ?? t(plan.priceDetailKey ?? 'pricing.custom_quote')) : plan.priceDetailKo;
            const features = locale === 'en' ? plan.featuresEn : plan.featuresKo;
            const notIncluded = locale === 'en' ? plan.notIncludedEn : plan.notIncludedKo;
            const btnText = locale === 'en' ? plan.btnTextEn : plan.btnTextKo;

            return (
              <div key={plan.name}
                className={`relative rounded-2xl overflow-hidden border transition-all ${
                  plan.recommended
                    ? 'border-brand bg-brand-tint shadow-sm scale-[1.02]'
                    : 'border-border bg-surface hover:border-[var(--brand-border)]'
                }`}>
                {plan.recommended && (
                  <div className="text-center bg-brand text-on-brand text-xs font-black py-1.5 tracking-wider">
                    {t('pricing.recommended_badge')}
                  </div>
                )}
                <div className={`px-6 ${plan.recommended ? 'pt-6 pb-5' : 'pt-7 pb-5'}`}>
                  <div className="text-xs font-bold text-faint uppercase tracking-widest mb-3">{plan.name}</div>
                  <div className={`text-3xl font-bold mb-1 ${plan.recommended ? 'text-brand-ink' : 'text-ink'}`}>
                    {price}
                  </div>
                  <div className="text-xs text-faint">{priceDetail}</div>
                </div>

                <div className="px-6 pb-6">
                  <ul className="space-y-2.5 mb-6">
                    {features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-muted">
                        <span className="text-brand-ink shrink-0 mt-0.5">✓</span>
                        {feat}
                      </li>
                    ))}
                    {notIncluded.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-faint">
                        <span className="shrink-0 mt-0.5">–</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.btnHref}
                    className={`block w-full text-center py-3 rounded-xl font-bold text-sm transition-all min-h-[var(--touch-min)] flex items-center justify-center ${
                      plan.recommended
                        ? 'bg-brand text-on-brand hover:bg-brand-ink shadow-sm'
                        : 'border border-border-strong text-muted hover:bg-surface-sunken hover:text-ink'
                    }`}>
                    {btnText}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="text-xl font-bold text-ink text-center mb-8">{t('pricing.faq_h2')}</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-5">
                <h3 className="font-semibold text-ink text-sm mb-2">Q. {locale === 'en' ? faq.qEn : faq.qKo}</h3>
                <p className="text-muted text-sm leading-relaxed">A. {locale === 'en' ? faq.aEn : faq.aKo}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-ink mb-3">{t('pricing.cta_h2')}</h2>
          <p className="text-muted text-sm mb-6">{t('pricing.cta_sub')}</p>
          <Link href="/diagnose"
            className="inline-block bg-brand text-on-brand px-8 py-3.5 rounded-full font-bold text-sm hover:bg-brand-ink transition-all shadow-sm">
            {t('pricing.cta_btn')}
          </Link>
        </div>

      </div>
    </div>
  );
}

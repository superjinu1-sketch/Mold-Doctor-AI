import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '무료',
    priceDetail: '영원히',
    color: 'border-slate-200',
    headerColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    btnClass: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    btnText: '무료로 시작',
    btnHref: '/diagnose',
    features: [
      '월 3회 AI 진단',
      '기본 불량 가이드 (12종)',
      '진단 기록 저장 (로컬)',
      '12가지 불량 유형 지원',
    ],
    notIncluded: [
      '상세 원인 분석 (확률 %)',
      '셋팅 비교표 상세',
      '클라우드 기록 저장',
      '수지별 권장 조건 DB',
      '이메일 리포트',
    ],
    recommended: false,
  },
  {
    name: 'Pro',
    price: '29,000원',
    priceDetail: '월 / $19.99',
    color: 'border-[#059669]',
    headerColor: 'bg-[#059669]',
    textColor: 'text-white',
    btnClass: 'bg-[#059669] hover:bg-[#047857] text-white',
    btnText: 'Pro 시작',
    btnHref: '/diagnose',
    features: [
      '무제한 AI 진단',
      '상세 원인 분석 (확률 %)',
      '현재 vs 권장 셋팅 비교표',
      '진단 기록 클라우드 저장',
      '수지별 권장 조건 DB',
      '이메일 진단 리포트',
      '50종 이상 수지 지원',
      'PDF 저장',
    ],
    notIncluded: [],
    recommended: true,
  },
  {
    name: 'Enterprise',
    price: '문의',
    priceDetail: '맞춤 견적',
    color: 'border-[#1E293B]',
    headerColor: 'bg-[#1E293B]',
    textColor: 'text-white',
    btnClass: 'bg-[#1E293B] hover:bg-slate-700 text-white',
    btnText: '문의하기',
    btnHref: 'mailto:contact@molddoctor.ai',
    features: [
      'Pro 모든 기능 포함',
      '팀 계정 (다수 사용자)',
      '자사 수지 DB 등록',
      'API 연동',
      '전담 기술 지원',
      '커스텀 AI 파인튜닝',
      'SLA 보장',
    ],
    notIncluded: [],
    recommended: false,
  },
];

const faqs = [
  {
    q: '어떤 수지를 지원하나요?',
    a: '범용 플라스틱(PP, PE, ABS, PS, PVC, PMMA)부터 엔지니어링(PA6, PA66, PA46, PBT, PET, PC, POM), 슈퍼엔프라(PPS, LCP, PEEK, PEI, PPSU), 블렌드(PC/ABS, PC/PBT, PA/ABS), TPE/TPU까지 거의 모든 사출용 열가소성 수지를 커버합니다. 50종 이상 지원.',
  },
  {
    q: '진단 정확도는 어느 정도인가요?',
    a: 'Mold Doctor AI는 AI 보조 도구입니다. 10년 이상의 사출 엔지니어링 지식을 기반으로 하지만, 최종 판단과 조치는 현장 엔지니어가 해야 합니다. 진단 결과를 참고 자료로 활용하세요.',
  },
  {
    q: '모바일에서도 사용 가능한가요?',
    a: '네, 반응형 웹앱으로 스마트폰에서도 최적화되어 있습니다. 카메라로 불량 사진을 직접 촬영해서 업로드할 수 있습니다. 향후 전용 모바일 앱 출시 예정입니다.',
  },
  {
    q: '우리 회사 수지 데이터를 학습시킬 수 있나요?',
    a: 'Enterprise 플랜에서 자사 수지 DB를 등록하여 맞춤형 진단이 가능합니다. 특수 Grade나 자체 배합 수지에 대한 커스텀 지원을 제공합니다.',
  },
  {
    q: 'API 키는 어디서 발급받나요?',
    a: 'Anthropic의 console.anthropic.com에서 Claude API 키를 발급받으실 수 있습니다. API 키를 .env.local 파일에 입력하면 바로 사용 가능합니다.',
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[#1E293B] mb-4">간단하고 투명한 가격</h1>
        <p className="text-slate-500 text-lg">현장에서 바로 쓸 수 있는 AI 트러블슈팅 도구</p>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative border-2 rounded-2xl overflow-hidden ${plan.color} ${plan.recommended ? 'shadow-2xl scale-105' : 'shadow-sm'}`}
          >
            {plan.recommended && (
              <div className="absolute top-0 left-0 right-0 text-center bg-[#059669] text-white text-xs font-bold py-1.5 tracking-wide">
                ⭐ 추천 플랜
              </div>
            )}
            <div className={`${plan.headerColor} ${plan.recommended ? 'pt-8 pb-6' : 'pt-6 pb-6'} px-6`}>
              <h2 className={`text-2xl font-bold ${plan.textColor} mb-1`}>{plan.name}</h2>
              <div className={`text-4xl font-bold ${plan.textColor} mt-3`}>{plan.price}</div>
              <div className={`text-sm ${plan.name === 'Pro' ? 'text-green-100' : plan.name === 'Enterprise' ? 'text-slate-300' : 'text-slate-500'} mt-1`}>{plan.priceDetail}</div>
            </div>

            <div className="p-6">
              <ul className="space-y-3 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feat}
                  </li>
                ))}
                {plan.notIncluded.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-slate-400">
                    <svg className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.btnHref}
                className={`block w-full text-center py-3 rounded-xl font-bold text-base transition-colors ${plan.btnClass}`}
              >
                {plan.btnText}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-[#1E293B] text-center mb-8">자주 묻는 질문</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1E293B] mb-2">Q. {faq.q}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">A. {faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 bg-[#1E293B] rounded-2xl p-10 text-center text-white">
        <h2 className="text-2xl font-bold mb-3">지금 바로 무료로 시작하세요</h2>
        <p className="text-slate-300 mb-6">신용카드 불필요 · Claude API 키만 있으면 즉시 사용 가능</p>
        <Link
          href="/diagnose"
          className="inline-block bg-[#059669] hover:bg-[#047857] text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
        >
          무료 진단 시작하기
        </Link>
      </div>
    </div>
  );
}

import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '무료',
    priceDetail: '영원히',
    recommended: false,
    features: ['월 3회 AI 진단', '기본 불량 가이드 (12종)', '진단 기록 저장 (로컬)', '12가지 불량 유형 지원'],
    notIncluded: ['상세 원인 분석 (확률 %)', '셋팅 비교표 상세', '클라우드 기록 저장', '수지별 권장 조건 DB', '이메일 리포트'],
    btnText: '무료로 시작',
    btnHref: '/diagnose',
  },
  {
    name: 'Pro',
    price: '29,000원',
    priceDetail: '월 / $19.99',
    recommended: true,
    features: ['무제한 AI 진단', '상세 원인 분석 (확률 %)', '현재 vs 권장 셋팅 비교표', '진단 기록 클라우드 저장', '수지별 권장 조건 DB', '이메일 진단 리포트', '50종 이상 수지 지원', 'PDF 저장'],
    notIncluded: [],
    btnText: 'Pro 시작',
    btnHref: '/diagnose',
  },
  {
    name: 'Enterprise',
    price: '문의',
    priceDetail: '맞춤 견적',
    recommended: false,
    features: ['Pro 모든 기능 포함', '팀 계정 (다수 사용자)', '자사 수지 DB 등록', 'API 연동', '전담 기술 지원', '커스텀 AI 파인튜닝', 'SLA 보장'],
    notIncluded: [],
    btnText: '문의하기',
    btnHref: 'mailto:contact@molddoctor.ai',
  },
];

const faqs = [
  { q: '어떤 수지를 지원하나요?', a: '범용 플라스틱(PP, PE, ABS, PS, PVC, PMMA)부터 엔지니어링(PA6, PA66, PA46, PBT, PET, PC, POM), 슈퍼엔프라(PPS, LCP, PEEK, PEI, PPSU), 블렌드(PC/ABS, PC/PBT, PA/ABS), TPE/TPU까지 거의 모든 사출용 열가소성 수지를 커버합니다. 50종 이상 지원.' },
  { q: '진단 정확도는 어느 정도인가요?', a: 'Mold Doctor AI는 AI 보조 도구입니다. 10년 이상의 사출 엔지니어링 지식을 기반으로 하지만, 최종 판단과 조치는 현장 엔지니어가 해야 합니다. 진단 결과를 참고 자료로 활용하세요.' },
  { q: '모바일에서도 사용 가능한가요?', a: '네, 반응형 웹앱으로 스마트폰에서도 최적화되어 있습니다. 카메라로 불량 사진을 직접 촬영해서 업로드할 수 있습니다.' },
  { q: '우리 회사 수지 데이터를 학습시킬 수 있나요?', a: 'Enterprise 플랜에서 자사 수지 DB를 등록하여 맞춤형 진단이 가능합니다. 특수 Grade나 자체 배합 수지에 대한 커스텀 지원을 제공합니다.' },
  { q: 'API 키는 어디서 발급받나요?', a: 'Anthropic의 console.anthropic.com에서 Claude API 키를 발급받으실 수 있습니다. API 키를 .env.local 파일에 입력하면 바로 사용 가능합니다.' },
];

export default function PricingPage() {
  return (
    <div className="bg-[#07090F] min-h-screen px-4 sm:px-6 py-16">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 border border-[#00E887]/25 bg-[#00E887]/8 text-[#00E887] text-xs font-medium px-3.5 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#00E887] rounded-full" />
            간단하고 투명한 가격
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">현장에서 바로 쓰는 AI 진단 도구</h1>
          <p className="text-white/40 text-base">사출 엔지니어를 위한 트러블슈팅 AI</p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-4 mb-20">
          {plans.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-2xl overflow-hidden border transition-all ${
                plan.recommended
                  ? 'border-[#00E887]/40 bg-gradient-to-b from-[#00E887]/8 to-transparent shadow-[0_0_40px_rgba(0,232,135,0.08)] scale-[1.02]'
                  : 'border-white/8 bg-white/[0.025] hover:border-white/15'
              }`}>
              {plan.recommended && (
                <div className="text-center bg-[#00E887] text-black text-xs font-black py-1.5 tracking-wider">
                  ⭐ 추천 플랜
                </div>
              )}
              <div className={`px-6 ${plan.recommended ? 'pt-6 pb-5' : 'pt-7 pb-5'}`}>
                <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">{plan.name}</div>
                <div className={`text-3xl font-bold mb-1 ${plan.recommended ? 'text-[#00E887]' : 'text-white'}`}>
                  {plan.price}
                </div>
                <div className="text-xs text-white/25">{plan.priceDetail}</div>
              </div>

              <div className="px-6 pb-6">
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-white/70">
                      <span className="text-[#00E887] shrink-0 mt-0.5">✓</span>
                      {feat}
                    </li>
                  ))}
                  {plan.notIncluded.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-white/20">
                      <span className="shrink-0 mt-0.5">–</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link href={plan.btnHref}
                  className={`block w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.recommended
                      ? 'bg-[#00E887] text-black hover:bg-[#00E887]/90 shadow-[0_0_20px_rgba(0,232,135,0.2)]'
                      : 'border border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                  }`}>
                  {plan.btnText}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="text-xl font-bold text-white text-center mb-8">자주 묻는 질문</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/8 rounded-xl p-5">
                <h3 className="font-semibold text-white/80 text-sm mb-2">Q. {faq.q}</h3>
                <p className="text-white/35 text-sm leading-relaxed">A. {faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">지금 바로 무료로 시작하세요</h2>
          <p className="text-white/30 text-sm mb-6">신용카드 불필요 · Claude API 키만 있으면 즉시 사용 가능</p>
          <Link href="/diagnose"
            className="inline-block bg-[#00E887] text-black px-8 py-3.5 rounded-full font-bold text-sm hover:bg-[#00E887]/90 transition-all shadow-[0_0_30px_rgba(0,232,135,0.2)]">
            무료 진단 시작하기
          </Link>
        </div>

      </div>
    </div>
  );
}

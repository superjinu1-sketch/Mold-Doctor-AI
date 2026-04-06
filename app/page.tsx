import Link from 'next/link';

const defectTypes = [
  {
    ko: '미성형',
    en: 'Short Shot',
    desc: '충전 부족으로 제품이 완성되지 않음',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="2" y="8" width="24" height="20" rx="3" stroke="#DC2626" strokeWidth="2" fill="#FEE2E2"/>
        <path d="M26 16h6v4h-6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
        <path d="M2 18h16" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 2"/>
      </svg>
    ),
  },
  {
    ko: '플래시',
    en: 'Flash',
    desc: '파팅 라인에서 수지가 새어 나옴',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="8" width="28" height="20" rx="3" stroke="#D97706" strokeWidth="2" fill="#FEF3C7"/>
        <path d="M4 18h28" stroke="#D97706" strokeWidth="2.5"/>
        <path d="M8 18l-4-2M8 18l-4 2" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M28 18l4-2M28 18l4 2" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    ko: '싱크마크',
    en: 'Sink Mark',
    desc: '두꺼운 부위 표면이 함몰됨',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="8" width="28" height="20" rx="3" stroke="#7C3AED" strokeWidth="2" fill="#EDE9FE"/>
        <path d="M12 18 Q18 24 24 18" stroke="#7C3AED" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    ko: '웰드라인',
    en: 'Weld Line',
    desc: '수지 합류점에 선이 생김',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="8" width="28" height="20" rx="3" stroke="#0891B2" strokeWidth="2" fill="#E0F2FE"/>
        <path d="M18 8 L18 28" stroke="#0891B2" strokeWidth="2" strokeDasharray="3 2"/>
      </svg>
    ),
  },
  {
    ko: '버닝/가스마크',
    en: 'Burn Mark',
    desc: '공기 압축 발열로 탄 자국',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="8" width="28" height="20" rx="3" stroke="#DC2626" strokeWidth="2" fill="#FEE2E2"/>
        <path d="M24 14 Q28 18 24 22 Q22 19 24 17 Q20 21 18 24 Q16 20 18 16 Q14 20 14 23" stroke="#DC2626" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    ko: '은줄',
    en: 'Silver Streak',
    desc: '수분/가스로 인한 은색 줄무늬',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="8" width="28" height="20" rx="3" stroke="#475569" strokeWidth="2" fill="#F1F5F9"/>
        <path d="M10 13 L16 25" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
        <path d="M15 11 L21 27" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
        <path d="M20 13 L26 23" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white py-14 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#059669]/20 text-[#34D399] text-sm font-medium px-3 py-1 rounded-full mb-5">
              <span className="w-2 h-2 bg-[#34D399] rounded-full animate-pulse"></span>
              AI 기반 실시간 진단
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-5">
              사출 불량,{' '}
              <span className="text-[#34D399]">사진 한 장이면</span>{' '}
              원인을 찾아드립니다
            </h1>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              AI + 엔지니어링플라스틱 10년 경험. 셋팅값 입력하면 해결 조건까지.
              사출 10년차 엔지니어가 옆에 있는 것처럼.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/diagnose"
                className="bg-[#059669] hover:bg-[#047857] text-white px-8 py-4 rounded-xl font-bold text-lg text-center transition-colors shadow-lg"
              >
                무료로 진단해보기
              </Link>
              <Link
                href="/guide"
                className="border border-white/30 hover:bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg text-center transition-colors"
              >
                불량 가이드 보기
              </Link>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="relative">
              {/* Animation: defect photo -> diagnosis */}
              <div className="bg-white/10 rounded-2xl p-6 w-80">
                <div className="bg-slate-700 rounded-xl h-40 mb-4 flex items-center justify-center text-slate-400 text-sm">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    불량 사진 업로드
                  </div>
                </div>
                <div className="flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-[#34D399] animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="bg-[#059669]/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">불량</span>
                    <span className="text-white text-sm font-semibold">은줄 (Silver Streak)</span>
                  </div>
                  <p className="text-[#34D399] text-xs">원인: 수지 수분 과다</p>
                  <p className="text-slate-300 text-xs">해결: 건조온도 80℃ → 4시간 이상</p>
                  <p className="text-slate-300 text-xs">사출온도: 285℃ → 275℃ 권장</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Defect Types Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1E293B] mb-4">이런 불량, 겪어보셨죠?</h2>
            <p className="text-slate-500 text-lg">클릭하면 바로 진단 페이지로 이동합니다</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {defectTypes.map((d) => (
              <Link
                key={d.en}
                href={`/diagnose?defect=${encodeURIComponent(d.ko)}`}
                className="border border-slate-200 rounded-xl p-6 hover:border-[#059669] hover:shadow-lg transition-all group"
              >
                <div className="mb-4">{d.icon}</div>
                <h3 className="text-lg font-bold text-[#1E293B] group-hover:text-[#059669] transition-colors">
                  {d.ko} <span className="text-slate-400 font-normal text-sm">({d.en})</span>
                </h3>
                <p className="text-slate-500 text-sm mt-1">{d.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1E293B] text-center mb-12">작동 방식</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: '사진 촬영/업로드',
                desc: '불량 부위를 촬영하거나 기존 사진을 업로드하세요. 최대 5장까지 가능합니다.',
                color: 'bg-blue-50 text-blue-600',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                step: '2',
                title: '셋팅값 입력',
                desc: '수지 종류, 사출 온도, 압력, 속도 등 현재 성형 조건을 입력하세요.',
                color: 'bg-amber-50 text-amber-600',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                ),
              },
              {
                step: '3',
                title: 'AI 진단 + 해결책',
                desc: 'AI가 원인을 분석하고 현재 셋팅 vs 권장 셋팅을 비교하여 해결책을 제시합니다.',
                color: 'bg-green-50 text-green-600',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${item.color} mb-6`}>
                  {item.icon}
                </div>
                <div className="text-[#059669] font-bold text-sm mb-2">STEP {item.step}</div>
                <h3 className="text-xl font-bold text-[#1E293B] mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Users */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1E293B] text-center mb-12">이런 분들을 위해 만들었습니다</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                emoji: '🏭',
                title: '사출 엔지니어',
                desc: '경험이 부족해도 10년차처럼 트러블슈팅. 현장에서 바로 쓸 수 있는 실용적인 해결책.',
              },
              {
                emoji: '💼',
                title: '원재료 영업담당',
                desc: '고객 현장에서 바로 기술 지원. 불량 사진 한 장으로 즉각적인 솔루션 제공.',
              },
              {
                emoji: '🌏',
                title: '글로벌 업체 한국 담당',
                desc: '혼자서 영업+기술 다 커버. 소수 인원으로 효율적인 기술 지원 가능.',
              },
            ].map((user) => (
              <div key={user.title} className="bg-[#F8FAFC] rounded-xl p-8 border border-slate-200">
                <div className="text-5xl mb-4">{user.emoji}</div>
                <h3 className="text-xl font-bold text-[#1E293B] mb-3">{user.title}</h3>
                <p className="text-slate-500 leading-relaxed">{user.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-[#1E293B] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            지금 바로 진단해보세요.{' '}
            <span className="text-[#34D399]">무료입니다.</span>
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            API 키만 있으면 즉시 사용 가능. 불량 사진 + 셋팅값 → AI 진단 결과.
          </p>
          <Link
            href="/diagnose"
            className="inline-block bg-[#059669] hover:bg-[#047857] text-white px-10 py-4 rounded-xl font-bold text-xl transition-colors shadow-xl"
          >
            무료로 진단 시작하기
          </Link>
        </div>
      </section>
    </div>
  );
}

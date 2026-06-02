import Link from 'next/link';

const defects = [
  { ko: '미성형', en: 'Short Shot', desc: '충전 부족으로 제품이 완성되지 않음', color: 'from-red-500/20 to-red-600/5', dot: 'bg-red-400' },
  { ko: '플래시', en: 'Flash', desc: '파팅 라인에서 수지가 새어 나옴', color: 'from-amber-500/20 to-amber-600/5', dot: 'bg-amber-400' },
  { ko: '싱크마크', en: 'Sink Mark', desc: '두꺼운 부위 표면이 함몰됨', color: 'from-violet-500/20 to-violet-600/5', dot: 'bg-violet-400' },
  { ko: '웰드라인', en: 'Weld Line', desc: '수지 합류점에 선이 생김', color: 'from-cyan-500/20 to-cyan-600/5', dot: 'bg-cyan-400' },
  { ko: '버닝/가스마크', en: 'Burn Mark', desc: '공기 압축 발열로 탄 자국', color: 'from-orange-500/20 to-orange-600/5', dot: 'bg-orange-400' },
  { ko: '은줄', en: 'Silver Streak', desc: '수분/가스로 인한 은색 줄무늬', color: 'from-slate-400/20 to-slate-500/5', dot: 'bg-slate-300' },
];

export default function HomePage() {
  return (
    <div className="bg-[#07090F]">

      {/* Hero */}
      <section className="pt-20 pb-28 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#00E887]/4 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 left-1/4 w-64 h-64 bg-cyan-500/4 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 border border-[#00E887]/25 bg-[#00E887]/8 text-[#00E887] text-xs font-medium px-3.5 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-[#00E887] rounded-full animate-pulse" />
            AI 기반 실시간 진단
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6 text-white">
            사출 불량,
            <br />
            <span className="text-[#00E887]">사진 한 장이면</span>
            <br />
            원인을 찾아드립니다
          </h1>

          <p className="text-white/40 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            불량 사진과 셋팅값을 입력하면 AI가 원인과 해결책을 알려드립니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/diagnose"
              className="bg-[#00E887] text-black px-8 py-3.5 rounded-full font-bold text-base hover:bg-[#00E887]/90 transition-all shadow-[0_0_30px_rgba(0,232,135,0.3)] hover:shadow-[0_0_40px_rgba(0,232,135,0.4)]">
              무료로 진단해보기 →
            </Link>
            <Link href="/guide"
              className="border border-white/10 text-white/60 px-8 py-3.5 rounded-full font-medium text-base hover:bg-white/5 hover:text-white transition-all">
              불량 가이드 보기
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 flex flex-wrap justify-center gap-x-12 gap-y-4">
            {[['12종', '불량 유형'], ['50종+', '수지 지원'], ['10초', '진단 속도']].map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-bold text-white">{n}</div>
                <div className="text-xs text-white/25 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Defect Types */}
      <section className="pb-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">이런 불량, 겪어보셨죠?</h2>
            <p className="text-white/25 text-sm">클릭하면 바로 진단 페이지로 이동합니다</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {defects.map((d) => (
              <Link key={d.en} href={`/diagnose?defect=${encodeURIComponent(d.ko)}`}
                className={`group relative bg-gradient-to-br ${d.color} border border-white/5 rounded-2xl p-5 hover:border-white/15 transition-all hover:scale-[1.02]`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${d.dot}`} />
                  <span className="text-xs text-white/30 font-medium">{d.en}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">{d.ko}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{d.desc}</p>
                <span className="absolute top-4 right-4 text-white/10 group-hover:text-white/30 transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/[0.025] border border-white/5 rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-white mb-10 text-center">작동 방식</h2>
            <div className="grid md:grid-cols-3 gap-10">
              {[
                { n: '01', t: '사진 업로드', d: '불량 부위를 촬영하거나 기존 사진을 업로드하세요. 드래그앤드롭, 클립보드 붙여넣기 모두 지원.' },
                { n: '02', t: '셋팅값 입력', d: '수지 종류, 사출 온도, 압력, 속도 등 현재 성형 조건을 입력하세요.' },
                { n: '03', t: 'AI 진단', d: 'AI가 원인을 분석하고 현재 vs 권장 셋팅을 비교하여 해결책을 제시합니다.' },
              ].map((s) => (
                <div key={s.n}>
                  <div className="text-6xl font-black text-white/5 leading-none mb-4">{s.n}</div>
                  <div className="text-xs font-semibold text-[#00E887]/60 uppercase tracking-widest mb-2">STEP</div>
                  <h3 className="text-base font-bold text-white mb-2">{s.t}</h3>
                  <p className="text-white/30 text-sm leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-28 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            지금 바로 진단해보세요.{' '}
            <span className="text-[#00E887]">무료입니다.</span>
          </h2>
          <p className="text-white/30 text-sm mb-8">회원가입 없이 바로 사용 가능합니다.</p>
          <Link href="/diagnose"
            className="inline-block bg-[#00E887] text-black px-10 py-4 rounded-full font-bold text-base hover:bg-[#00E887]/90 transition-all shadow-[0_0_40px_rgba(0,232,135,0.2)]">
            무료로 진단 시작하기
          </Link>
        </div>
      </section>

    </div>
  );
}

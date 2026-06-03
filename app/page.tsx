'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';

const defects = [
  { koName: '미성형', en: 'Short Shot', descKo: '충전 부족으로 제품이 완성되지 않음', descEn: 'Incomplete fill — part not fully formed', color: 'from-red-500/20 to-red-600/5', dot: 'bg-red-400' },
  { koName: '플래시', en: 'Flash', descKo: '파팅 라인에서 수지가 새어 나옴', descEn: 'Resin bleeds past the parting line', color: 'from-amber-500/20 to-amber-600/5', dot: 'bg-amber-400' },
  { koName: '싱크마크', en: 'Sink Mark', descKo: '두꺼운 부위 표면이 함몰됨', descEn: 'Surface depressions at thick sections', color: 'from-violet-500/20 to-violet-600/5', dot: 'bg-violet-400' },
  { koName: '웰드라인', en: 'Weld Line', descKo: '수지 합류점에 선이 생김', descEn: 'Line forms at the melt-front junction', color: 'from-cyan-500/20 to-cyan-600/5', dot: 'bg-cyan-400' },
  { koName: '버닝/가스마크', en: 'Burn Mark', descKo: '공기 압축 발열로 탄 자국', descEn: 'Char marks from compressed-air combustion', color: 'from-orange-500/20 to-orange-600/5', dot: 'bg-orange-400' },
  { koName: '은줄', en: 'Silver Streak', descKo: '수분/가스로 인한 은색 줄무늬', descEn: 'Silver lines from moisture or gas', color: 'from-slate-400/20 to-slate-500/5', dot: 'bg-slate-300' },
];

export default function HomePage() {
  const { t, locale } = useLocale();

  const steps = [
    { n: '01', t: t('landing.step1_t'), d: t('landing.step1_d') },
    { n: '02', t: t('landing.step2_t'), d: t('landing.step2_d') },
    { n: '03', t: t('landing.step3_t'), d: t('landing.step3_d') },
  ];

  const stats = [
    { n: t('landing.stat_1'), l: t('landing.stat_1_label') },
    { n: t('landing.stat_2'), l: t('landing.stat_2_label') },
    { n: t('landing.stat_3'), l: t('landing.stat_3_label') },
  ];

  return (
    <div className="bg-[#07090F]">

      {/* Hero */}
      <section className="pt-20 pb-28 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#00E887]/4 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 left-1/4 w-64 h-64 bg-cyan-500/4 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 border border-[#00E887]/25 bg-[#00E887]/8 text-[#00E887] text-xs font-medium px-3.5 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-[#00E887] rounded-full animate-pulse" />
            {t('landing.hero_badge')}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6 text-white">
            {t('landing.hero_h1_1')}
            <br />
            <span className="text-[#00E887]">{t('landing.hero_h1_2')}</span>
            <br />
            {t('landing.hero_h1_3')}
          </h1>

          <p className="text-white/40 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('landing.hero_sub')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/diagnose"
              className="bg-[#00E887] text-black px-8 py-3.5 rounded-full font-bold text-base hover:bg-[#00E887]/90 transition-all shadow-[0_0_30px_rgba(0,232,135,0.3)] hover:shadow-[0_0_40px_rgba(0,232,135,0.4)]">
              {t('landing.cta_primary')}
            </Link>
            <Link href="/guide"
              className="border border-white/10 text-white/60 px-8 py-3.5 rounded-full font-medium text-base hover:bg-white/5 hover:text-white transition-all">
              {t('landing.cta_secondary')}
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 flex flex-wrap justify-center gap-x-12 gap-y-4">
            {stats.map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-2xl font-bold text-white">{s.n}</div>
                <div className="text-xs text-white/25 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Defect Types */}
      <section className="pb-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{t('landing.defects_h2')}</h2>
            <p className="text-white/25 text-sm">{t('landing.defects_sub')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {defects.map((d) => (
              <Link key={d.en} href={`/diagnose?defect=${encodeURIComponent(d.koName)}`}
                className={`group relative bg-gradient-to-br ${d.color} border border-white/5 rounded-2xl p-5 hover:border-white/15 transition-all hover:scale-[1.02]`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${d.dot}`} />
                  <span className="text-xs text-white/30 font-medium">{d.en}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  {locale === 'en' ? d.en : d.koName}
                </h3>
                <p className="text-white/40 text-xs leading-relaxed">
                  {locale === 'en' ? d.descEn : d.descKo}
                </p>
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
            <h2 className="text-2xl font-bold text-white mb-10 text-center">{t('landing.how_h2')}</h2>
            <div className="grid md:grid-cols-3 gap-10">
              {steps.map((s) => (
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
            {t('landing.cta_h2_1')}{' '}
            <span className="text-[#00E887]">{t('landing.cta_h2_2')}</span>
          </h2>
          <p className="text-white/30 text-sm mb-8">{t('landing.cta_sub')}</p>
          <Link href="/diagnose"
            className="inline-block bg-[#00E887] text-black px-10 py-4 rounded-full font-bold text-base hover:bg-[#00E887]/90 transition-all shadow-[0_0_40px_rgba(0,232,135,0.2)]">
            {t('landing.cta_btn')}
          </Link>
        </div>
      </section>

    </div>
  );
}

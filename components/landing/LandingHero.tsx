'use client';

// 웹 로그아웃 랜딩 히어로(video-hero-web-v1, homepage-revamp-web-v1 후속) — 정적 "추정 결과" 카드를
// 사출기 가동 영상으로 교체. 제품 증거(현재/권장 셋팅표)는 다크 Output 타일이 대신 담당한다
// (LandingOutputTile.tsx, 이 mandate에서 무변경).
// 카피는 v2 후속수정으로 KO/EN 둘 다 번역됨(landing.web_* — ko.ts/en.ts 각자 로케일).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { isNativeApp } from '@/lib/platform';
import StoreBadges from '@/components/StoreBadges';

export default function LandingHero() {
  const { t, locale } = useLocale();
  // showVideo = 데스크톱 && no-reduced-motion && !native. JS로 소스 마운트 자체를 막아야
  // (CSS display:none만으론 <source> 다운로드가 이미 시작된다) reduced-motion/모바일에서 영상을
  // 아예 안 받는다. 이중 가드(§게이팅 1) — 이 랜딩 자체가 이미 HomeClient에서 웹+로그아웃 전용이라
  // native에선 이 컴포넌트가 마운트조차 안 되지만, 재사용 대비 isNativeApp()도 명시적으로 체크.
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    if (isNativeApp()) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia('(min-width: 835px)').matches;
    setShowVideo(!reducedMotion && isDesktop);
  }, []);

  return (
    <section
      className="relative overflow-hidden flex items-center bg-canvas"
      style={{ minHeight: 'calc(100dvh - 56px)', fontFamily: 'var(--font-landing)' }}
    >
      {!isNativeApp() && showVideo && (
        <video
          className="absolute top-0 h-full object-cover"
          style={{ right: '-2%', width: '66%', objectPosition: '52% 48%' }}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/machine-poster.jpg"
          aria-hidden="true"
        >
          <source src="/media/machine-web.webm" type="video/webm" />
          <source src="/media/machine-web.mp4" type="video/mp4" />
        </video>
      )}
      {!showVideo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="absolute top-0 h-full object-cover"
          style={{ right: '-2%', width: '66%', objectPosition: '52% 48%' }}
          src="/media/machine-poster.jpg"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
        />
      )}
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'var(--hero-scrim)' }} />

      <div className="relative z-[2] w-full max-w-[1120px] mx-auto px-[22px]">
        <div className="max-w-[600px]">
          <p className="text-[19px] font-semibold text-brand mb-1.5 tracking-[-.02em]">{t('landing.web_eyebrow')}</p>
          <h1 className="font-semibold tracking-[-.03em] text-ink" style={{ fontSize: 'clamp(2rem,7vw,3.5rem)', lineHeight: 1.07 }}>
            {t('landing.web_h1_1')}<br />{t('landing.web_h1_2')}
          </h1>
          <p className="font-normal text-muted mt-4" style={{ fontSize: '19px', lineHeight: 1.3, letterSpacing: '-.014em', maxWidth: '34ch' }}>
            {t('landing.web_tagline')}
          </p>

          <div className="flex gap-3 mt-6 flex-wrap">
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
            <StoreBadges variant="inline" locale={locale} />
          </div>
          <p className="text-[13px] text-faint mt-3.5">{t('landing.web_fineprint')}</p>
        </div>
      </div>
    </section>
  );
}

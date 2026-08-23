'use client';

// 웹 로그아웃 랜딩 히어로(video-hero-web-v1, homepage-revamp-web-v1 후속) — 정적 "추정 결과" 카드를
// 사출기 가동 영상으로 교체. 제품 증거(현재/권장 셋팅표)는 다크 Output 타일이 대신 담당한다
// (LandingOutputTile.tsx, 이 mandate에서 무변경).
// 카피는 v2 후속수정으로 KO/EN 둘 다 번역됨(landing.web_* — ko.ts/en.ts 각자 로케일).
// 모바일 리플로우(hero-mobile-reflow-web-v1, 라이브 버그 수정) — <835px에선 미디어가 오버레이가
// 아니라 카피 아래 독립 배너로 흐른다(겹침·스크림 반대방향 가독 문제 해결). ≥835px(기존 video
// 게이트와 동일 BP)는 카피 좌 + 영상 우 + 스크림, 현행 그대로.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { isNativeApp } from '@/lib/platform';
import StoreBadges from '@/components/StoreBadges';

export default function LandingHero() {
  const { t, locale } = useLocale();
  // showVideo = no-reduced-motion && !native — 모바일도 이제 모션 재생(데스크톱 전용 게이트 제거).
  // JS로 소스 마운트 자체를 막아야(CSS display:none만으론 <source> 다운로드가 이미 시작된다)
  // reduced-motion에서 영상을 아예 안 받는다. isNativeApp()은 이중 가드(§게이팅) — 이 랜딩 자체가
  // 이미 HomeClient에서 웹+로그아웃 전용이라 native에선 마운트조차 안 되지만 재사용 대비 명시 체크.
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    if (isNativeApp()) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setShowVideo(!reducedMotion);
  }, []);

  // 모바일: section-level 형제(카피 래퍼와 동일 좌우 인셋을 margin으로 직접 재현 — 카피 래퍼 안에
  // 중첩하면 데스크톱에서 absolute의 containing block이 1120px 컬럼으로 좁아져 풀블리드가 깨진다).
  // 데스크톱(min-[835px]): absolute 오버레이로 복귀 = 기존 video-hero-web-v1 그대로(섹션이 relative
  // 이므로 containing block은 섹션 전체 = 뷰포트 풀블리드).
  const mediaClassName =
    'relative aspect-[16/10] rounded-[18px] overflow-hidden mt-6 mx-[22px] w-[calc(100%-44px)] object-cover shadow-[inset_0_0_22px_6px_var(--canvas)] ' +
    'min-[835px]:absolute min-[835px]:top-0 min-[835px]:right-[-2%] min-[835px]:left-auto min-[835px]:w-[66%] min-[835px]:h-full min-[835px]:aspect-auto min-[835px]:rounded-none min-[835px]:mt-0 min-[835px]:mx-0 min-[835px]:shadow-none';

  return (
    <section
      className="relative overflow-hidden bg-canvas py-14 min-[835px]:py-0 min-[835px]:flex min-[835px]:items-center min-[835px]:min-h-[calc(100dvh-56px)]"
      style={{ fontFamily: 'var(--font-landing)' }}
    >
      <div className="relative z-[2] w-full max-w-[1120px] mx-auto px-[22px]">
        <div className="max-w-[600px]">
          <p className="text-[19px] font-semibold text-brand mb-1.5 tracking-[-.02em]">{t('landing.web_eyebrow')}</p>
          <h1 className="font-semibold tracking-[-.03em] text-ink" style={{ fontSize: 'clamp(2rem,7vw,3.5rem)', lineHeight: 1.07 }}>
            {t('landing.web_h1_1')}<br />{t('landing.web_h1_2')}
          </h1>
          <p className="font-normal text-muted mt-4" style={{ fontSize: '19px', lineHeight: 1.3, letterSpacing: '-.014em', maxWidth: '34ch' }}>
            {t('landing.web_tagline')}
          </p>

          <div className="flex flex-col min-[835px]:flex-row gap-3 mt-6">
            <Link
              href="/diagnose"
              className="inline-flex items-center justify-center gap-1.5 text-[17px] font-normal tracking-[-.02em] rounded-full py-2.5 px-5 min-h-[44px] w-full min-[835px]:w-auto bg-brand text-on-brand hover:bg-brand-ink transition-colors active:scale-[.96]"
            >
              {t('landing.web_cta_primary')}
            </Link>
            <Link
              href={locale === 'en' ? '/en/guide' : '/guide'}
              className="inline-flex items-center justify-center gap-1.5 text-[17px] font-normal tracking-[-.02em] rounded-full py-2.5 px-5 min-h-[44px] w-full min-[835px]:w-auto bg-transparent text-brand border border-brand hover:bg-brand-tint transition-colors active:scale-[.96]"
            >
              {t('landing.web_cta_secondary')}
            </Link>
          </div>

          <div className="mt-5">
            <p className="text-[13px] font-semibold text-muted mb-2">{t('landing.web_getapp')}</p>
            <StoreBadges variant="badges" locale={locale} />
          </div>
          <p className="text-[13px] text-faint mt-3.5">{t('landing.web_fineprint')}</p>
        </div>
      </div>

      {/* 미디어 — 모바일: 카피 다음 인플로우 배너(section 직계 형제라 좌우 22px을 margin으로 직접 재현).
          데스크톱: absolute 풀블리드(섹션이 containing block). DOM은 카피 다음이라 모바일 흐름 순서 = 카피→미디어. */}
      {!isNativeApp() && showVideo && (
        <video
          className={mediaClassName}
          style={{ objectPosition: '52% 48%' }}
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
          className={mediaClassName}
          style={{ objectPosition: '52% 48%' }}
          src="/media/machine-poster.jpg"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
        />
      )}

      {/* 스크림 — 데스크톱 오버레이 전용(카피가 영상 위에 얹힐 때만 필요). 모바일은 독립 배너라 불필요. */}
      <div
        className="hidden min-[835px]:block absolute inset-0 z-[1] pointer-events-none"
        style={{ background: 'var(--hero-scrim)' }}
      />
    </section>
  );
}

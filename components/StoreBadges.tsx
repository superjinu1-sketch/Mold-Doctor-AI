'use client';

import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/platform';
import { useLocale } from '@/contexts/LocaleContext';
import { IconDownload } from '@/components/icons';

// 스토어 배지(store-badges-v1) — ASO P2: 랜딩에 앱 설치 경로가 전혀 없던 문제 해소.
// 공식 배지 SVG/PNG 자산은 이 세션에서 확보 불가(외부 다운로드 불가 + 상표 가이드라인상
// 공식 배지 생성기 경유 없이 임의 재현은 리스크) — 기존 디자인 토큰 기반 텍스트 버튼으로 대체
// (mandate §3 명시 대체안). 아이콘도 Apple/Google 로고 대신 범용 다운로드 화살표 사용.
const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.jinsimlabs.molddoctor';
const APP_STORE_ID = '6793057343';

export default function StoreBadges({ variant }: { variant: 'hero' | 'footer' }) {
  const { locale } = useLocale();
  // 네이티브 게이팅(§2, pricing-native-gate-v1 선례) — 정적 export 프리렌더 시점엔 네이티브
  // 브릿지가 없어 native=false로 시작하고 마운트 후 재평가로 흡수(웹은 항상 false 유지).
  // native === true면 이 컴포넌트는 null을 반환해 DOM 자체를 만들지 않는다(display:none 아님) —
  // iOS 앱 안에 Google Play 배지가 뜨면 심사 리젝 사유가 될 수 있어 조건부 렌더로 완전히 제거한다.
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  if (native) return null;

  const appStoreRegion = locale === 'en' ? 'us' : 'kr';
  const appStoreUrl = `https://apps.apple.com/${appStoreRegion}/app/id${APP_STORE_ID}`;
  const appStoreLabel = locale === 'en' ? 'Download Mold Doctor on the App Store' : 'App Store에서 몰드닥터 다운로드';
  const playLabel = locale === 'en' ? 'Get Mold Doctor on Google Play' : 'Google Play에서 몰드닥터 다운로드';

  if (variant === 'hero') {
    return (
      <div className="flex gap-2 mt-3">
        <a
          href={appStoreUrl}
          aria-label={appStoreLabel}
          className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg border-2 border-[var(--on-brand)] text-on-brand hover:bg-brand-ink text-sm font-semibold transition-colors"
        >
          <IconDownload size={16} />
          App Store
        </a>
        <a
          href={PLAY_URL}
          aria-label={playLabel}
          className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg border-2 border-[var(--on-brand)] text-on-brand hover:bg-brand-ink text-sm font-semibold transition-colors"
        >
          <IconDownload size={16} />
          Google Play
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <a href={appStoreUrl} aria-label={appStoreLabel} className="flex items-center gap-1 text-faint hover:text-muted text-xs transition-colors min-h-[44px]">
        <IconDownload size={14} />
        App Store
      </a>
      <a href={PLAY_URL} aria-label={playLabel} className="flex items-center gap-1 text-faint hover:text-muted text-xs transition-colors min-h-[44px]">
        <IconDownload size={14} />
        Google Play
      </a>
    </div>
  );
}

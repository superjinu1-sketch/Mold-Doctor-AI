'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ko } from '@/messages/ko';
import { en } from '@/messages/en';
import { initClientObservability } from '@/lib/observability/client';

export type Locale = 'ko' | 'en';

const MESSAGES: Record<Locale, Record<string, string>> = { ko, en };
const LS_KEY = 'molddoctor_locale';

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleCtx>({
  locale: 'ko',
  setLocale: () => {},
  t: (k) => k,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko');
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY) as Locale | null;
      if (stored === 'en' || stored === 'ko') {
        setLocaleState(stored); // 저장값 존재 — 사용자 선택 존중(기기 언어 감지 건너뜀)
      } else {
        // 저장값 없음(첫 실행) — 기기 언어 감지. 결과는 저장하지 않음(다음 실행 때 재감지되어 OS 언어 변경 추종).
        const deviceLang = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
        setLocaleState(deviceLang.startsWith('ko') ? 'ko' : 'en');
      }
    } catch {
      setLocaleState('ko'); // 감지 실패(SSR/privacy mode 등) 시 폴백
    }
    initClientObservability();
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(LS_KEY, l); } catch {}
  };

  // <html lang> 클라 동기화(en-locale-leftover-fixes-v1 Fix A) — URL이 고정인 비-/en/* 페이지(예:
  // /diagnose)에서 클라 로케일 토글에 따라 <html lang>을 동기화한다. SSR 초기값(ko)은 그대로 둔다
  // — 크롤 기본값 유지, 클라 토글 시점에만 갱신이라 SEO 회귀 없음.
  // /en/*·/ja/* 라우트는 URL 자체가 해당 언어 콘텐츠라 layout.tsx 인라인 스크립트가 이미
  // lang='en'/'ja'를 박아둔다(ja는 ja-notes-axis-v1) — 로케일 토글 상태(예: 사용자가 그 페이지를
  // 보며 토글은 ko로 둔 경우)로 이걸 덮어써 회귀시키지 않는다.
  useEffect(() => {
    if (pathname?.startsWith('/en') || pathname?.startsWith('/ja')) return;
    document.documentElement.lang = locale;
  }, [locale, pathname]);

  const t = (key: string): string =>
    MESSAGES[locale][key] ?? MESSAGES['ko'][key] ?? key;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);

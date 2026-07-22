'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  const t = (key: string): string =>
    MESSAGES[locale][key] ?? MESSAGES['ko'][key] ?? key;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);

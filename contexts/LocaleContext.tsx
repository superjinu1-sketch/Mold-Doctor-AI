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
      if (stored === 'en' || stored === 'ko') setLocaleState(stored);
    } catch { /* SSR / privacy mode */ }
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

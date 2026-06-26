'use client';
import LegalDoc from './LegalDoc';
import { useLocale } from '@/contexts/LocaleContext';

export default function LegalDocLocalized({
  ko, en, updated,
}: { ko: string; en: string; updated?: string }) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  return <LegalDoc md={isEn ? en : ko} updated={updated} locale={locale} />;
}

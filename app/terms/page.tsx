import LegalDocLocalized from '@/components/LegalDocLocalized';
import { TERMS_MD, TERMS_MD_EN, TERMS_UPDATED } from '@/lib/legal/content';

export const metadata = { title: '이용약관 / Terms of Service — Mold Doctor AI' };

export default function TermsPage() {
  return <LegalDocLocalized ko={TERMS_MD} en={TERMS_MD_EN} updated={TERMS_UPDATED} />;
}

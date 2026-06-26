import LegalDoc from '@/components/LegalDoc';
import { TERMS_MD, TERMS_UPDATED } from '@/lib/legal/content';

export const metadata = { title: '이용약관 — Mold Doctor AI' };

export default function TermsPage() {
  return <LegalDoc md={TERMS_MD} updated={TERMS_UPDATED} />;
}

import LegalDocLocalized from '@/components/LegalDocLocalized';
import { TERMS_MD, TERMS_MD_EN, TERMS_UPDATED } from '@/lib/legal/content';
import { SITE_URL } from '@/lib/siteUrl';

export const metadata = {
  title: '이용약관 / Terms of Service — Mold Doctor AI',
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return <LegalDocLocalized ko={TERMS_MD} en={TERMS_MD_EN} updated={TERMS_UPDATED} />;
}

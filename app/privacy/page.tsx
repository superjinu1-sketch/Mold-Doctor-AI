import LegalDocLocalized from '@/components/LegalDocLocalized';
import { PRIVACY_MD, PRIVACY_MD_EN, PRIVACY_UPDATED } from '@/lib/legal/content';
import { SITE_URL } from '@/lib/siteUrl';

export const metadata = {
  title: '개인정보처리방침 / Privacy Policy — Mold Doctor AI',
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return <LegalDocLocalized ko={PRIVACY_MD} en={PRIVACY_MD_EN} updated={PRIVACY_UPDATED} />;
}

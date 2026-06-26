import LegalDocLocalized from '@/components/LegalDocLocalized';
import { PRIVACY_MD, PRIVACY_MD_EN, PRIVACY_UPDATED } from '@/lib/legal/content';

export const metadata = { title: '개인정보처리방침 / Privacy Policy — Mold Doctor AI' };

export default function PrivacyPage() {
  return <LegalDocLocalized ko={PRIVACY_MD} en={PRIVACY_MD_EN} updated={PRIVACY_UPDATED} />;
}

import LegalDoc from '@/components/LegalDoc';
import { PRIVACY_MD, PRIVACY_UPDATED } from '@/lib/legal/content';

export const metadata = { title: '개인정보처리방침 — Mold Doctor AI' };

export default function PrivacyPage() {
  return <LegalDoc md={PRIVACY_MD} updated={PRIVACY_UPDATED} />;
}

import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteUrl';
import HomeClient from '@/components/HomeClient';

// Capacitor 정적 export(output:'export') 호환 — app/guide/page.tsx 선례와 동일.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  alternates: {
    canonical: `${SITE_URL}/`,
  },
};

export default function HomePage() {
  return <HomeClient />;
}

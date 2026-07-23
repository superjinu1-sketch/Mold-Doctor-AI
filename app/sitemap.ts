import type { MetadataRoute } from 'next';
import { getAllResinSlugs } from '@/lib/resinSlug';

// Capacitor 정적 export(output:'export') 호환 — 명시하지 않으면 빌드 실패.
export const dynamic = 'force-static';

const SITE_URL = 'https://mold-doctor-ai.vercel.app';

// 인증 필요 페이지(/diagnose, /account, /history, /ledger, /auth/callback)는 의도적으로 제외.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const slugs = getAllResinSlugs();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/resins`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/en/resins`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
  ];

  const resinEntries: MetadataRoute.Sitemap = slugs.flatMap(slug => [
    { url: `${SITE_URL}/resins/${slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${SITE_URL}/en/resins/${slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
  ]);

  return [...staticEntries, ...resinEntries];
}

import type { MetadataRoute } from 'next';

// Capacitor 정적 export(output:'export') 호환 — 명시하지 않으면 빌드 실패.
export const dynamic = 'force-static';

const SITE_URL = 'https://mold-doctor-ai.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

import type { MetadataRoute } from 'next';
import { getAllResinSlugs } from '@/lib/resinSlug';
import { defects } from '@/lib/defectGuide';
import { NOTES } from '@/lib/notes';
import { NOTES_KO } from '@/lib/notesKo';
import { NOTES_JA } from '@/lib/notesJa';
import { SITE_URL } from '@/lib/siteUrl';

// Capacitor 정적 export(output:'export') 호환 — 명시하지 않으면 빌드 실패.
export const dynamic = 'force-static';

// 인증 필요 페이지(/diagnose, /account, /history, /ledger, /auth/callback)는 의도적으로 제외.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const slugs = getAllResinSlugs();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/tools`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/en/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/en/about`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/notes`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/en/notes`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/ja/notes`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
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

  // 불량 가이드 12종 상세 — 검색 볼륨이 수지 상세보다 커서 priority를 0.7보다 높게(0.8) 설정.
  const guideEntries: MetadataRoute.Sitemap = defects.flatMap(d => [
    { url: `${SITE_URL}/guide/${d.id}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${SITE_URL}/en/guide/${d.id}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
  ]);

  // 한국어 콘텐츠 축(/notes 기본). NOTES_KO 기준(실제 KO 콘텐츠 있는 slug만). slug는 en과 공유.
  const noteEntriesKo: MetadataRoute.Sitemap = NOTES_KO.map(n => (
    { url: `${SITE_URL}/notes/${n.slug}`, lastModified: new Date(n.publishedAt), changeFrequency: 'monthly' as const, priority: 0.7 }
  ));

  // 영문 콘텐츠 축(/en/notes). slug는 ko/ja와 공유. 노트는 KO(/notes 기본)·EN(/en/notes)·JA(/ja/notes) 3축.
  const noteEntries: MetadataRoute.Sitemap = NOTES.map(n => (
    { url: `${SITE_URL}/en/notes/${n.slug}`, lastModified: new Date(n.publishedAt), changeFrequency: 'monthly' as const, priority: 0.6 }
  ));

  // 일본어 콘텐츠 축(/ja/notes, ja-notes-axis-v1) — slug는 en과 공유.
  const noteEntriesJa: MetadataRoute.Sitemap = NOTES_JA.map(n => (
    { url: `${SITE_URL}/ja/notes/${n.slug}`, lastModified: new Date(n.publishedAt), changeFrequency: 'monthly' as const, priority: 0.6 }
  ));

  return [...staticEntries, ...resinEntries, ...guideEntries, ...noteEntriesKo, ...noteEntries, ...noteEntriesJa];
}

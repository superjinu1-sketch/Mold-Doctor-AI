// /guide/[slug](ko)·/en/guide/[slug](en) 페이지 전용 title/description/JSON-LD 생성기.
// lib/defectGuide.ts(GuideDefect)를 단일 소스로 삼는다 — 콘텐츠 텍스트 자체는 그대로, 조합만 한다.
import { type GuideDefect, DEFECT_KEY_TO_GUIDE_ID } from '@/lib/defectGuide';
import { RESIN_KB, type DefectKey } from '@/lib/resin-kb';
import { slugifyResinKey } from '@/lib/resinSlug';
import { SITE_URL } from '@/lib/siteUrl';

export type Locale = 'ko' | 'en';

// 코워크가 검색어 형태에 맞춰 확정한 문안 — 임의 변경 금지.
const EN_TITLE: Record<string, string> = {
  'short-shot': 'Short Shot in Injection Molding: Causes and Fixes | Mold Doctor',
  'flash': 'Flash in Injection Molding: Causes and How to Fix | Mold Doctor',
  'sink-mark': 'Sink Marks in Injection Molding: Causes and Solutions | Mold Doctor',
  'weld-line': 'Weld Lines in Injection Molding: Causes and Fixes | Mold Doctor',
  'burn-mark': 'Burn Marks in Injection Molding: Causes and Fixes | Mold Doctor',
  'silver-streak': 'Silver Streaks in Injection Molding: Causes and Fixes | Mold Doctor',
  'discoloration': 'Discoloration in Injection Molding: Causes and Fixes | Mold Doctor',
  'crack': 'Cracking in Injection Molded Parts: Causes and Fixes | Mold Doctor',
  'warpage': 'Warpage in Injection Molding: Causes and How to Prevent It | Mold Doctor',
  'void': 'Voids in Injection Molding: Causes and Fixes | Mold Doctor',
  'jetting': 'Jetting in Injection Molding: Causes and Fixes | Mold Doctor',
  'surface-roughness': 'Surface Defects in Injection Molding: Causes and Fixes | Mold Doctor',
  'black-specks': 'Black Specks in Injection Molding: Causes and Fixes | Mold Doctor',
  'stringing': 'Stringing and Drooling in Injection Molding: Causes and Fixes | Mold Doctor',
  'gate-blush': 'Gate Blush in Injection Molding: Causes and Fixes | Mold Doctor',
  'delamination': 'Delamination in Injection Molding: Causes and Fixes | Mold Doctor',
  'flow-mark': 'Flow Marks in Injection Molding: Causes and Fixes | Mold Doctor',
  'tiger-stripe': 'Tiger Stripes in Injection Molding: Causes and Fixes | Mold Doctor',
};

// 메타 description 전용 가공 — 원인 문구 끝의 괄호 부연설명만 제거(예: "(high viscosity)").
// lib/defectGuide.ts의 causesEn/causesKo 원본 배열은 그대로 유지, 이 함수 밖으로 나가지 않음.
function stripParen(s: string): string {
  return s.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export function buildGuideTitle(defect: GuideDefect, locale: Locale): string {
  if (locale === 'en') return EN_TITLE[defect.id] ?? `${defect.nameEn} in Injection Molding | Mold Doctor`;
  return `${defect.nameKo} 원인과 해결 방법 | 몰드닥터`;
}

export function buildGuideDescription(defect: GuideDefect, locale: Locale): string {
  if (locale === 'en') {
    const c1 = stripParen(defect.causesEn[0] ?? '');
    const c2 = stripParen(defect.causesEn[1] ?? '');
    return `${defect.descriptionEn} Common causes: ${c1}, ${c2}.`;
  }
  const c1 = stripParen(defect.causesKo[0] ?? '');
  const c2 = stripParen(defect.causesKo[1] ?? '');
  return `${defect.descriptionKo} 주요 원인: ${c1}, ${c2}.`;
}

// guide id → 그 불량을 commonDefects에 포함한 KB 수지 목록(계열 무관, 최대 6개).
// app/guide/page.tsx에 있던 동일 로직을 이전(무변경) — lib/resin-kb.ts를 단일 소스로 매 렌더 계산.
export function getRelatedResinsForGuide(guideId: string): { key: string; slug: string }[] {
  const defectKey = (Object.entries(DEFECT_KEY_TO_GUIDE_ID) as [DefectKey, string][])
    .find(([, gid]) => gid === guideId)?.[0];
  if (!defectKey) return [];
  return Object.keys(RESIN_KB)
    .filter(key => RESIN_KB[key].commonDefects.includes(defectKey))
    .slice(0, 6)
    .map(key => ({ key, slug: slugifyResinKey(key) }));
}

export function buildGuideJsonLd(defect: GuideDefect, locale: Locale, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: buildGuideTitle(defect, locale),
    description: buildGuideDescription(defect, locale),
    inLanguage: locale,
    url,
    about: { '@type': 'Thing', name: locale === 'en' ? defect.nameEn : defect.nameKo },
    publisher: { '@type': 'Organization', name: 'Mold Doctor AI', url: SITE_URL },
  };
}

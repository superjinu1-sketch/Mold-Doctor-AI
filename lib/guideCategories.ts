// 가이드 리스트 재설계(guide-redesign-web-v1) — 24종 defects를 5계열로 그룹핑하는 매핑.
// 이름·slug 자체는 lib/defectGuide.ts(defects)가 단일 소스 — 여기선 그룹핑만 추가한다(하드코딩 금지).
// 판단 애매 2건(진우 확인 대상): stringing(실끌림, 노즐 드룰=온도/디컴프)→열계 배치,
// color-streaks(색줄, 안료 분산)→오염계 배치. 다른 계열이 맞으면 이 파일의 slugs만 옮기면 된다.
import { defects } from './defectGuide';

export type GuideCategoryId =
  | 'fill-pack'
  | 'surface-flow'
  | 'heat-gas-contamination'
  | 'strength-structure'
  | 'mold-ejection-dimension';

export interface GuideCategory {
  id: GuideCategoryId;
  labelEn: string;   // eyebrow(항상 영문 라벨, KO/EN 페이지 공통)
  titleKo: string;
  titleEn: string;
  slugs: string[];
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: 'fill-pack',
    labelEn: 'Fill & Pack',
    titleKo: '충전·보압계',
    titleEn: 'Fill & Pack',
    slugs: ['short-shot', 'flash', 'sink-mark', 'void'],
  },
  {
    id: 'surface-flow',
    labelEn: 'Surface & Flow',
    titleKo: '표면·흐름 외관계',
    titleEn: 'Surface & Flow',
    slugs: ['weld-line', 'jetting', 'flow-mark', 'tiger-stripe', 'gate-blush', 'surface-roughness'],
  },
  {
    id: 'heat-gas-contamination',
    labelEn: 'Heat · Gas · Contamination',
    titleKo: '열·가스·오염계',
    titleEn: 'Heat · Gas · Contamination',
    slugs: ['burn-mark', 'silver-streak', 'discoloration', 'black-specks', 'color-streaks', 'stringing'],
  },
  {
    id: 'strength-structure',
    labelEn: 'Strength & Structure',
    titleKo: '강도·구조계',
    titleEn: 'Strength & Structure',
    slugs: ['crack', 'warpage', 'delamination', 'brittleness'],
  },
  {
    id: 'mold-ejection-dimension',
    labelEn: 'Mold · Ejection · Dimension',
    titleKo: '금형·이형·치수계',
    titleEn: 'Mold · Ejection · Dimension',
    slugs: ['ejector-marks', 'mold-deposit', 'sticking', 'dimensional-instability'],
  },
];

// 빌드시 불변식 검증(mandate 명시 "누락·중복 0, 빌드시 assert 권장") — 모듈 로드 시 즉시 throw해
// next build를 실패시킨다. 데이터가 드리프트(신규 가이드 추가·slug 변경)하면 조용히 새지 않고 바로 잡힌다.
(function validateGuideCategories() {
  const allSlugs = GUIDE_CATEGORIES.flatMap(c => c.slugs);
  const seen = new Set<string>();
  for (const slug of allSlugs) {
    if (seen.has(slug)) throw new Error(`[guideCategories] duplicate slug in mapping: ${slug}`);
    seen.add(slug);
  }
  const defectIds = new Set(defects.map(d => d.id));
  const unknown = allSlugs.filter(s => !defectIds.has(s));
  if (unknown.length) throw new Error(`[guideCategories] slugs not found in defects: ${unknown.join(', ')}`);
  const uncategorized = defects.map(d => d.id).filter(id => !seen.has(id));
  if (uncategorized.length) throw new Error(`[guideCategories] defects missing from category mapping: ${uncategorized.join(', ')}`);
})();

export const GUIDE_TOTAL_COUNT = GUIDE_CATEGORIES.reduce((sum, c) => sum + c.slugs.length, 0);

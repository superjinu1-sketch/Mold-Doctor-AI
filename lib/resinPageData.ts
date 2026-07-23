// /resins 라우트(목록·상세, ko/en) 공용 데이터 조립. RESIN_KB(단일 소스)에서 파생만 한다.
import { RESIN_KB } from '@/lib/resin-kb';
import { slugifyResinKey, getResinKeyBySlug } from '@/lib/resinSlug';
import { getResinDisplayName, type Locale } from '@/lib/resinDisplay';
import type { ResinListItem } from '@/components/resins/ResinListView';

export function getAllResinListItems(locale: Locale): ResinListItem[] {
  return Object.keys(RESIN_KB).map(key => {
    const spec = RESIN_KB[key];
    return {
      key,
      slug: slugifyResinKey(key),
      displayName: getResinDisplayName(key, locale),
      tier: spec.tier,
      hygro: spec.hygroscopic,
      crystalline: spec.crystalline,
    };
  });
}

export function getRelatedResinKeys(key: string, limit = 4): { key: string; slug: string }[] {
  const spec = RESIN_KB[key];
  if (!spec) return [];
  return Object.keys(RESIN_KB)
    .filter(k => k !== key && RESIN_KB[k].tier === spec.tier)
    .slice(0, limit)
    .map(k => ({ key: k, slug: slugifyResinKey(k) }));
}

export { getResinKeyBySlug };

// KB 키(RESIN_KB의 Record 키, 예: 'PA66', 'PC/ABS', 'POM(아세탈)') ↔ URL 슬러그 매핑 단일 유틸.
// 슬러그 규칙: 소문자화 → [a-z0-9] 아닌 연속 문자를 '-'로 치환 → 양끝 '-' 제거.
// 'PA66'→'pa66', 'PC/ABS'→'pc-abs', 'POM(아세탈)'→'pom'(한글·괄호는 비ASCII라 자연 소거).
// 52개 키 전수 충돌 없음 확인(구현 시 스크립트로 실측).
import { RESIN_KB } from '@/lib/resin-kb';

export function slugifyResinKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

let _slugToKey: Record<string, string> | null = null;

export function getSlugToKeyMap(): Record<string, string> {
  if (_slugToKey) return _slugToKey;
  const map: Record<string, string> = {};
  for (const key of Object.keys(RESIN_KB)) {
    map[slugifyResinKey(key)] = key;
  }
  _slugToKey = map;
  return map;
}

export function getAllResinSlugs(): string[] {
  return Object.keys(getSlugToKeyMap());
}

export function getResinKeyBySlug(slug: string): string | null {
  return getSlugToKeyMap()[slug] ?? null;
}

// /resins(ko)·/en/resins(en) 페이지 전용 표시명·메타 문구 생성기. lib/resin-kb.ts(RESIN_KB)를
// 단일 소스로 삼아 수치 기반 문자열을 만든다 — 페이지별 문구가 자동으로 고유해짐(중복 0 보장).
import type { ResinSpec, Tier, Hygro } from '@/lib/resin-kb';
import { RESIN_OPTION_EN_LABEL } from '@/lib/resinOptions';

export type Locale = 'ko' | 'en';

export function getResinDisplayName(key: string, locale: Locale): string {
  if (locale === 'en') return RESIN_OPTION_EN_LABEL[key] ?? key;
  return key;
}

export const TIER_LABEL: Record<Tier, { ko: string; en: string }> = {
  'commodity': { ko: '범용', en: 'Commodity' },
  'engineering': { ko: '엔지니어링', en: 'Engineering' },
  'super-engineering': { ko: '슈퍼엔지니어링', en: 'Super-Engineering' },
  'blend': { ko: '블렌드', en: 'Blend' },
  'elastomer': { ko: '엘라스토머', en: 'Elastomer' },
};

export const HYGRO_LABEL: Record<Hygro, { ko: string; en: string }> = {
  'none': { ko: '없음', en: 'None' },
  'low': { ko: '낮음', en: 'Low' },
  'moderate': { ko: '보통', en: 'Moderate' },
  'high': { ko: '높음', en: 'High' },
  'very-high': { ko: '매우 높음', en: 'Very High' },
};

function fmtHoursKo(h: [number, number]): string {
  return h[0] === h[1] ? `${h[0]}h` : `${h[0]}~${h[1]}h`;
}
function fmtHoursEn(h: [number, number]): string {
  return h[0] === h[1] ? `${h[0]}h` : `${h[0]}-${h[1]}h`;
}

export function buildTitle(displayName: string, locale: Locale): string {
  return locale === 'en'
    ? `${displayName} Drying Conditions, Melt & Mold Temperature, Shrinkage | Mold Doctor`
    : `${displayName} 건조 조건·사출 온도·수축률 — 사출성형 현장 요약 | Mold Doctor`;
}

export function buildDescription(spec: ResinSpec, displayName: string, locale: Locale): string {
  if (locale === 'en') {
    const parts: string[] = [];
    parts.push(spec.drying
      ? `Dry ${spec.drying.tempC}°C ${fmtHoursEn(spec.drying.hours)}${spec.drying.targetMoisturePct != null ? `, moisture <${spec.drying.targetMoisturePct}%` : ''}`
      : 'No pre-drying required (non-hygroscopic)');
    let melt = `melt ${spec.meltC.min}-${spec.meltC.max}°C`;
    if (spec.meltC.degradeAbove) melt += ` (degrades above ${spec.meltC.degradeAbove}°C)`;
    parts.push(melt);
    parts.push(`mold ${spec.moldC.min}-${spec.moldC.max}°C`);
    if (spec.shrinkagePct) parts.push(`shrinkage ${spec.shrinkagePct[0]}-${spec.shrinkagePct[1]}%`);
    return `${displayName}: ${parts.join(', ')}. Field reference summary for injection molding.`;
  }
  const parts: string[] = [];
  parts.push(spec.drying
    ? `건조 ${spec.drying.tempC}°C ${fmtHoursKo(spec.drying.hours)}${spec.drying.targetMoisturePct != null ? `·수분율 ${spec.drying.targetMoisturePct}%` : ''}`
    : '건조 불필요(비흡습)');
  let melt = `용융 ${spec.meltC.min}~${spec.meltC.max}°C`;
  if (spec.meltC.degradeAbove) melt += `(${spec.meltC.degradeAbove}°C↑ 열화)`;
  parts.push(melt);
  parts.push(`금형 ${spec.moldC.min}~${spec.moldC.max}°C`);
  if (spec.shrinkagePct) parts.push(`수축 ${spec.shrinkagePct[0]}~${spec.shrinkagePct[1]}%`);
  return `${displayName} ${parts.join(', ')} — 사출성형 현장 요약.`;
}

export function buildJsonLd(spec: ResinSpec, displayName: string, locale: Locale, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: buildTitle(displayName, locale),
    description: buildDescription(spec, displayName, locale),
    inLanguage: locale,
    url,
    about: { '@type': 'Thing', name: displayName },
    publisher: { '@type': 'Organization', name: 'Mold Doctor AI', url: 'https://mold-doctor-ai.vercel.app' },
  };
}

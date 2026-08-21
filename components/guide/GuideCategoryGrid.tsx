// 가이드 리스트 재설계(guide-redesign-web-v1) — 5계열 그룹 헤더 + 반응형 그리드.
// /guide·/en/guide 양쪽이 공유(locale·basePath만 다름). 서버 컴포넌트(상호작용 없음).
import Link from 'next/link';
import { defects, type GuideDefect } from '@/lib/defectGuide';
import { GUIDE_CATEGORIES, type GuideCategoryId } from '@/lib/guideCategories';
import { IconDrop, IconWave, IconThermo, IconTriangle, IconMold, type IconProps } from '@/components/icons';

const CATEGORY_ICON: Record<GuideCategoryId, (props: IconProps) => React.JSX.Element> = {
  'fill-pack': IconDrop,
  'surface-flow': IconWave,
  'heat-gas-contamination': IconThermo,
  'strength-structure': IconTriangle,
  'mold-ejection-dimension': IconMold,
};

export default function GuideCategoryGrid({ locale, basePath }: { locale: 'ko' | 'en'; basePath: string }) {
  const bySlug = new Map(defects.map(d => [d.id, d]));

  return (
    <div className="space-y-12">
      {GUIDE_CATEGORIES.map(cat => {
        const Icon = CATEGORY_ICON[cat.id];
        const items = cat.slugs
          .map(slug => bySlug.get(slug))
          .filter((d): d is GuideDefect => !!d);
        const title = locale === 'en' ? cat.titleEn : cat.titleKo;
        const countLabel = locale === 'en' ? `${items.length} types` : `${items.length}종`;

        return (
          <section key={cat.id}>
            <p className="text-[13px] font-semibold text-brand tracking-[-.01em] mb-1">{cat.labelEn}</p>
            <div className="flex items-baseline gap-2 pb-3 border-b border-border">
              <h2 className="text-[20px] font-semibold text-ink tracking-[-.02em]">{title}</h2>
              <span className="text-[13px] text-faint">{countLabel}</span>
            </div>
            <div className="grid grid-cols-1 min-[561px]:grid-cols-2 min-[901px]:grid-cols-3 gap-3 mt-4">
              {items.map(d => (
                <Link
                  key={d.id}
                  href={`${basePath}/${d.id}`}
                  className="flex items-center justify-between gap-3 p-4 bg-surface border border-border rounded-[var(--radius-card)] hover:border-[var(--brand-border)] transition-colors min-h-[44px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center shrink-0">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-[15px] truncate">
                        {locale === 'en' ? d.nameEn : d.nameKo}
                      </div>
                      {locale === 'ko' && (
                        <div className="text-faint text-[12px] truncate">{d.nameEn}</div>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-faint shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { defects, colorMap, headerColorMap, DEFECT_NUMS, DEFECT_KEY_TO_GUIDE_ID } from '@/lib/defectGuide';
import { RESIN_KB, type DefectKey } from '@/lib/resin-kb';
import { slugifyResinKey } from '@/lib/resinSlug';
import { getResinDisplayName } from '@/lib/resinDisplay';

// guide id(dash) → 그 불량을 commonDefects에 포함한 KB 수지 목록(계열 무관, 최대 6개).
// lib/resin-kb.ts를 단일 소스로 매 렌더 계산 — 수동 큐레이션 없이 KB와 항상 동기화됨.
function getRelatedResins(guideId: string): { key: string; slug: string }[] {
  const defectKey = (Object.entries(DEFECT_KEY_TO_GUIDE_ID) as [DefectKey, string][])
    .find(([, gid]) => gid === guideId)?.[0];
  if (!defectKey) return [];
  return Object.keys(RESIN_KB)
    .filter(key => RESIN_KB[key].commonDefects.includes(defectKey))
    .slice(0, 6)
    .map(key => ({ key, slug: slugifyResinKey(key) }));
}

function GuideContent() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();

  // /resins 상세 페이지 → /guide?d=<id> 역링크 시 해당 항목 자동 펼침(SEO 내부링크 동작 확인용)
  useEffect(() => {
    const d = searchParams.get('d');
    if (d && defects.some(x => x.id === d)) setOpenId(d);
  }, [searchParams]);

  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-border)] bg-brand-tint text-brand-ink text-[length:var(--text-label)] font-medium px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-brand rounded-full" />
            {t('guide.badge')}
          </div>
          <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-2">{t('guide.h1')}</h1>
          <p className="text-muted text-body">{t('guide.sub')}</p>
        </div>

        <div className="space-y-2">
          {defects.map((defect) => {
            const isEn = locale === 'en';
            const displayName = isEn ? defect.nameEn : defect.nameKo;
            // Korean mode: show English in parens. English mode: no Korean shown.
            const secondaryName = isEn ? null : defect.nameEn;
            const description = isEn ? defect.descriptionEn : defect.descriptionKo;
            const causes = isEn ? defect.causesEn : defect.causesKo;
            const solutions = isEn ? defect.solutionsEn : defect.solutionsKo;
            const resinNotes = isEn ? defect.resinNotesEn : defect.resinNotesKo;
            const relatedResins = getRelatedResins(defect.id);

            return (
              <div
                key={defect.id}
                id={defect.id}
                className={`border rounded-[var(--radius-card-lg)] overflow-hidden transition-all ${
                  openId === defect.id ? colorMap[defect.color] : 'border-border bg-surface hover:border-[var(--brand-border)]'
                }`}
                style={{ contentVisibility: 'auto', containIntrinsicSize: openId === defect.id ? '0 700px' : '0 84px' }}
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => toggle(defect.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-full ${headerColorMap[defect.color]} text-on-brand flex items-center justify-center text-sm font-bold shrink-0`}>
                      {DEFECT_NUMS[defect.id]}
                    </span>
                    <div>
                      <span className="font-bold text-ink text-body">{displayName}</span>
                      {secondaryName && (
                        <span className="text-faint ml-2 text-[length:var(--text-label)]">({secondaryName})</span>
                      )}
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-faint transition-transform ${openId === defect.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openId === defect.id && (
                  <div className="px-5 pb-6 space-y-5 border-t border-border pt-4">
                    <p className="text-muted text-body leading-relaxed">{description}</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="ui-subhead mb-3 flex items-center gap-2">
                          <span className="text-danger">◆</span> {t('guide.causes_label')}
                        </h4>
                        <ul className="space-y-2">
                          {causes.map((cause, i) => (
                            <li key={i} className="flex items-start gap-2 text-body text-muted">
                              <span className="text-danger mt-0.5 shrink-0">•</span>
                              {cause}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="ui-subhead mb-3 flex items-center gap-2">
                          <span className="text-ok">◆</span> {t('guide.solutions_label')}
                        </h4>
                        <ul className="space-y-2">
                          {solutions.map((sol, i) => (
                            <li key={i} className="flex items-start gap-2 text-body text-muted">
                              <span className="text-ok mt-0.5 shrink-0">✓</span>
                              {sol}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {Object.keys(resinNotes).length > 0 && (
                      <div>
                        <h4 className="ui-subhead mb-3 flex items-center gap-2">
                          <span className="text-brand-ink">◆</span> {t('guide.resin_notes_label')}
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {Object.entries(resinNotes).map(([resin, note]) => (
                            <div key={resin} className="bg-surface-sunken rounded-[var(--radius-card)] p-3 border border-border">
                              <span className="font-bold text-ink text-body">{resin}</span>
                              <p className="text-muted text-[length:var(--text-label)] mt-1">{note}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {relatedResins.length > 0 && (
                      <div>
                        <h4 className="ui-subhead mb-3 flex items-center gap-2">
                          <span className="text-brand-ink">◆</span> {t('guide.related_resins_label')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {relatedResins.map(({ key, slug }) => (
                            <Link
                              key={key}
                              href={`/resins/${slug}`}
                              className="inline-flex items-center min-h-[44px] px-3.5 rounded-full bg-brand-tint hover:bg-[var(--brand-border)] text-brand-ink text-[length:var(--text-label)] font-bold transition-colors"
                            >
                              {getResinDisplayName(key, locale)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <Link
                        href={`/diagnose?defect=${encodeURIComponent(defect.nameKo)}`}
                        className="inline-flex items-center gap-2 bg-brand hover:bg-brand-ink text-on-brand px-5 rounded-full text-body font-bold transition-colors min-h-[var(--touch-min)]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {displayName} {t('guide.analyze_btn')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>}>
      <GuideContent />
    </Suspense>
  );
}

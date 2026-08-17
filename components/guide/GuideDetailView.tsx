// /guide/[slug](ko)·/en/guide/[slug](en) 상세 본문 — 서버 컴포넌트(상호작용 없음, 전 내용이
// 최초 HTML에 포함되어야 크롤러가 인덱싱 가능). ko/en 페이지가 locale만 다르게 넘겨 공용.
// components/resins/ResinDetailView.tsx와 동일 패턴.
import Link from 'next/link';
import type { GuideDefect } from '@/lib/defectGuide';
import type { Locale } from '@/lib/guideDisplay';
import { getResinDisplayName } from '@/lib/resinDisplay';
import StoreBadges from '@/components/StoreBadges';

export default function GuideDetailView({
  defect, locale, basePath, resinsBasePath, related,
}: {
  defect: GuideDefect;
  locale: Locale;
  basePath: string; // '/guide' | '/en/guide'
  resinsBasePath: string; // '/resins' | '/en/resins'
  related: { key: string; slug: string }[];
}) {
  const L = (ko: string, en: string) => (locale === 'en' ? en : ko);
  const displayName = locale === 'en' ? defect.nameEn : defect.nameKo;
  const description = locale === 'en' ? defect.descriptionEn : defect.descriptionKo;
  const causes = locale === 'en' ? defect.causesEn : defect.causesKo;
  const solutions = locale === 'en' ? defect.solutionsEn : defect.solutionsKo;
  const resinNotes = locale === 'en' ? defect.resinNotesEn : defect.resinNotesKo;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href={basePath} className="text-faint hover:text-ink text-sm mb-3 min-h-[44px] inline-flex items-center gap-1">
          ← {L('불량 가이드', 'Defect Guide')}
        </Link>
        <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-2">{displayName}</h1>
        {locale === 'ko' && <p className="text-faint text-label mb-3">{defect.nameEn}</p>}
        <p className="text-muted text-body leading-relaxed">{description}</p>
      </div>

      <div className="space-y-8">
        {/* 원인 */}
        <section>
          <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3 flex items-center gap-2">
            <span className="text-danger">◆</span> {L('일반적 원인', 'Common Causes')}
          </h2>
          <div className="ui-card ui-card-lg p-5">
            <ul className="space-y-2">
              {causes.map((cause, i) => (
                <li key={i} className="flex items-start gap-2 text-body text-muted">
                  <span className="text-danger mt-0.5 shrink-0">•</span>
                  {cause}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 해결 방법 */}
        <section>
          <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3 flex items-center gap-2">
            <span className="text-ok">◆</span> {L('해결 방향', 'Solutions')}
          </h2>
          <div className="ui-card ui-card-lg p-5">
            <ul className="space-y-2">
              {solutions.map((sol, i) => (
                <li key={i} className="flex items-start gap-2 text-body text-muted">
                  <span className="text-ok mt-0.5 shrink-0">✓</span>
                  {sol}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 수지별 주의사항 */}
        {Object.keys(resinNotes).length > 0 && (
          <section>
            <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3 flex items-center gap-2">
              <span className="text-brand-ink">◆</span> {L('수지별 주의사항', 'Resin-Specific Notes')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(resinNotes).map(([resin, note]) => (
                <div key={resin} className="bg-surface-sunken rounded-[var(--radius-card)] p-3 border border-border">
                  <span className="font-bold text-ink text-body">{resin}</span>
                  <p className="text-muted text-[length:var(--text-label)] mt-1">{note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 이 불량이 흔한 수지 */}
        {related.length > 0 && (
          <section>
            <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3 flex items-center gap-2">
              <span className="text-brand-ink">◆</span> {L('이 불량이 흔한 수지', 'Resins Prone to This Defect')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map(({ key, slug }) => (
                <Link
                  key={key}
                  href={`${resinsBasePath}/${slug}`}
                  className="inline-flex items-center min-h-[44px] px-3.5 rounded-full bg-brand-tint hover:bg-[var(--brand-border)] text-brand-ink text-[length:var(--text-label)] font-bold transition-colors"
                >
                  {getResinDisplayName(key, locale)}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA — 웹 추정 */}
        <section>
          <Link
            href={`/diagnose?defect=${encodeURIComponent(defect.id)}`}
            className="ui-cta w-full text-body block text-center"
          >
            {L(`${displayName} 불량이 보이면 — 사진과 셋팅값으로 원인을 추정해 드립니다`, `Got a ${displayName.toLowerCase()} defect? Upload a photo and settings — we'll estimate the cause`)}
          </Link>
        </section>

        {/* 앱 설치 CTA (웹 추정과 병행) */}
        <StoreBadges variant="article" locale={locale} />

        {/* 면책 */}
        <p className="text-[length:var(--text-label)] text-faint text-center pt-2">
          {L('본 내용은 현장 참고용 요약입니다. 최종 판단은 현장 엔지니어의 검증이 필요합니다.', 'This content is a field-reference summary. Final judgment requires on-site engineer verification.')}
        </p>

        {/* 저자 바이라인 — en 전용(author-page-en-v1) */}
        {locale === 'en' && (
          <p className="text-faint text-sm text-center">
            <Link href="/en/about" className="hover:text-muted transition-colors">Written by Jinwoo Park</Link>
          </p>
        )}
      </div>
    </div>
  );
}

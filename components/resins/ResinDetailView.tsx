// /resins/[slug](ko)·/en/resins/[slug](en) 상세 본문 — 서버 컴포넌트(상호작용 없음, 전 내용이
// 최초 HTML에 포함되어야 크롤러가 인덱싱 가능). ko/en 페이지가 locale만 다르게 넘겨 공용.
import Link from 'next/link';
import type { ResinSpec, DefectKey } from '@/lib/resin-kb';
import { RESIN_NOTES_KO } from '@/lib/resinNotesKo';
import { DEFECT_KEY_TO_GUIDE_ID, getGuideDefectById } from '@/lib/defectGuide';
import { TIER_LABEL, HYGRO_LABEL, getResinDisplayName, type Locale } from '@/lib/resinDisplay';

const FLOW_MARK_LABEL: Record<Locale, string> = { ko: '유동자국(플로우마크)', en: 'Flow Mark' };

function defectLabel(defectKey: DefectKey, locale: Locale): string {
  const guideId = DEFECT_KEY_TO_GUIDE_ID[defectKey];
  const gd = guideId ? getGuideDefectById(guideId) : undefined;
  if (gd) return locale === 'en' ? gd.nameEn : gd.nameKo;
  return FLOW_MARK_LABEL[locale];
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.]*\./);
  return (m ? m[0] : text).trim();
}

function fmtHours(h: [number, number], locale: Locale): string {
  if (h[0] === h[1]) return `${h[0]}${locale === 'en' ? 'h' : '시간'}`;
  return locale === 'en' ? `${h[0]}-${h[1]}h` : `${h[0]}~${h[1]}시간`;
}

export default function ResinDetailView({
  resinKey, spec, locale, basePath, related,
}: {
  resinKey: string;
  spec: ResinSpec;
  locale: Locale;
  basePath: string; // '/resins' | '/en/resins'
  related: { key: string; slug: string }[];
}) {
  const L = (ko: string, en: string) => (locale === 'en' ? en : ko);
  const displayName = getResinDisplayName(resinKey, locale);
  const notes = locale === 'en' ? spec.notes : (RESIN_NOTES_KO[resinKey] ?? spec.notes);
  const noteSummary = firstSentence(notes);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href={basePath} className="text-faint hover:text-ink text-sm mb-3 min-h-[44px] inline-flex items-center gap-1">
          ← {L('수지 라이브러리', 'Resin Library')}
        </Link>
        <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-3">{displayName}</h1>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[length:var(--text-label)] font-bold px-2.5 py-1 rounded-full bg-brand-tint text-brand-ink">
            {TIER_LABEL[spec.tier][locale]}
          </span>
          <span className="text-[length:var(--text-label)] font-medium px-2.5 py-1 rounded-full bg-surface-sunken text-muted">
            {spec.crystalline ? L('결정성', 'Crystalline') : L('비정질', 'Amorphous')}
          </span>
          <span className="text-[length:var(--text-label)] font-medium px-2.5 py-1 rounded-full bg-surface-sunken text-muted">
            {L('흡습성', 'Hygroscopicity')} {HYGRO_LABEL[spec.hygroscopic][locale]}
          </span>
          <span className={`text-[length:var(--text-label)] font-bold px-2.5 py-1 rounded-full ${spec.confidence === 'verified' ? 'bg-[var(--ok-bg)] text-ok border border-[var(--ok-border)]' : 'bg-surface-sunken text-faint'}`}>
            {spec.confidence === 'verified' ? L('검증됨', 'Verified') : L('실무 추정치', 'Field Estimate')}
          </span>
        </div>
      </div>

      <div className="space-y-8">
        {/* 건조 조건 */}
        <section>
          <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3">{L('건조 조건', 'Drying Conditions')}</h2>
          {spec.drying ? (
            <div className="ui-card ui-card-lg p-5 grid grid-cols-3 gap-3">
              <div>
                <div className="text-[length:var(--text-label)] text-faint mb-1">{L('건조 온도', 'Temperature')}</div>
                <div className="text-[length:var(--text-num)] font-bold text-ink tabular-nums">{spec.drying.tempC}°C</div>
              </div>
              <div>
                <div className="text-[length:var(--text-label)] text-faint mb-1">{L('건조 시간', 'Time')}</div>
                <div className="text-[length:var(--text-num)] font-bold text-ink tabular-nums">{fmtHours(spec.drying.hours, locale)}</div>
              </div>
              <div>
                <div className="text-[length:var(--text-label)] text-faint mb-1">{L('목표 수분율', 'Target Moisture')}</div>
                <div className="text-[length:var(--text-num)] font-bold text-ink tabular-nums">
                  {spec.drying.targetMoisturePct != null ? `${spec.drying.targetMoisturePct}%` : L('미지정', 'N/A')}
                </div>
              </div>
              {spec.hygroscopic !== 'none' && spec.hygroscopic !== 'low' && (
                <p className="col-span-3 text-body text-muted mt-1">
                  {L('제습식 건조기 권장(흡습성이 높은 편).', 'A dehumidifying dryer is recommended (relatively hygroscopic).')}
                </p>
              )}
            </div>
          ) : (
            <div className="ui-card ui-card-lg p-5">
              <p className="text-body text-muted">{L('비흡습성 수지로 별도 건조가 일반적으로 필요하지 않다.', 'Non-hygroscopic — pre-drying is generally not required.')}</p>
            </div>
          )}
        </section>

        {/* 사출(용융) 온도 */}
        <section>
          <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3">{L('사출(용융) 온도', 'Melt Temperature')}</h2>
          <div className="ui-card ui-card-lg p-5">
            <div className="text-[length:var(--text-num)] font-bold text-ink tabular-nums mb-3">
              {spec.meltC.min}~{spec.meltC.max}°C
            </div>
            {spec.meltC.degradeAbove !== undefined && (
              <div className="rounded-[var(--radius-card)] bg-[var(--warn-bg)] border border-[var(--warn-border)] px-4 py-3">
                <p className="text-warn text-body font-bold">
                  ⚠ {L(`${spec.meltC.degradeAbove}°C 이상에서 열분해 위험`, `Thermal degradation risk above ${spec.meltC.degradeAbove}°C`)}
                </p>
                <p className="text-warn text-[length:var(--text-label)] mt-1">
                  {L('체류시간을 최소화하고 해당 온도를 초과하지 않도록 관리한다.', 'Minimize residence time and avoid exceeding this temperature.')}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 금형 온도 */}
        <section>
          <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3">{L('금형 온도', 'Mold Temperature')}</h2>
          <div className="ui-card ui-card-lg p-5 space-y-2">
            <div className="text-[length:var(--text-num)] font-bold text-ink tabular-nums">
              {spec.moldC.min}~{spec.moldC.max}°C
            </div>
            {spec.moldC.gf && (
              <p className="text-body text-muted">
                {L(`GF 강화 그레이드: ${spec.moldC.gf[0]}~${spec.moldC.gf[1]}°C`, `GF-reinforced grade: ${spec.moldC.gf[0]}-${spec.moldC.gf[1]}°C`)}
              </p>
            )}
          </div>
        </section>

        {/* 수축률 */}
        <section>
          <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3">{L('수축률', 'Shrinkage')}</h2>
          <div className="ui-card ui-card-lg p-5">
            <div className="text-[length:var(--text-num)] font-bold text-ink tabular-nums">
              {spec.shrinkagePct ? `${spec.shrinkagePct[0]}~${spec.shrinkagePct[1]}%` : L('데이터 없음', 'No data')}
            </div>
          </div>
        </section>

        {/* 흔한 불량과 첫 점검 */}
        <section>
          <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3">{L('흔한 불량과 첫 점검', 'Common Defects & First Checks')}</h2>
          {spec.commonDefects.length === 0 ? (
            <p className="text-body text-muted">{L('KB에 등록된 특이 불량 경향이 없다.', 'No notable defect tendency recorded in the KB.')}</p>
          ) : (
            <div className="space-y-2">
              {spec.commonDefects.map(dk => {
                const guideId = DEFECT_KEY_TO_GUIDE_ID[dk];
                const label = defectLabel(dk, locale);
                return (
                  <div key={dk} className="ui-card ui-card-lg p-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-ink text-body mb-1">{label}</div>
                      <p className="text-muted text-[length:var(--text-label)]">{noteSummary}</p>
                    </div>
                    {guideId ? (
                      <Link
                        href={`/guide?d=${guideId}`}
                        className="shrink-0 min-h-[44px] px-3.5 flex items-center rounded-full bg-brand-tint hover:bg-[var(--brand-border)] text-brand-ink text-[length:var(--text-label)] font-bold transition-colors"
                      >
                        {L('가이드 보기', 'View Guide')}
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 실무 노트 */}
        <section>
          <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3">{L('실무 노트', 'Field Notes')}</h2>
          <div className="ui-card ui-card-lg p-5">
            <p className="text-body text-muted leading-relaxed">{notes}</p>
          </div>
        </section>

        {/* CTA */}
        <section>
          <Link
            href={`/diagnose?resin=${encodeURIComponent(resinKey)}`}
            className="ui-cta w-full text-body block text-center"
          >
            {L(`${displayName}에서 불량이 났다면 — 사진과 셋팅값으로 원인을 추정해 드립니다`, `Got a defect with ${displayName}? Upload a photo and settings — we'll estimate the cause`)}
          </Link>
        </section>

        {/* 관련 수지 */}
        {related.length > 0 && (
          <section>
            <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3">{L('관련 수지', 'Related Resins')}</h2>
            <div className="flex flex-wrap gap-2">
              {related.map(r => (
                <Link
                  key={r.key}
                  href={`${basePath}/${r.slug}`}
                  className="min-h-[44px] px-3.5 flex items-center rounded-full bg-surface-sunken hover:bg-brand-tint text-ink hover:text-brand-ink text-[length:var(--text-label)] font-bold transition-colors"
                >
                  {getResinDisplayName(r.key, locale)}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 앱 배지 */}
        <section className="flex flex-col items-center gap-3 pt-2">
          <a
            href="https://play.google.com/store/apps/details?id=com.jinsimlabs.molddoctor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-ink text-canvas px-5 py-3 rounded-xl min-h-[var(--touch-cta)] font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <span aria-hidden>▶</span>
            {L('Google Play에서 다운로드', 'Get it on Google Play')}
          </a>
          {/* App Store 배지 자리 — iOS 심사 승인 후 추가 */}
        </section>

        {/* 면책 */}
        <p className="text-[length:var(--text-label)] text-faint text-center pt-2">
          {L('본 데이터는 현장 참고용 요약입니다. 최종 확인은 수지 제조사 TDS 기준입니다.', 'This data is a field-reference summary. Always verify against the resin manufacturer’s official TDS.')}
        </p>
      </div>
    </div>
  );
}

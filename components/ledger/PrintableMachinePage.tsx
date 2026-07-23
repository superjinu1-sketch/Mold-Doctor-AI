'use client';

// 현장 부착용 조건 표준서(A4 세로, 설비당 1페이지) — html2canvas로 캡처되는 순수 표시 컴포넌트.
// 흑백 프린터 가독 우선: 심각도색 없음, 토큰(ink/muted/border-strong/surface)만 사용 — raw hex 없음.
// 라벨은 기존 step3.*/adv.* t() 키를 그대로 재사용(신규 문구 중복 없음, diagnose 폼과 카피 일치).
import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import type { Machine, ConditionStandard } from '@/lib/ledger';
import { TEMP_FIELDS, MOLD_TEMP_FIELDS, MACHINE_PARAM_FIELDS, ADV_FIELD_GROUPS } from '@/lib/machineSettingsFields';
import { getBrandQrDataUrl } from '@/lib/pdfBranding';

function fmtDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso.slice(0, 10); }
}

const INK = 'var(--ink)';
const MUTED = 'var(--muted)';
const BORDER = 'var(--border-strong)';
const SURFACE = 'var(--surface)';

export default function PrintableMachinePage({
  machine, standard, authorName,
}: {
  machine: Machine;
  standard: ConditionStandard | null;
  authorName: string;
}) {
  const { t, locale } = useLocale();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  useEffect(() => { getBrandQrDataUrl().then(setQrUrl); }, []);

  const s = standard?.settings || {};
  const vpFields = ADV_FIELD_GROUPS.find(g => g.titleKey === 'adv.vp_section')?.fields ?? [];
  const hasVp = vpFields.some(f => s[f.key]);
  const extraGroups = ADV_FIELD_GROUPS.filter(g => g.titleKey !== 'adv.vp_section')
    .map(g => ({ ...g, fields: g.fields.filter(f => s[f.key]) }))
    .filter(g => g.fields.length > 0);

  const L = (ko: string, en: string) => (locale === 'en' ? en : ko);

  return (
    <div style={{ width: '190mm', minHeight: '277mm', background: SURFACE, color: INK, padding: '4mm', boxSizing: 'border-box', fontFamily: 'inherit' }}>
      {/* 헤더 */}
      <div style={{ borderBottom: `3px solid ${INK}`, paddingBottom: '4mm', marginBottom: '5mm' }}>
        <div style={{ fontSize: '11mm', fontWeight: 800, lineHeight: 1.15, wordBreak: 'keep-all' }}>{machine.name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3mm', marginTop: '3mm', fontSize: '5mm', color: MUTED }}>
          {standard?.item_name && <span>{L('아이템', 'Item')}: {standard.item_name}</span>}
          {standard?.mold_name && <span>{L('금형', 'Mold')}: {standard.mold_name}</span>}
          {standard?.resin && <span style={{ fontWeight: 700, color: INK }}>{L('수지', 'Resin')}: {standard.resin}</span>}
        </div>
      </div>

      {!standard ? (
        <p style={{ fontSize: '5.5mm', color: MUTED }}>{L('등록된 조건 표준이 없습니다.', 'No condition standard recorded yet.')}</p>
      ) : (
        <>
          {/* 온도 */}
          <div style={{ marginBottom: '5mm' }}>
            <div style={{ fontSize: '5mm', fontWeight: 800, marginBottom: '2mm', borderBottom: `1px solid ${BORDER}`, paddingBottom: '1mm' }}>
              {L('사출 온도 (℃) / 금형 온도 (℃)', 'Barrel Temp (℃) / Mold Temp (℃)')}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '5.5mm' }}>
              <tbody>
                <tr>
                  {[...TEMP_FIELDS, ...MOLD_TEMP_FIELDS].map(f => (
                    <td key={f.key} style={{ border: `1px solid ${BORDER}`, padding: '2mm', textAlign: 'center', width: `${100 / (TEMP_FIELDS.length + MOLD_TEMP_FIELDS.length)}%` }}>
                      <div style={{ fontSize: '3.6mm', color: MUTED, marginBottom: '1mm' }}>{t(f.labelKey)}</div>
                      <div style={{ fontWeight: 800 }}>{s[f.key] || '—'}</div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 압력/속도/시간 등 */}
          <div style={{ marginBottom: '5mm' }}>
            <div style={{ fontSize: '5mm', fontWeight: 800, marginBottom: '2mm', borderBottom: `1px solid ${BORDER}`, paddingBottom: '1mm' }}>
              {L('압력 · 속도 · 시간', 'Pressure · Speed · Time')}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '5.5mm' }}>
              <tbody>
                {chunk(MACHINE_PARAM_FIELDS, 4).map((row, ri) => (
                  <tr key={ri}>
                    {row.map(f => (
                      <td key={f.key} style={{ border: `1px solid ${BORDER}`, padding: '2mm', textAlign: 'center', width: '25%' }}>
                        <div style={{ fontSize: '3.6mm', color: MUTED, marginBottom: '1mm' }}>{t(f.labelKey)}</div>
                        <div style={{ fontWeight: 800 }}>
                          {s[f.key] || '—'}
                          {s[f.key] && f.placeholder ? ` ${/[Pp]ressure/.test(f.key) ? (s.pressureUnit || f.placeholder) : f.placeholder}` : ''}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* V/P 전환 & 감압 */}
          {hasVp && (
            <div style={{ marginBottom: '5mm' }}>
              <div style={{ fontSize: '5mm', fontWeight: 800, marginBottom: '2mm', borderBottom: `1px solid ${BORDER}`, paddingBottom: '1mm' }}>
                {t('adv.vp_section')}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '5.5mm' }}>
                <tbody>
                  <tr>
                    {vpFields.map(f => (
                      <td key={f.key} style={{ border: `1px solid ${BORDER}`, padding: '2mm', textAlign: 'center' }}>
                        <div style={{ fontSize: '3.6mm', color: MUTED, marginBottom: '1mm' }}>{t(f.labelKey)}</div>
                        <div style={{ fontWeight: 800 }}>{s[f.key] || '—'}</div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 기타 입력된 상세 조건(있을 때만) */}
          {extraGroups.length > 0 && (
            <div style={{ marginBottom: '5mm' }}>
              <div style={{ fontSize: '5mm', fontWeight: 800, marginBottom: '2mm', borderBottom: `1px solid ${BORDER}`, paddingBottom: '1mm' }}>
                {L('기타 조건', 'Other Conditions')}
              </div>
              <div style={{ fontSize: '4.6mm', lineHeight: 1.9 }}>
                {extraGroups.map(g => (
                  <div key={g.titleKey}>
                    {g.fields.map(f => `${t(f.labelKey)}: ${s[f.key]}`).join('  ·  ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {standard.memo && (
            <div style={{ marginBottom: '5mm', fontSize: '4.6mm', color: MUTED }}>
              {L('메모', 'Memo')}: {standard.memo}
            </div>
          )}
        </>
      )}

      {/* 푸터 */}
      <div style={{ marginTop: '8mm', paddingTop: '4mm', borderTop: `2px solid ${INK}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '4.2mm', color: MUTED }}>
          <div>
            <div>{L('개정일', 'Revised')}: {standard ? fmtDate(standard.created_at, locale) : '—'}</div>
            <div>{L('작성자', 'Author')}: {authorName}</div>
            <div style={{ marginTop: '3mm' }}>
              {L('확인', 'Confirmed')}: &nbsp;□ {L('주간', 'Day')} &nbsp;&nbsp; □ {L('야간', 'Night')}
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '2mm' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Mold Doctor{L('로 작성', ' generated')}</div>
              <div>mold-doctor-ai.vercel.app</div>
            </div>
            {qrUrl && <img src={qrUrl} alt="" width={64} height={64} style={{ width: '17mm', height: '17mm' }} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

'use client';

// 시사출 리포트(A4 세로, 1건 1페이지) — html2canvas로 캡처되는 순수 표시 컴포넌트.
// components/ledger/PrintableMachinePage.tsx와 동일 규격(흑백 가독, 토큰만, 브랜딩+QR) 재사용.
import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import type { TryoutRecord } from '@/lib/tryout';
import { CHECKLIST_GROUPS, type Shot } from '@/lib/tryoutChecklist';
import { getGuideDefectById } from '@/lib/defectGuide';
import { TEMP_FIELDS, MOLD_TEMP_FIELDS, MACHINE_PARAM_FIELDS } from '@/lib/machineSettingsFields';
import { getBrandQrDataUrl } from '@/lib/pdfBranding';

const INK = 'var(--ink)';
const MUTED = 'var(--muted)';
const BORDER = 'var(--border-strong)';
const SURFACE = 'var(--surface)';

const STATE_MARK: Record<string, string> = { ok: '✓', ng: '✗', na: '—' };

function fmtDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso.slice(0, 10); }
}

export default function PrintableTryoutReport({
  record, machineName, authorName, shots,
}: {
  record: TryoutRecord;
  machineName: string;
  authorName: string;
  shots: Shot[];
}) {
  const { t, locale } = useLocale();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  useEffect(() => { getBrandQrDataUrl().then(setQrUrl); }, []);

  const L = (ko: string, en: string) => (locale === 'en' ? en : ko);
  const s = record.final_settings || {};
  const hasSettings = Object.values(s).some(v => v);

  return (
    <div style={{ width: '190mm', minHeight: '277mm', background: SURFACE, color: INK, padding: '4mm', boxSizing: 'border-box', fontFamily: 'inherit' }}>
      {/* 헤더 */}
      <div style={{ borderBottom: `3px solid ${INK}`, paddingBottom: '4mm', marginBottom: '5mm' }}>
        <div style={{ fontSize: '9mm', fontWeight: 800, lineHeight: 1.15, wordBreak: 'keep-all' }}>{record.mold_name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3mm', marginTop: '3mm', fontSize: '4.6mm', color: MUTED }}>
          {record.item_name && <span>{L('아이템', 'Item')}: {record.item_name}</span>}
          {machineName && <span>{L('설비', 'Machine')}: {machineName}</span>}
          {record.resin && <span style={{ fontWeight: 700, color: INK }}>{L('수지', 'Resin')}: {record.resin}</span>}
          <span>{L('일자', 'Date')}: {fmtDate(record.updated_at, locale)}</span>
          <span style={{ fontWeight: 700 }}>{record.status === 'done' ? L('완료', 'Done') : L('진행중', 'In Progress')}</span>
        </div>
      </div>

      {/* 체크 결과표 */}
      {CHECKLIST_GROUPS.map(group => (
        <div key={group.group} style={{ marginBottom: '4mm' }}>
          <div style={{ fontSize: '4.6mm', fontWeight: 800, marginBottom: '1.5mm', borderBottom: `1px solid ${BORDER}`, paddingBottom: '1mm' }}>
            {group.group}. {locale === 'en' ? group.titleEn : group.titleKo}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '4mm' }}>
            <tbody>
              {group.items.map(item => {
                const entry = record.checklist?.[String(item.id)];
                const mark = entry?.state ? STATE_MARK[entry.state] : '—';
                const defectLabels = (entry?.defects || [])
                  .map(id => getGuideDefectById(id))
                  .filter((d): d is NonNullable<typeof d> => !!d)
                  .map(d => (locale === 'en' ? d.nameEn : d.nameKo));
                return (
                  <tr key={item.id}>
                    <td style={{ border: `1px solid ${BORDER}`, padding: '1.5mm 2mm', width: '8mm', textAlign: 'center', fontWeight: 800 }}>{mark}</td>
                    <td style={{ border: `1px solid ${BORDER}`, padding: '1.5mm 2mm' }}>
                      {item.id}. {locale === 'en' ? item.labelEn : item.labelKo}
                      {defectLabels.length > 0 && <span style={{ color: MUTED }}> — {defectLabels.join(', ')}</span>}
                      {entry?.memo && <span style={{ color: MUTED }}> ({entry.memo})</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* 샷별 기록 — 행이 많으면 기존 멀티페이지 파이프라인(placeBlock 재귀 분할)이 자연 분할 */}
      {shots.length > 0 && (
        <div style={{ marginBottom: '5mm' }}>
          <div style={{ fontSize: '4.6mm', fontWeight: 800, marginBottom: '1.5mm', borderBottom: `1px solid ${BORDER}`, paddingBottom: '1mm' }}>
            D. {L('샷별 기록', 'Shot Log')}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '3.8mm' }}>
            <thead>
              <tr>
                <th style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', background: 'var(--surface-sunken)', width: '10mm' }}>{L('샷#', 'Shot#')}</th>
                <th style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', background: 'var(--surface-sunken)' }}>{L('중량(g)', 'Weight(g)')}</th>
                <th style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', background: 'var(--surface-sunken)' }}>{L('사이클(s)', 'Cycle(s)')}</th>
                <th style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', background: 'var(--surface-sunken)' }}>{L('주요 치수', 'Dimensions')}</th>
                <th style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', background: 'var(--surface-sunken)' }}>{L('조정 내용', 'Adjustment')}</th>
              </tr>
            </thead>
            <tbody>
              {shots.map(shot => (
                <tr key={shot.no}>
                  <td style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', textAlign: 'center', fontWeight: 800 }}>{shot.no}</td>
                  <td style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', textAlign: 'center' }}>{shot.shotWeight || '—'}</td>
                  <td style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', textAlign: 'center' }}>{shot.cycleTime || '—'}</td>
                  <td style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', textAlign: 'center' }}>{shot.dims || '—'}</td>
                  <td style={{ border: `1px solid ${BORDER}`, padding: '1.5mm' }}>{shot.adjustMemo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 확정 조건 */}
      {hasSettings && (
        <div style={{ marginBottom: '5mm' }}>
          <div style={{ fontSize: '4.6mm', fontWeight: 800, marginBottom: '1.5mm', borderBottom: `1px solid ${BORDER}`, paddingBottom: '1mm' }}>
            {L('최종 확정 조건', 'Final Confirmed Settings')}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '4mm' }}>
            <tbody>
              <tr>
                {[...TEMP_FIELDS, ...MOLD_TEMP_FIELDS].filter(f => s[f.key]).map(f => (
                  <td key={f.key} style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', textAlign: 'center' }}>
                    <div style={{ fontSize: '3mm', color: MUTED }}>{t(f.labelKey)}</div>
                    <div style={{ fontWeight: 800 }}>{s[f.key]}</div>
                  </td>
                ))}
              </tr>
              <tr>
                {MACHINE_PARAM_FIELDS.filter(f => s[f.key]).map(f => (
                  <td key={f.key} style={{ border: `1px solid ${BORDER}`, padding: '1.5mm', textAlign: 'center' }}>
                    <div style={{ fontSize: '3mm', color: MUTED }}>{t(f.labelKey)}</div>
                    <div style={{ fontWeight: 800 }}>{s[f.key]}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 총평 */}
      {record.summary && (
        <div style={{ marginBottom: '5mm' }}>
          <div style={{ fontSize: '4.6mm', fontWeight: 800, marginBottom: '1.5mm', borderBottom: `1px solid ${BORDER}`, paddingBottom: '1mm' }}>
            {L('총평', 'Summary')}
          </div>
          <p style={{ fontSize: '4.2mm', color: MUTED, lineHeight: 1.6 }}>{record.summary}</p>
        </div>
      )}

      {/* 푸터 */}
      <div style={{ marginTop: '8mm', paddingTop: '4mm', borderTop: `2px solid ${INK}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '4mm', color: MUTED }}>
          <div>
            <div>{L('작성자', 'Author')}: {authorName}</div>
            <div style={{ marginTop: '3mm' }}>{L('승인', 'Approved by')}: ________________</div>
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

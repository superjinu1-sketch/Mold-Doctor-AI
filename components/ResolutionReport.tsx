'use client';

import { useRef, useState } from 'react';

// v0: localStorage 기반. 로그인 후 Supabase 동기화는 v1.

export interface ReportRecord {
  id?: string;
  timestamp?: string;
  defect_type?: { ko: string; en: string };
  severity?: string;
  summary?: string;
  causes?: { rank: number; category: string; description: string; probability?: number }[];
  recommendations?: { parameter: string; current: string; recommended: string }[];
  checklist?: { before_changes?: string[]; after_changes?: string[]; escalation?: string[] } | string[];
  beforeResin?: string;
  beforeSettings?: Record<string, string>;
  afterSettings?: Record<string, string>;
  resolved?: boolean | string;
  resolvedMemo?: string;
  resolvedAt?: string;
  beforePhoto?: string;   // base64 JPEG
  afterPhoto?: string;    // base64 JPEG
  [key: string]: unknown;
}

const SETTINGS_LABELS: Record<string, string> = {
  nozzleTemp: '노즐 온도', zone1Temp: 'Z1', zone2Temp: 'Z2', zone3Temp: 'Z3', zone4Temp: 'Z4',
  moldTempFixed: '금형(고)', moldTempMoving: '금형(동)',
  injPressure1: '사출압', holdPressure: '보압',
  injSpeed1: '사출속도1', injSpeed2: '사출속도2',
  holdTime: '보압시간', coolTime: '냉각시간', backPressure: '배압', screwRpm: 'RPM',
};

function ResolvedLabel({ s }: { s?: boolean | string }) {
  if (s === true || s === 'solved') return <span style={{ color: '#047857', fontWeight: 700 }}>✅ 완전 해결</span>;
  if (s === 'partial') return <span style={{ color: '#854F0B', fontWeight: 700 }}>△ 부분 개선</span>;
  if (s === 'unsolved') return <span style={{ color: '#B42318', fontWeight: 700 }}>✗ 미해결</span>;
  return null;
}

function SeverityLabel({ s }: { s?: string }) {
  const map: Record<string, string> = { high: '높음(HIGH)', medium: '보통(MEDIUM)', low: '낮음(LOW)' };
  return <span>{s ? (map[s] ?? s) : '—'}</span>;
}

interface ReportProps {
  record: ReportRecord;
  authorName?: string;
  companyName?: string;
  locale?: string;
}

// 실제 A4 레이아웃 — html2canvas 캡처 대상
export function ReportLayout({ record, authorName, companyName }: ReportProps) {
  const date = record.timestamp
    ? new Date(record.timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  const resolvedDate = record.resolvedAt
    ? new Date(record.resolvedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const chklist = (() => {
    if (!record.checklist) return [];
    if (Array.isArray(record.checklist)) return record.checklist as string[];
    const c = record.checklist as { before_changes?: string[]; after_changes?: string[] };
    return [...(c.before_changes ?? []), ...(c.after_changes ?? [])];
  })();

  const settingKeys = Object.keys(SETTINGS_LABELS);
  const beforeKeys = settingKeys.filter(k => record.beforeSettings?.[k]);
  const afterKeys  = settingKeys.filter(k => record.afterSettings?.[k]);
  const allKeys    = Array.from(new Set([...beforeKeys, ...afterKeys]));

  return (
    <div style={{ width: 794, fontFamily: 'Pretendard Variable, sans-serif', background: '#fff', color: '#14171C', fontSize: 13, lineHeight: 1.5 }}>
      {/* Header */}
      <div style={{ background: '#1E5FA5', color: '#fff', padding: '20px 32px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Mold Doctor AI 추정 리포트</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>사출 불량 트러블슈팅 기록</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.9 }}>
          {companyName && <div style={{ fontWeight: 700 }}>{companyName}</div>}
          {authorName  && <div>{authorName}</div>}
          <div>{date}</div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 불량 정보 */}
        <section>
          <div style={{ fontWeight: 800, fontSize: 15, borderBottom: '2px solid #1E5FA5', paddingBottom: 4, marginBottom: 12 }}>1. 불량 정보</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                {[
                  ['불량 유형', record.defect_type?.ko ?? '—'],
                  ['수지', record.beforeResin ?? '—'],
                  ['심각도', ''],
                  ['추정 요약', record.summary ?? '—'],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #E3E6EA' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600, color: '#45505B', width: 90, whiteSpace: 'nowrap' }}>{label}</td>
                    <td style={{ padding: '5px 8px' }}>
                      {label === '심각도' ? <SeverityLabel s={record.severity} /> : value}
                    </td>
                  </tr>
                ))}
              </table>
            </div>
            {record.beforePhoto && (
              <div style={{ width: 180, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>불량 사진 (분석 전)</div>
                <img src={`data:image/jpeg;base64,${record.beforePhoto}`}
                  style={{ width: 180, height: 130, objectFit: 'cover', borderRadius: 8, border: '1px solid #E3E6EA' }} alt="before" />
              </div>
            )}
          </div>
        </section>

        {/* 추정 원인 */}
        {record.causes && record.causes.length > 0 && (
          <section>
            <div style={{ fontWeight: 800, fontSize: 15, borderBottom: '2px solid #1E5FA5', paddingBottom: 4, marginBottom: 12 }}>2. 추정 원인</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#EEF1F5' }}>
                  {['순위', '분류', '원인', '확률'].map(h => (
                    <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {record.causes.slice(0, 4).map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #E3E6EA' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 700 }}>{c.rank}</td>
                    <td style={{ padding: '5px 8px', color: '#45505B' }}>{c.category}</td>
                    <td style={{ padding: '5px 8px' }}>{c.description}</td>
                    <td style={{ padding: '5px 8px', color: '#1E5FA5', fontWeight: 600 }}>{c.probability ? `${c.probability}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 셋팅 비교 */}
        {allKeys.length > 0 && (
          <section>
            <div style={{ fontWeight: 800, fontSize: 15, borderBottom: '2px solid #1E5FA5', paddingBottom: 4, marginBottom: 12 }}>3. 셋팅값 Before → After</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#EEF1F5' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>항목</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, color: '#B42318' }}>분석 전</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, color: '#047857' }}>조치 후</th>
                </tr>
              </thead>
              <tbody>
                {allKeys.map(k => {
                  const bv = record.beforeSettings?.[k] ?? '—';
                  const av = record.afterSettings?.[k] ?? '—';
                  const changed = bv !== av && av !== '—';
                  return (
                    <tr key={k} style={{ borderBottom: '1px solid #E3E6EA', background: changed ? '#F0FAF5' : undefined }}>
                      <td style={{ padding: '5px 8px', color: '#45505B' }}>{SETTINGS_LABELS[k] ?? k}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>{bv}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: changed ? 700 : 400, color: changed ? '#047857' : undefined }}>{av}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* 조정안 */}
        {record.recommendations && record.recommendations.length > 0 && (
          <section>
            <div style={{ fontWeight: 800, fontSize: 15, borderBottom: '2px solid #1E5FA5', paddingBottom: 4, marginBottom: 12 }}>4. 주요 조정안</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#EEF1F5' }}>
                  {['파라미터', '현재', '권장'].map(h => (
                    <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {record.recommendations.slice(0, 5).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #E3E6EA' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{r.parameter}</td>
                    <td style={{ padding: '5px 8px', color: '#B42318' }}>{r.current}</td>
                    <td style={{ padding: '5px 8px', color: '#047857', fontWeight: 600 }}>{r.recommended}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 조치 결과 */}
        <section>
          <div style={{ fontWeight: 800, fontSize: 15, borderBottom: '2px solid #1E5FA5', paddingBottom: 4, marginBottom: 12 }}>5. 조치 결과</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>결과 상태: </span>
                <ResolvedLabel s={record.resolved} />
              </div>
              {resolvedDate && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 700 }}>확인 일자: </span>{resolvedDate}
                </div>
              )}
              {record.resolvedMemo && (
                <div style={{ background: '#EEF1F5', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>조치 메모</div>
                  <div>{record.resolvedMemo}</div>
                </div>
              )}
            </div>
            {record.afterPhoto && (
              <div style={{ width: 180, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>해결 사진 (조치 후)</div>
                <img src={`data:image/jpeg;base64,${record.afterPhoto}`}
                  style={{ width: 180, height: 130, objectFit: 'cover', borderRadius: 8, border: '1px solid #E3E6EA' }} alt="after" />
              </div>
            )}
          </div>
        </section>

        {/* 체크리스트 */}
        {chklist.length > 0 && (
          <section>
            <div style={{ fontWeight: 800, fontSize: 15, borderBottom: '2px solid #1E5FA5', paddingBottom: 4, marginBottom: 12 }}>6. 체크리스트</div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {chklist.slice(0, 8).map((item, i) => (
                <li key={i} style={{ fontSize: 12, marginBottom: 4, color: '#45505B' }}>☐ {item}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 면책 */}
        <div style={{ borderTop: '1px solid #E3E6EA', paddingTop: 12, fontSize: 11, color: '#6B7280', textAlign: 'center' }}>
          본 리포트는 AI 추정 기반 참고자료입니다. 최종 판단은 현장 엔지니어의 검증이 필요합니다.
          <br />Mold Doctor AI · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

interface ReportModalProps {
  record: ReportRecord;
  onClose: () => void;
}

export function ReportModal({ record, onClose }: ReportModalProps) {
  const [authorName, setAuthorName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf').then(m => ({ jsPDF: m.jsPDF })),
      ]);
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      let remaining = imgH;
      let pos = 0;
      pdf.addImage(imgData, 'PNG', 0, pos, pdfW, imgH);
      remaining -= pdfH;
      while (remaining > 0) {
        pos = remaining - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, pos, pdfW, imgH);
        remaining -= pdfH;
      }
      const defect = record.defect_type?.en?.replace(/\s/g, '-') ?? 'report';
      pdf.save(`mold-doctor-${defect}-${Date.now()}.pdf`);
    } catch (e) {
      alert('PDF 생성 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl w-full max-w-md p-6 mt-8 mb-8 space-y-4">
        <h2 className="text-lg font-bold text-ink">PDF 리포트 생성</h2>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">작업자 이름 (선택)</label>
          <input className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-3 text-base text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
            placeholder="홍길동" value={authorName} onChange={e => setAuthorName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">업체 / 현장명 (선택)</label>
          <input className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-3 text-base text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
            placeholder="OO 공장" value={companyName} onChange={e => setCompanyName(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={generate} disabled={generating}
            className="flex-1 bg-brand text-on-brand py-3 rounded-xl font-bold text-base hover:bg-brand-ink transition-colors disabled:opacity-60 min-h-[44px]">
            {generating ? '생성 중...' : '리포트 생성'}
          </button>
          <button type="button" onClick={onClose}
            className="px-5 py-3 rounded-xl border border-border text-muted font-medium hover:bg-surface-sunken transition-colors min-h-[44px]">
            취소
          </button>
        </div>

        {/* 숨겨진 리포트 레이아웃 (캡처 대상) */}
        <div style={{ position: 'absolute', top: -9999, left: 0, pointerEvents: 'none' }}>
          <div ref={reportRef}>
            <ReportLayout record={record} authorName={authorName} companyName={companyName} />
          </div>
        </div>
      </div>
    </div>
  );
}

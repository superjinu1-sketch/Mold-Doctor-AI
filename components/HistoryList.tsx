'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { ReportModal } from '@/components/ResolutionReport';
import type { HistoryRecord } from '@/lib/history-sync';

function SeverityBadge({ severity }: { severity?: string }) {
  if (!severity) return null;
  const cls =
    severity === 'high'
      ? 'bg-[var(--danger-bg)] text-danger border border-[var(--danger-border)]'
      : severity === 'medium'
      ? 'bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)]'
      : 'bg-brand-tint text-brand-ink border border-[var(--brand-border)]';
  const labels: Record<string, string> = { high: 'HIGH', medium: 'MED', low: 'LOW' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {labels[severity] ?? severity.toUpperCase()}
    </span>
  );
}

function ResolvedBadge({ resolved, t }: { resolved?: boolean | string; t: (k: string) => string }) {
  if (resolved === true || resolved === 'solved') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--ok-bg)] text-ok border border-[var(--ok-border)]">{t('history.solved')}</span>;
  }
  if (resolved === 'partial') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)]">{t('history.partial')}</span>;
  }
  if (resolved === 'unsolved') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--danger-bg)] text-danger border border-[var(--danger-border)]">{t('history.unsolved')}</span>;
  }
  return null;
}

function rankAccent(rank: number) {
  if (rank === 1) return { num: 'bg-danger text-on-brand', pct: 'text-danger', bar: 'bg-danger' };
  if (rank === 2) return { num: 'bg-warn text-on-brand', pct: 'text-warn', bar: 'bg-warn' };
  return { num: 'bg-[var(--border-strong)] text-ink', pct: 'text-muted', bar: 'bg-[var(--border-strong)]' };
}

function formatDate(ts: string, locale: string) {
  try {
    return new Date(ts).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return ts.slice(0, 16).replace('T', ' ');
  }
}

// 진단 히스토리 리스트 — /history(redirect)·/account 공용. 데이터 소스는 부모가 주입.
export default function HistoryList({ records }: { records: HistoryRecord[] }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reportRecord, setReportRecord] = useState<HistoryRecord | null>(null);

  const handleRestore = (record: HistoryRecord) => {
    try {
      sessionStorage.setItem('molddoctor_restore', JSON.stringify(record));
    } catch { /* ignore */ }
    router.push('/diagnose');
  };

  const defectLabel = (r: HistoryRecord) =>
    locale === 'en' ? (r.defect_type?.en ?? '—') : (r.defect_type?.ko ?? r.defect_type?.en ?? '—');

  if (reportRecord) {
    return <ReportModal record={reportRecord} onClose={() => setReportRecord(null)} />;
  }

  if (records.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-card-lg)] p-10 text-center">
        <p className="text-muted text-body">{t('history.empty')}</p>
        <a href="/diagnose"
          className="mt-5 ui-cta inline-flex px-6 text-body">
          {locale === 'en' ? 'Start analysis' : '추정 시작하기'}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div
          key={r.id}
          className="ui-card p-0 overflow-hidden"
          style={{ contentVisibility: 'auto', containIntrinsicSize: expanded === r.id ? '0 600px' : '0 88px' }}
        >
          <button
            type="button"
            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            className="w-full text-left px-4 py-4 flex items-start gap-3 min-h-[44px] hover:bg-surface-sunken transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-body font-bold text-ink truncate">{defectLabel(r)}</span>
                <SeverityBadge severity={r.severity} />
                <ResolvedBadge resolved={r.resolved} t={t} />
              </div>
              <div className="text-faint text-sm">
                {r.beforeResin && <span className="mr-2">{r.beforeResin}</span>}
                <span>{formatDate(r.timestamp, locale)}</span>
                {r.round && r.round > 1 && <span className="ml-2 text-warn">{r.round}차</span>}
              </div>
              {r.summary && <p className="text-muted text-sm mt-1 line-clamp-1">{r.summary}</p>}
            </div>
            <span className="text-faint text-sm shrink-0 mt-0.5">{expanded === r.id ? '▲' : '▼'}</span>
          </button>

          {expanded === r.id && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
              {(r.resolved === true || typeof r.resolved === 'string') && (
                <div className="bg-[var(--ok-bg)] border border-[var(--ok-border)] rounded-xl p-3">
                  <div className="text-sm font-bold text-ok mb-1">✅ {t('history.resolved_detail')}</div>
                  <div className="text-sm text-muted">
                    <ResolvedBadge resolved={r.resolved} t={t} />
                    {r.resolvedMemo && <span className="ml-2">{r.resolvedMemo}</span>}
                  </div>
                </div>
              )}

              {(r.beforePhoto || r.afterPhoto) && (
                <div className="flex gap-3">
                  {r.beforePhoto && (
                    <div className="flex-1">
                      <div className="text-xs text-faint mb-1">{t('history.before_photo')}</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`data:image/jpeg;base64,${r.beforePhoto}`} alt="before"
                        className="w-full h-28 object-cover rounded-lg border border-border" />
                    </div>
                  )}
                  {r.afterPhoto && (
                    <div className="flex-1">
                      <div className="text-xs text-faint mb-1">{t('history.after_photo')}</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`data:image/jpeg;base64,${r.afterPhoto}`} alt="after"
                        className="w-full h-28 object-cover rounded-lg border border-[var(--ok-border)]" />
                    </div>
                  )}
                </div>
              )}

              {r.beforeSettings && Object.values(r.beforeSettings).some(Boolean) && (
                <div>
                  <div className="text-xs font-bold text-faint uppercase tracking-wider mb-2">{t('history.before_settings')}</div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(r.beforeSettings).filter(([, v]) => v).slice(0, 8).map(([k, v]) => (
                      <div key={k} className="text-sm text-muted">
                        <span className="text-faint">{k}: </span>{v}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {r.causes && r.causes.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-faint uppercase tracking-wider mb-2">
                    {locale === 'en' ? 'Likely cause' : '추정 원인'}
                  </div>
                  <div className="space-y-2">
                    {r.causes.slice(0, 2).map((c) => {
                      const a = rankAccent(c.rank);
                      const hasP = typeof c.probability === 'number';
                      return (
                        <div key={c.rank} className="bg-surface-sunken rounded-lg p-2.5">
                          <div className="flex items-start gap-2">
                            <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${a.num}`}>{c.rank}</span>
                            <span className="flex-1 min-w-0 text-sm font-medium text-ink leading-snug">{c.description}</span>
                            {hasP && <span className={`shrink-0 text-sm font-bold tabular-nums ${a.pct}`}>{c.probability}%</span>}
                          </div>
                          {hasP && (
                            <div className="mt-1.5 w-full bg-surface rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${a.bar}`} style={{ width: `${c.probability}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {r.recommendations && r.recommendations.length > 0 && (
                <div>
                  <div className="text-[length:var(--text-label)] font-bold text-brand-ink mb-2">
                    {locale === 'en' ? 'Key adjustments' : '주요 조정안'}
                  </div>
                  <div className="space-y-1.5">
                    {r.recommendations.slice(0, 3).map((rec, i) => (
                      <div key={i} className="bg-surface-sunken rounded-lg px-3 py-2 border border-[var(--brand-border)]">
                        <div className="text-sm font-medium text-muted mb-0.5">{rec.parameter}</div>
                        <div className="flex items-start gap-1.5 text-sm">
                          <span className="min-w-0 break-words text-muted">{rec.current || '-'}</span>
                          <span className="shrink-0 text-faint">→</span>
                          <span className="min-w-0 break-words font-bold text-ink">{rec.recommended}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-dashed border-border rounded-xl px-4 py-3 text-center">
                <span className="text-faint text-sm">{t('history.similar_placeholder')}</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRestore(r)}
                  className="ui-cta flex-1 text-body"
                >
                  {t('history.restore')}
                </button>
                <button
                  type="button"
                  onClick={() => setReportRecord(r)}
                  className="inline-flex items-center px-4 rounded-[var(--radius-cta)] border border-border-strong text-muted font-semibold hover:bg-surface-sunken transition-colors min-h-[var(--touch-cta-lg)] text-body"
                >
                  {t('history.pdf_report')}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

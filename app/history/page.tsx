'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';

// v0: localStorage. 로그인 사용자는 추후 Supabase 동기화 예정(v1).
const LS_KEY = 'diagnoseHistory';

interface HistoryRecord {
  id: string;
  timestamp: string;
  round?: number;
  defect_type?: { ko: string; en: string };
  severity?: string;
  summary?: string;
  session_id?: string;
  resolved?: boolean | string;
  resolvedAt?: string;
  resolvedMemo?: string;
  beforeResin?: string;
  beforeSettings?: Record<string, string>;
  recommendations?: { parameter: string; current: string; recommended: string }[];
  [key: string]: unknown;
}

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

function formatDate(ts: string, locale: string) {
  try {
    return new Date(ts).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return ts.slice(0, 16).replace('T', ' ');
  }
}

function HistoryContent() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      setRecords(JSON.parse(raw || '[]'));
    } catch { setRecords([]); }
  }, []);

  const handleRestore = (record: HistoryRecord) => {
    try {
      sessionStorage.setItem('molddoctor_restore', JSON.stringify(record));
    } catch { /* ignore */ }
    router.push('/diagnose');
  };

  const defectLabel = (r: HistoryRecord) =>
    locale === 'en' ? (r.defect_type?.en ?? '—') : (r.defect_type?.ko ?? r.defect_type?.en ?? '—');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/diagnose" className="text-brand-ink hover:text-brand text-sm font-medium flex items-center gap-1 min-h-[44px]">
          ← {t('history.back')}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-ink mb-6">{t('history.title')}</h1>

      {records.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <p className="text-muted text-base">{t('history.empty')}</p>
          <Link href="/diagnose"
            className="mt-5 inline-flex items-center justify-center bg-brand text-on-brand px-6 py-3 rounded-full font-bold text-sm hover:bg-brand-ink transition-colors min-h-[44px]">
            {locale === 'en' ? 'Start analysis' : '추정 시작하기'}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              {/* Card header */}
              <button
                type="button"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full text-left px-4 py-4 flex items-start gap-3 min-h-[44px] hover:bg-surface-sunken transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-base font-bold text-ink truncate">{defectLabel(r)}</span>
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

              {/* Expanded detail */}
              {expanded === r.id && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                  {/* Resolved record */}
                  {(r.resolved === true || typeof r.resolved === 'string') && (
                    <div className="bg-[var(--ok-bg)] border border-[var(--ok-border)] rounded-xl p-3">
                      <div className="text-sm font-bold text-ok mb-1">✅ {t('history.resolved_detail')}</div>
                      <div className="text-sm text-muted">
                        <ResolvedBadge resolved={r.resolved} t={t} />
                        {r.resolvedMemo && <span className="ml-2">{r.resolvedMemo}</span>}
                      </div>
                    </div>
                  )}

                  {/* Before settings */}
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

                  {/* Top recommendations */}
                  {r.recommendations && r.recommendations.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-faint uppercase tracking-wider mb-2">
                        {locale === 'en' ? 'Key adjustments' : '주요 조정안'}
                      </div>
                      <ul className="space-y-1">
                        {r.recommendations.slice(0, 3).map((rec, i) => (
                          <li key={i} className="text-sm text-muted flex gap-2">
                            <span className="text-brand-ink shrink-0">→</span>
                            <span>{rec.parameter}: {rec.current} → {rec.recommended}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* v1 placeholder: similar cases */}
                  <div className="border border-dashed border-border rounded-xl px-4 py-3 text-center">
                    <span className="text-faint text-sm">{t('history.similar_placeholder')}</span>
                  </div>

                  {/* Actions */}
                  <button
                    type="button"
                    onClick={() => handleRestore(r)}
                    className="w-full bg-brand text-on-brand py-3 rounded-xl font-bold text-base hover:bg-brand-ink transition-colors min-h-[44px]"
                  >
                    {t('history.restore')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">로딩 중...</div>}>
      <HistoryContent />
    </Suspense>
  );
}

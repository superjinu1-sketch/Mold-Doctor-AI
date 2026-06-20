'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { authHeaders } from '@/lib/supabase/authHeader';
import { apiUrl } from '@/lib/apiBase';
import { ReportModal } from '@/components/ResolutionReport';
import type { HistoryRecord, DiagnosisCause, DiagnosisRec } from '@/lib/history-sync';

interface RetestResult {
  summary?: string;
  causes?: DiagnosisCause[];
  recommendations?: DiagnosisRec[];
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

// 진단 히스토리 리스트 — /history(redirect)·/account 공용. 데이터 소스는 부모가 주입.
export default function HistoryList({ records }: { records: HistoryRecord[] }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reportRecord, setReportRecord] = useState<HistoryRecord | null>(null);

  // dev 화이트리스트 (NEXT_PUBLIC_DEV_EMAILS, 미설정 시 기능 off)
  const devEmailList = (process.env.NEXT_PUBLIC_DEV_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isDev = devEmailList.length > 0 && devEmailList.includes((user?.email || '').toLowerCase());

  const [retestResult, setRetestResult] = useState<Record<string, RetestResult>>({});
  const [retestLoading, setRetestLoading] = useState<Record<string, boolean>>({});
  const [retestError, setRetestError] = useState<Record<string, string>>({});
  const [retestExpanded, setRetestExpanded] = useState<Record<string, boolean>>({});

  const handleRestore = (record: HistoryRecord) => {
    try {
      sessionStorage.setItem('molddoctor_restore', JSON.stringify(record));
    } catch { /* ignore */ }
    router.push('/diagnose');
  };

  const handleRetest = async (r: HistoryRecord) => {
    if (!r.beforeInput) return;
    setRetestLoading(prev => ({ ...prev, [r.id]: true }));
    setRetestError(prev => ({ ...prev, [r.id]: '' }));
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const body = {
        ...(r.beforeInput as Record<string, unknown>),
        images: r.beforePhoto ? [{ data: r.beforePhoto, mediaType: 'image/jpeg' }] : [],
        moldDrawings: [],
        isRetest: true,
        isDemo: false,
      };
      const res = await fetch(apiUrl('/api/diagnose'), { method: 'POST', headers, body: JSON.stringify(body) });
      const data: RetestResult = await res.json();
      if (!res.ok) throw new Error((data as Record<string, unknown>).error as string || '재진단 실패');
      setRetestResult(prev => ({ ...prev, [r.id]: data }));
    } catch (e) {
      setRetestError(prev => ({ ...prev, [r.id]: e instanceof Error ? e.message : '재진단 실패' }));
    } finally {
      setRetestLoading(prev => ({ ...prev, [r.id]: false }));
    }
  };

  const defectLabel = (r: HistoryRecord) =>
    locale === 'en' ? (r.defect_type?.en ?? '—') : (r.defect_type?.ko ?? r.defect_type?.en ?? '—');

  if (reportRecord) {
    return <ReportModal record={reportRecord} onClose={() => setReportRecord(null)} />;
  }

  if (records.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-10 text-center">
        <p className="text-muted text-base">{t('history.empty')}</p>
        <a href="/diagnose"
          className="mt-5 inline-flex items-center justify-center bg-brand text-on-brand px-6 py-3 rounded-full font-bold text-sm hover:bg-brand-ink transition-colors min-h-[44px]">
          {locale === 'en' ? 'Start analysis' : '추정 시작하기'}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div key={r.id} className="bg-surface border border-border rounded-xl overflow-hidden">
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

              <div className="border border-dashed border-border rounded-xl px-4 py-3 text-center">
                <span className="text-faint text-sm">{t('history.similar_placeholder')}</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRestore(r)}
                  className="flex-1 bg-brand text-on-brand py-3 rounded-xl font-bold text-base hover:bg-brand-ink transition-colors min-h-[44px]"
                >
                  {t('history.restore')}
                </button>
                <button
                  type="button"
                  onClick={() => setReportRecord(r)}
                  className="px-4 py-3 rounded-xl border border-border text-muted font-medium hover:bg-surface-sunken transition-colors min-h-[44px] text-sm"
                >
                  {t('history.pdf_report')}
                </button>
              </div>

              {isDev && r.beforeInput && (
                <button
                  type="button"
                  onClick={() => handleRetest(r)}
                  disabled={retestLoading[r.id]}
                  className="w-full flex items-center justify-center gap-2 bg-surface-sunken border border-border rounded-xl px-4 py-3 text-muted font-medium hover:border-[var(--brand-border)] hover:text-brand-ink transition-colors min-h-[44px] text-sm disabled:opacity-50"
                >
                  {retestLoading[r.id] ? (
                    <>
                      <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      재진단 중...
                    </>
                  ) : '🔄 재진단(dev)'}
                </button>
              )}

              {retestError[r.id] && (
                <p className="text-danger text-sm text-center bg-[var(--danger-bg)] rounded-lg px-3 py-2 border border-[var(--danger-border)]">
                  {retestError[r.id]}
                </p>
              )}

              {isDev && retestResult[r.id] && (() => {
                const rt = retestResult[r.id];
                const beforeCause = r.causes?.[0];
                const afterCause = rt.causes?.[0];
                const causeChanged = beforeCause && afterCause && beforeCause.category !== afterCause.category;
                return (
                  <div className="border border-[var(--brand-border)] rounded-xl overflow-hidden">
                    <div className="bg-brand-tint px-4 py-2.5 flex items-center gap-2">
                      <span className="text-sm font-bold text-brand-ink">비교 결과</span>
                      <span className="px-2 py-0.5 bg-surface-sunken text-muted text-xs rounded-full">기존</span>
                      <span className="text-faint text-xs">vs</span>
                      <span className="px-2 py-0.5 bg-brand text-on-brand text-xs rounded-full font-bold">재진단</span>
                    </div>
                    <div className="p-3 space-y-4">
                      <div>
                        <div className="text-xs font-bold text-faint uppercase tracking-wider mb-2">요약</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-surface-sunken rounded-lg p-3">
                            <div className="text-xs text-faint mb-1 font-semibold">기존</div>
                            <p className="text-sm text-muted">{r.summary || '—'}</p>
                          </div>
                          <div className="bg-brand-tint rounded-lg p-3">
                            <div className="text-xs text-brand-ink mb-1 font-semibold">재진단</div>
                            <p className="text-sm text-muted">{rt.summary || '—'}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-faint uppercase tracking-wider mb-2">1순위 원인</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-surface-sunken rounded-lg p-3">
                            <div className="text-xs text-faint mb-1 font-semibold">기존</div>
                            {beforeCause ? (
                              <p className="text-sm text-muted">[{beforeCause.category}] {beforeCause.description} ({beforeCause.probability}%)</p>
                            ) : <p className="text-sm text-faint">—</p>}
                          </div>
                          <div className={`rounded-lg p-3 ${causeChanged ? 'bg-brand-tint border border-[var(--brand-border)]' : 'bg-surface-sunken'}`}>
                            <div className={`text-xs mb-1 font-semibold ${causeChanged ? 'text-brand-ink' : 'text-faint'}`}>
                              재진단{causeChanged && ' ← 변화'}
                            </div>
                            {afterCause ? (
                              <p className={`text-sm ${causeChanged ? 'text-brand-ink font-semibold' : 'text-muted'}`}>
                                [{afterCause.category}] {afterCause.description} ({afterCause.probability}%)
                              </p>
                            ) : <p className="text-sm text-faint">—</p>}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-faint uppercase tracking-wider mb-2">조정안 TOP 3</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-surface-sunken rounded-lg p-3 space-y-1">
                            <div className="text-xs text-faint mb-1 font-semibold">기존</div>
                            {(r.recommendations || []).slice(0, 3).map((rec, i) => (
                              <div key={i} className="text-sm text-muted flex gap-1.5">
                                <span className="text-faint shrink-0">{i + 1}.</span>
                                <span>{rec.parameter}: {rec.recommended}</span>
                              </div>
                            ))}
                          </div>
                          <div className="bg-brand-tint rounded-lg p-3 space-y-1">
                            <div className="text-xs text-brand-ink mb-1 font-semibold">재진단</div>
                            {(rt.recommendations || []).slice(0, 3).map((rec, i) => (
                              <div key={i} className="text-sm text-muted flex gap-1.5">
                                <span className="text-faint shrink-0">{i + 1}.</span>
                                <span>{rec.parameter}: {rec.recommended}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setRetestExpanded(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                        className="w-full text-center text-sm text-brand-ink min-h-[44px] flex items-center justify-center gap-1 hover:bg-surface-sunken rounded-lg transition-colors"
                      >
                        {retestExpanded[r.id] ? '접기 ▲' : '전체 재진단 결과 펼치기 ▼'}
                      </button>

                      {retestExpanded[r.id] && (
                        <div className="space-y-2">
                          {(rt.causes || []).map((c, i) => (
                            <div key={i} className="flex gap-2 text-sm text-muted py-1 border-b border-border last:border-0">
                              <span className="text-faint shrink-0 font-semibold">{c.rank}.</span>
                              <span className="text-faint shrink-0">[{c.category}]</span>
                              <span className="flex-1">{c.description} <span className="text-faint">({c.probability}%)</span></span>
                            </div>
                          ))}
                          {(rt.recommendations || []).length > 3 && (
                            <div className="text-xs text-faint mt-2">
                              {locale === 'en' ? '+ more recommendations in full result' : `+ 조정안 ${rt.recommendations!.length - 3}개 추가`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

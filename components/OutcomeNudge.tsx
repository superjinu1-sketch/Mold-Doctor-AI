'use client';

// 지난 추정 결과 기록 유도(2026-10-26). 10월 가입자 추정 11건 중 결과 기록 0건 — 결과 화면 맨 아래
// 기록 폼까지 내려가지 않고 떠난다. 다시 들어왔을 때 아직 기록이 없는 최근 추정 1건을 한 번 탭으로 받는다.
// 대상: 2시간~21일 전, resolved 없음, "나중에"로 넘기지 않은 건. 저장은 결과 패널과 같은 경로(로컬 + 서버).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchServerHistory, updateResolution, type HistoryRecord } from '@/lib/history-sync';
import { requestInAppReviewIfEligible } from '@/lib/inAppReview';

const DISMISS_KEY = 'molddoctor_outcome_nudge_dismissed';
const MIN_AGE_MS = 2 * 3600 * 1000;
const MAX_AGE_MS = 21 * 24 * 3600 * 1000;

type Status = 'solved' | 'partial' | 'unsolved';

function readDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; }
}

function readLocal(): HistoryRecord[] {
  try { return JSON.parse(localStorage.getItem('diagnoseHistory') || '[]'); } catch { return []; }
}

function pickPending(records: HistoryRecord[], dismissed: string[]): HistoryRecord | null {
  const now = Date.now();
  const pending = records
    .filter(r => r?.id && r.timestamp && !r.resolved && !dismissed.includes(r.id))
    .filter(r => {
      const age = now - new Date(r.timestamp).getTime();
      return age >= MIN_AGE_MS && age <= MAX_AGE_MS;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return pending[0] ?? null;
}

export default function OutcomeNudge() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [record, setRecord] = useState<HistoryRecord | null>(null);
  const [saved, setSaved] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dismissed = readDismissed();
      let records = readLocal();
      if (user) {
        const server = await fetchServerHistory(user.id);
        if (server) records = server;
      }
      if (!cancelled) setRecord(pickPending(records, dismissed));
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!record) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...readDismissed(), record.id].slice(-50))); } catch { /* ignore */ }
    setRecord(null);
  };

  const save = async (status: Status) => {
    setBusy(true);
    const resolvedAt = new Date().toISOString();
    try {
      const history = readLocal();
      const idx = history.findIndex(h => h.id === record.id);
      if (idx !== -1) {
        history[idx].resolved = status;
        history[idx].resolvedAt = resolvedAt;
        localStorage.setItem('diagnoseHistory', JSON.stringify(history));
      }
    } catch { /* ignore */ }
    if (user) await updateResolution(record.id, user.id, { resolved: status, resolvedAt });
    if (status === 'solved') void requestInAppReviewIfEligible();
    setBusy(false);
    setSaved(status);
  };

  const defect = (locale === 'en' ? record.defect_type?.en : record.defect_type?.ko) || record.defect_type?.ko || record.defect_type?.en || '';
  const date = new Date(record.timestamp).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' });
  const btn = 'min-h-[var(--touch-min)] px-4 rounded-[var(--radius-cta)] border border-border bg-surface text-ink text-body font-semibold hover:border-[var(--brand-border)] hover:bg-brand-tint transition-colors disabled:opacity-50';

  return (
    <div className="bg-surface border border-[var(--brand-border)] rounded-[var(--radius-card)] p-4" role="region" aria-label={t('nudge.outcome_title')}>
      {saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body text-ink font-semibold">{t('nudge.outcome_thanks')}</p>
          <Link href="/account" className="text-body text-brand font-semibold min-h-[var(--touch-min)] inline-flex items-center">{t('nudge.outcome_open_record')}</Link>
        </div>
      ) : (
        <>
          <p className="text-[length:var(--text-subhead)] font-semibold text-ink">{t('nudge.outcome_title')}</p>
          <p className="text-body text-muted mt-0.5">{defect}{defect ? ' · ' : ''}{date}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" disabled={busy} onClick={() => save('solved')} className={btn}>✓ {t('history.solved')}</button>
            <button type="button" disabled={busy} onClick={() => save('partial')} className={btn}>△ {t('history.partial')}</button>
            <button type="button" disabled={busy} onClick={() => save('unsolved')} className={btn}>✗ {t('history.unsolved')}</button>
            <button type="button" onClick={dismiss} className="min-h-[var(--touch-min)] px-3 text-body text-muted font-medium">{t('nudge.outcome_later')}</button>
          </div>
        </>
      )}
    </div>
  );
}

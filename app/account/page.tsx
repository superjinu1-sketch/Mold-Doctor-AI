'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import HistoryList from '@/components/HistoryList';
import { fetchServerHistory, fetchLedger, migrateLocalHistory, type HistoryRecord, type LedgerEntry } from '@/lib/history-sync';
import { authHeaders } from '@/lib/supabase/authHeader';

function loadLocalHistory(): HistoryRecord[] {
  try {
    return JSON.parse(localStorage.getItem('diagnoseHistory') || '[]');
  } catch {
    return [];
  }
}

function ledgerKindLabel(kind: string, t: (k: string) => string): string {
  const label = t(`ledger.kind.${kind}`);
  return label === `ledger.kind.${kind}` ? kind : label; // 미정의 키 폴백
}

function formatLedgerDate(ts: string, locale: string) {
  try {
    return new Date(ts).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return ts.slice(0, 10);
  }
}

export default function AccountPage() {
  const { t, locale } = useLocale();
  const { user, loading, credits, signOut } = useAuth();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (deleteText !== '삭제') return;
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) throw new Error('delete failed');
      // 로컬 흔적 제거 후 로그아웃·홈 이동
      try {
        localStorage.removeItem('diagnoseHistory');
        localStorage.removeItem('historyMigratedV1');
      } catch {}
      await signOut();
      window.location.href = '/';
    } catch {
      setDeleting(false);
      alert(t('account.delete_error'));
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user) {
        // 첫 로그인 1회 이관(idempotent/flag) 후 서버 로드. 실패 시 localStorage 폴백.
        await migrateLocalHistory(user.id);
        const [server, led] = await Promise.all([fetchServerHistory(user.id), fetchLedger(user.id)]);
        if (cancelled) return;
        setRecords(server ?? loadLocalHistory());
        setLedger(led);
      } else {
        // 비로그인: localStorage 폴백 (회귀 0)
        setRecords(loadLocalHistory());
        setLedger([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-[length:var(--text-h2)] font-bold text-ink mb-6">{t('account.title')}</h1>

      {/* ① 계정 헤더 */}
      <div className="ui-card ui-card-lg p-5 mb-4">
        {!loading && user ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-label text-faint mb-0.5">{t('account.signed_in_as')}</div>
              <div className="text-body text-ink font-semibold truncate">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="shrink-0 min-h-[var(--touch-min)] px-4 rounded-full border border-border-strong text-muted hover:text-ink hover:bg-surface-sunken text-sm font-medium transition-colors"
            >
              {t('auth.signout')}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-body text-muted">{t('account.login_prompt')}</p>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="shrink-0 min-h-[var(--touch-cta)] px-5 rounded-full bg-brand text-on-brand font-bold text-sm hover:bg-brand-ink transition-colors"
            >
              {t('auth.login')}
            </button>
          </div>
        )}
      </div>

      {/* ② 크레딧 카드 + 거래내역 */}
      {!loading && user && (
        <div className="ui-card ui-card-lg p-5 mb-4">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <div className="text-label text-faint mb-1">{t('account.credit_balance')}</div>
              <div className="text-[length:var(--text-h2)] font-black text-ink tabular-nums">{credits ?? '—'}</div>
            </div>
            <a
              href="/pricing"
              className="shrink-0 min-h-[var(--touch-cta)] flex items-center px-5 rounded-full ui-cta-secondary font-bold text-sm hover:bg-[var(--brand-border)] transition-colors"
            >
              {t('account.recharge')}
            </a>
          </div>

          <div className="text-label font-bold text-faint uppercase tracking-wider mb-2">{t('account.ledger')}</div>
          {ledger.length === 0 ? (
            <p className="text-body text-muted">{t('account.ledger_empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {ledger.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-body text-ink">{ledgerKindLabel(e.kind, t)}</div>
                    <div className="text-label text-faint">{formatLedgerDate(e.created_at, locale)}{e.note ? ` · ${e.note}` : ''}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-body font-bold tabular-nums ${e.delta >= 0 ? 'text-ok' : 'text-danger'}`}>
                      {e.delta >= 0 ? '+' : ''}{e.delta}
                    </div>
                    {e.balance_after !== null && <div className="text-label text-faint tabular-nums">{e.balance_after}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 위험 구역 — 계정 삭제 (스토어 필수) */}
      {!loading && user && (
        <div className="ui-card ui-card-lg p-5 mb-4 border-[var(--danger-border)]">
          <div className="text-label font-bold text-danger uppercase tracking-wider mb-1">{t('account.danger_zone')}</div>
          {!deleteOpen ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-body text-muted">{t('account.delete_desc')}</p>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="shrink-0 min-h-[var(--touch-min)] px-4 rounded-full border border-[var(--danger-border)] text-danger hover:bg-[var(--danger-bg)] text-sm font-bold transition-colors"
              >
                {t('account.delete_account')}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-body text-ink font-semibold mb-1">{t('account.delete_confirm_title')}</p>
              <p className="text-body text-muted mb-3">{t('account.delete_confirm_desc')}</p>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder={t('account.delete_confirm_placeholder')}
                className="w-full min-h-[var(--touch-min)] px-3 rounded-lg bg-surface-sunken border border-border-strong text-ink text-body mb-3"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={deleteText !== '삭제' || deleting}
                  onClick={handleDeleteAccount}
                  className="min-h-[var(--touch-cta)] px-5 rounded-full bg-danger text-on-brand font-bold text-sm disabled:opacity-40 transition-colors"
                >
                  {deleting ? t('account.deleting') : t('account.delete_permanent')}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteOpen(false); setDeleteText(''); }}
                  className="min-h-[var(--touch-min)] px-4 rounded-full border border-border-strong text-muted hover:text-ink text-sm font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ③ 진단 히스토리 */}
      <h2 className="text-[length:var(--text-h3)] font-bold text-ink mb-3 mt-6">{t('account.history')}</h2>
      <HistoryList records={records} />

      {/* 하단 sticky — 새로 추정 */}
      <div className="sticky bottom-0 -mx-4 mt-6 px-4 py-3 bg-surface/95 backdrop-blur border-t border-border">
        <a href="/diagnose" className="ui-cta w-full text-body">{t('account.new_diagnosis')}</a>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

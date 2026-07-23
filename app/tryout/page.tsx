'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { listTryoutRecords, createTryoutRecord, type TryoutRecord } from '@/lib/tryout';
import { listMachinesWithCurrent, type MachineWithCurrent } from '@/lib/ledger';

function fmtDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' });
  } catch { return iso.slice(0, 10); }
}

export default function TryoutListPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [records, setRecords] = useState<TryoutRecord[]>([]);
  const [machines, setMachines] = useState<MachineWithCurrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMoldName, setNewMoldName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [r, m] = await Promise.all([listTryoutRecords(user.id), listMachinesWithCurrent(user.id)]);
    setRecords(r);
    setMachines(m);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const machineNameById = new Map(machines.map(m => [m.id, m.name]));

  const handleAdd = async () => {
    if (!user || !newMoldName.trim() || adding) return;
    setAdding(true);
    setAddError('');
    const res = await createTryoutRecord({ userId: user.id, moldName: newMoldName, itemName: newItemName });
    setAdding(false);
    if (!res.ok || !res.data) {
      setAddError(res.code === 'TRYOUT_CAP_EXCEEDED' ? t('tryout.err_cap') : t('tryout.err_generic'));
      return;
    }
    router.push(`/tryout/detail?id=${res.data.id}`);
  };

  if (!authLoading && !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-[length:var(--text-h2)] font-bold text-ink mb-6">{t('tryout.title')}</h1>
        <div className="ui-card ui-card-lg p-8 text-center">
          <p className="text-muted text-body mb-5">{t('tryout.login_prompt')}</p>
          <button type="button" onClick={() => setAuthOpen(true)} className="ui-cta px-6 text-body">{t('auth.login')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-[length:var(--text-h2)] font-bold text-ink mb-1">{t('tryout.title')}</h1>
      <p className="text-muted text-body mb-5">{t('tryout.subtitle')}</p>

      <div className="mb-5">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full min-h-[var(--touch-cta)] flex items-center justify-center gap-2 rounded-[var(--radius-cta)] border-2 border-dashed border-border-strong text-brand-ink hover:bg-brand-tint font-bold text-body transition-colors"
          >
            + {t('tryout.new_tryout')}
          </button>
        ) : (
          <div className="ui-card ui-card-lg p-4 space-y-3">
            <div>
              <label className="ui-label">{t('tryout.mold_name')} <span className="text-danger">*</span></label>
              <input
                type="text"
                value={newMoldName}
                onChange={e => setNewMoldName(e.target.value)}
                placeholder={t('ledger.mold_name_placeholder')}
                className="ui-input w-full"
                maxLength={100}
              />
            </div>
            <div>
              <label className="ui-label">{t('ledger.item_name')}</label>
              <input
                type="text"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder={t('ledger.item_name_placeholder')}
                className="ui-input w-full"
                maxLength={100}
              />
            </div>
            {addError && <p className="text-danger text-[length:var(--text-label)]">{addError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={handleAdd} disabled={!newMoldName.trim() || adding} className="ui-cta flex-1 text-body disabled:opacity-50">
                {adding ? t('tryout.starting') : t('tryout.start')}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(''); setNewMoldName(''); setNewItemName(''); }}
                className="min-h-[var(--touch-cta)] px-5 rounded-[var(--radius-cta)] border border-border-strong text-muted hover:text-ink font-medium text-body transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted text-body py-10">{t('common.loading')}</div>
      ) : records.length === 0 ? (
        <div className="ui-card ui-card-lg p-10 text-center">
          <p className="text-muted text-body">{t('tryout.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => {
            const machineLabel = r.machine_id ? (machineNameById.get(r.machine_id) ?? r.machine_name) : r.machine_name;
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/tryout/detail?id=${r.id}`)}
                onKeyDown={e => { if (e.key === 'Enter') router.push(`/tryout/detail?id=${r.id}`); }}
                className="ui-card ui-card-lg p-4 flex items-center gap-3 cursor-pointer hover:bg-surface-sunken transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink text-body truncate">
                    {r.mold_name}{r.item_name ? ` · ${r.item_name}` : ''}
                  </div>
                  <div className="text-[length:var(--text-label)] text-faint truncate">
                    {[machineLabel, fmtDate(r.updated_at, locale)].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className={`shrink-0 text-[length:var(--text-label)] font-bold px-2.5 py-1 rounded-full ${
                  r.status === 'done'
                    ? 'bg-[var(--ok-bg)] text-ok border border-[var(--ok-border)]'
                    : 'bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)]'
                }`}>
                  {r.status === 'done' ? t('tryout.status_done') : t('tryout.status_in_progress')}
                </span>
                <span className="shrink-0 text-faint">›</span>
              </div>
            );
          })}
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

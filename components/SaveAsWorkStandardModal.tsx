'use client';

// 해결 기록 → 작업표준 저장 시 설비를 고르는 모달. components/ResolutionReport.tsx(ReportModal)와
// components/HistoryList.tsx 양쪽에서 공용으로 띄운다. app/ledger 기존 설비 목록/등록 UI 재사용.
import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { listMachinesWithCurrent, createMachine, type MachineWithCurrent } from '@/lib/ledger';
import { saveDiagnosisAsLedgerStandard, type LedgerSavableRecord } from '@/lib/diagnoseToLedger';

interface Props {
  record: LedgerSavableRecord;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SaveAsWorkStandardModal({ record, userId, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const [machines, setMachines] = useState<MachineWithCurrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const [moldName, setMoldName] = useState('');
  const [itemName, setItemName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listMachinesWithCurrent(userId);
      if (cancelled) return;
      setMachines(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleAddMachine = async () => {
    if (!newName.trim() || adding) return;
    setAdding(true);
    setAddError('');
    const res = await createMachine(userId, newName, newMemo);
    setAdding(false);
    if (!res.ok || !res.data) {
      if (res.code === 'DUPLICATE_NAME') setAddError(t('ledger.err_duplicate_name'));
      else if (res.code === 'MACHINE_CAP_EXCEEDED') setAddError(t('ledger.err_machine_cap'));
      else setAddError(t('ledger.err_generic'));
      return;
    }
    const created = res.data;
    setMachines(prev => [{ ...created, current: null }, ...prev]);
    setSelectedId(created.id);
    setShowAddForm(false);
    setNewName('');
    setNewMemo('');
  };

  const handleSave = async () => {
    if (!selectedId || !moldName.trim() || saving) return;
    setSaving(true);
    setSaveError('');
    const res = await saveDiagnosisAsLedgerStandard({
      record, userId, machineId: selectedId, moldName: moldName.trim(), itemName: itemName.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(t('history.save_ledger_error'));
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-ink/40 z-[100] flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-md p-6 mt-8 mb-8 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-[length:var(--text-h3)] font-bold text-ink">{t('history.save_ledger_modal_title')}</h2>

        {loading ? (
          <div className="text-center text-muted text-body py-6">{t('common.loading')}</div>
        ) : machines.length === 0 ? (
          <div className="space-y-3">
            <p className="text-muted text-body">{t('history.save_ledger_no_machine')}</p>
            <a href="/ledger" className="ui-cta w-full text-body flex items-center justify-center">
              {t('history.save_ledger_no_machine_cta')}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[var(--touch-cta)] rounded-[var(--radius-cta)] border border-border-strong text-muted hover:text-ink font-medium text-body transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {machines.map(m => (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 min-h-[var(--touch-min)] px-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedId === m.id ? 'border-brand bg-brand-tint' : 'border-border hover:bg-surface-sunken'
                  }`}
                >
                  <input
                    type="radio"
                    name="save-standard-machine"
                    value={m.id}
                    checked={selectedId === m.id}
                    onChange={() => setSelectedId(m.id)}
                    className="w-5 h-5 shrink-0"
                  />
                  <span className="text-body text-ink truncate">{m.name}</span>
                </label>
              ))}
            </div>

            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full min-h-[var(--touch-min)] rounded-xl border border-dashed border-border-strong text-brand-ink hover:bg-brand-tint font-semibold text-body transition-colors"
              >
                {t('history.save_ledger_add_machine')}
              </button>
            ) : (
              <div className="border border-border rounded-xl p-3 space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={t('ledger.machine_name_placeholder')}
                  className="ui-input w-full"
                  maxLength={100}
                />
                <input
                  type="text"
                  value={newMemo}
                  onChange={e => setNewMemo(e.target.value)}
                  placeholder={t('ledger.machine_memo_placeholder')}
                  className="ui-input w-full"
                  maxLength={200}
                />
                {addError && <p className="text-danger text-[length:var(--text-label)]">{addError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddMachine}
                    disabled={!newName.trim() || adding}
                    className="flex-1 min-h-[var(--touch-min)] rounded-xl bg-brand text-on-brand font-semibold text-body disabled:opacity-50 hover:bg-brand-ink transition-colors"
                  >
                    {adding ? t('ledger.adding') : t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setAddError(''); setNewName(''); setNewMemo(''); }}
                    className="px-4 min-h-[var(--touch-min)] rounded-xl border border-border-strong text-muted hover:text-ink text-body transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="ui-label">{t('ledger.mold_name')}</label>
              <input
                type="text"
                value={moldName}
                onChange={e => setMoldName(e.target.value)}
                placeholder={t('ledger.mold_name_placeholder')}
                className="ui-input w-full"
                maxLength={100}
              />
            </div>
            <div>
              <label className="ui-label">{t('ledger.item_name')}</label>
              <input
                type="text"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                placeholder={t('ledger.item_name_placeholder')}
                className="ui-input w-full"
                maxLength={100}
              />
            </div>

            {saveError && <p className="text-danger text-[length:var(--text-label)]">{saveError}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedId || !moldName.trim() || saving}
                className="ui-cta flex-1 text-body disabled:opacity-50"
              >
                {saving ? t('ledger.saving') : t('common.save')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 min-h-[var(--touch-cta)] rounded-[var(--radius-cta)] border border-border-strong text-muted hover:text-ink font-medium text-body transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

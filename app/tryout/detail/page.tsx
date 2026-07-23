'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import PrintableTryoutReport from '@/components/tryout/PrintableTryoutReport';
import { exportSectionsToPdf } from '@/lib/pdfExport';
import { reportClientError } from '@/lib/observability/client';
import { RESIN_OPTIONS, RESIN_OPTION_EN_LABEL, RESIN_CUSTOM_VALUE } from '@/lib/resinOptions';
import { RESIN_KB } from '@/lib/resin-kb';
import { slugifyResinKey } from '@/lib/resinSlug';
import { TEMP_FIELDS, MOLD_TEMP_FIELDS, MACHINE_PARAM_FIELDS, emptySettings } from '@/lib/machineSettingsFields';
import { CHECKLIST_GROUPS, emptyChecklist, type ChecklistData, type ChecklistState, type Measures } from '@/lib/tryoutChecklist';
import { defects as GUIDE_DEFECTS } from '@/lib/defectGuide';
import { listMachinesWithCurrent, type MachineWithCurrent } from '@/lib/ledger';
import {
  getTryoutRecord, updateTryoutRecord, saveTryoutAsLedgerStandard, type TryoutRecord,
} from '@/lib/tryout';

const inputCls = 'ui-input';
const labelCls = 'ui-label';
const selectCls = 'ui-input ui-select';

function TryoutDetailContent() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const { user, loading: authLoading } = useAuth();

  const [record, setRecord] = useState<TryoutRecord | null>(null);
  const [machines, setMachines] = useState<MachineWithCurrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const [moldName, setMoldName] = useState('');
  const [itemName, setItemName] = useState('');
  const [resinType, setResinType] = useState('');
  const [customResin, setCustomResin] = useState('');
  const [machineMode, setMachineMode] = useState<'linked' | 'freeform'>('freeform');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [freeformMachineName, setFreeformMachineName] = useState('');

  const [checklist, setChecklist] = useState<ChecklistData>(emptyChecklist());
  const [measures, setMeasures] = useState<Measures>({});
  const [finalSettings, setFinalSettings] = useState<Record<string, string>>(emptySettings());
  const [showFinalSettings, setShowFinalSettings] = useState(false);
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<'in_progress' | 'done'>('in_progress');

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [savingLedger, setSavingLedger] = useState(false);
  const [ledgerMsg, setLedgerMsg] = useState('');

  const [pdfBusy, setPdfBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    const [rec, m] = await Promise.all([getTryoutRecord(id), listMachinesWithCurrent(user.id)]);
    setMachines(m);
    if (rec) {
      setRecord(rec);
      setMoldName(rec.mold_name);
      setItemName(rec.item_name || '');
      const isPreset = rec.resin ? RESIN_OPTIONS.some(g => g.options.includes(rec.resin!)) : false;
      setResinType(isPreset ? rec.resin! : (rec.resin ? RESIN_CUSTOM_VALUE : ''));
      setCustomResin(isPreset ? '' : (rec.resin || ''));
      if (rec.machine_id) { setMachineMode('linked'); setSelectedMachineId(rec.machine_id); }
      else { setMachineMode('freeform'); setFreeformMachineName(rec.machine_name || ''); }
      setChecklist({ ...emptyChecklist(), ...(rec.checklist || {}) });
      setMeasures(rec.measures || {});
      if (rec.final_settings) { setFinalSettings(prev => ({ ...prev, ...rec.final_settings })); setShowFinalSettings(true); }
      setSummary(rec.summary || '');
      setStatus(rec.status);
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    (async () => {
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (cancelled || !printRef.current || !record) return;
      try {
        await exportSectionsToPdf([[printRef.current]], `mold-doctor-시사출-${record.mold_name.replace(/\s/g, '-')}-${Date.now()}.pdf`);
      } catch (e) {
        reportClientError('tryout.exportPdf', e);
        alert(t('tryout.pdf_error'));
      } finally {
        if (!cancelled) { setPrinting(false); setPdfBusy(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [printing, record, t]);

  const setItemState = (itemId: number, state: ChecklistState) => {
    setChecklist(prev => ({ ...prev, [String(itemId)]: { ...prev[String(itemId)], state: prev[String(itemId)]?.state === state ? undefined : state } }));
  };
  const setItemMemo = (itemId: number, memo: string) => {
    setChecklist(prev => ({ ...prev, [String(itemId)]: { ...prev[String(itemId)], memo } }));
  };
  const toggleItemDefect = (itemId: number, defectId: string) => {
    setChecklist(prev => {
      const cur = prev[String(itemId)] || {};
      const list = cur.defects || [];
      const next = list.includes(defectId) ? list.filter(d => d !== defectId) : [...list, defectId];
      return { ...prev, [String(itemId)]: { ...cur, defects: next } };
    });
  };

  const buildPatch = (overrideStatus?: 'in_progress' | 'done') => {
    const resin = resinType === RESIN_CUSTOM_VALUE ? customResin : resinType;
    return {
      mold_name: moldName,
      item_name: itemName,
      resin,
      checklist,
      measures,
      final_settings: showFinalSettings ? finalSettings : undefined,
      summary,
      status: overrideStatus ?? status,
    };
  };

  const handleSave = async (overrideStatus?: 'in_progress' | 'done') => {
    if (!record || saving) return;
    setSaving(true);
    setSaveOk(false);
    const ok = await updateTryoutRecord(record.id, buildPatch(overrideStatus));
    setSaving(false);
    if (ok) {
      setSaveOk(true);
      if (overrideStatus) setStatus(overrideStatus);
      void load();
    }
  };

  const handleSaveAsLedgerStandard = async () => {
    if (!record || !user || savingLedger) return;
    setSavingLedger(true);
    setLedgerMsg('');
    const patched: TryoutRecord = { ...record, ...buildPatch(), final_settings: showFinalSettings ? finalSettings : record.final_settings };
    const res = await saveTryoutAsLedgerStandard(patched, user.id);
    setSavingLedger(false);
    setLedgerMsg(res.ok ? t('tryout.save_ledger_ok') : t('tryout.save_ledger_error'));
  };

  const handleAiEstimate = () => {
    const resin = resinType === RESIN_CUSTOM_VALUE ? customResin : resinType;
    sessionStorage.setItem('molddoctor_ledger_prefill', JSON.stringify({
      resinType, customResin,
      settings: showFinalSettings ? finalSettings : {},
      advSettings: {},
      photo: null,
    }));
    router.push(`/diagnose?resin=${encodeURIComponent(resin)}`);
  };

  const resinKey = resinType === RESIN_CUSTOM_VALUE ? '' : resinType;
  const dryingRef = resinKey && RESIN_KB[resinKey]?.drying;

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-center text-muted text-body">{t('common.loading')}</div>;
  }
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="ui-card ui-card-lg p-8 text-center">
          <p className="text-muted text-body mb-5">{t('tryout.login_prompt')}</p>
          <button type="button" onClick={() => setAuthOpen(true)} className="ui-cta px-6 text-body">{t('auth.login')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }
  if (!record) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-muted text-body mb-4">{t('tryout.not_found')}</p>
        <button type="button" onClick={() => router.push('/tryout')} className="ui-cta px-6 text-body">{t('tryout.back_to_list')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
      <button type="button" onClick={() => router.push('/tryout')} className="text-faint hover:text-ink text-sm mb-3 min-h-[44px] flex items-center gap-1">
        ← {t('tryout.back_to_list')}
      </button>

      <div className="flex items-start justify-between gap-3 mb-6">
        <h1 className="text-[length:var(--text-h2)] font-bold text-ink">{moldName || t('tryout.title')}</h1>
        <span className={`shrink-0 text-[length:var(--text-label)] font-bold px-2.5 py-1 rounded-full ${
          status === 'done' ? 'bg-[var(--ok-bg)] text-ok border border-[var(--ok-border)]' : 'bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)]'
        }`}>
          {status === 'done' ? t('tryout.status_done') : t('tryout.status_in_progress')}
        </span>
      </div>

      {/* 헤더 입력 */}
      <div className="ui-card ui-card-lg p-5 mb-6 space-y-4">
        <div>
          <label className={labelCls}>{t('tryout.mold_name')} <span className="text-danger">*</span></label>
          <input type="text" className={inputCls} value={moldName} onChange={e => setMoldName(e.target.value)} placeholder={t('ledger.mold_name_placeholder')} />
        </div>
        <div>
          <label className={labelCls}>{t('ledger.item_name')}</label>
          <input type="text" className={inputCls} value={itemName} onChange={e => setItemName(e.target.value)} placeholder={t('ledger.item_name_placeholder')} />
        </div>

        <div>
          <label className={labelCls}>{t('tryout.machine_label')}</label>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setMachineMode('linked')} className={`min-h-[44px] px-3.5 rounded-full text-sm font-medium transition-colors ${machineMode === 'linked' ? 'bg-brand text-on-brand' : 'bg-surface-sunken text-muted'}`}>
              {t('tryout.machine_pick')}
            </button>
            <button type="button" onClick={() => setMachineMode('freeform')} className={`min-h-[44px] px-3.5 rounded-full text-sm font-medium transition-colors ${machineMode === 'freeform' ? 'bg-brand text-on-brand' : 'bg-surface-sunken text-muted'}`}>
              {t('tryout.machine_freeform')}
            </button>
          </div>
          {machineMode === 'linked' ? (
            machines.length === 0 ? (
              <p className="text-faint text-[length:var(--text-label)]">{t('tryout.no_machines')} <Link href="/ledger" className="text-brand hover:text-brand-ink underline">{t('ledger.title')}</Link></p>
            ) : (
              <select className={selectCls} value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
                <option value="">{t('tryout.machine_none_placeholder')}</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )
          ) : (
            <input type="text" className={inputCls} value={freeformMachineName} onChange={e => setFreeformMachineName(e.target.value)} placeholder={t('tryout.machine_freeform_placeholder')} />
          )}
        </div>

        <div>
          <label className={labelCls}>{t('step2.resin_label')}</label>
          <select className={selectCls} value={resinType} onChange={e => setResinType(e.target.value)}>
            <option value="">{t('step2.resin_placeholder')}</option>
            {RESIN_OPTIONS.map(group => (
              <optgroup key={group.group} label={t(group.groupKey)}>
                {group.options.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === RESIN_CUSTOM_VALUE ? t('resin.custom_option') : locale === 'en' ? (RESIN_OPTION_EN_LABEL[opt] ?? opt) : opt}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {resinType === RESIN_CUSTOM_VALUE && (
            <input type="text" className={`${inputCls} mt-2`} placeholder={t('step2.resin_custom')} value={customResin} onChange={e => setCustomResin(e.target.value)} />
          )}
          {resinKey && RESIN_KB[resinKey] && (
            <Link
              href={`${locale === 'en' ? '/en/resins' : '/resins'}/${slugifyResinKey(resinKey)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-brand hover:text-brand-ink text-[length:var(--text-label)] font-medium min-h-[44px]"
            >
              {t('ledger.resin_page_link')} ↗
            </Link>
          )}
        </div>
      </div>

      {/* 체크리스트 */}
      <div className="ui-card ui-card-lg p-5 mb-6">
        <p className="text-[length:var(--text-label)] text-faint mb-4 bg-surface-sunken rounded-lg px-3 py-2">
          {t('tryout.checklist_notice')}
        </p>
        {CHECKLIST_GROUPS.map(group => (
          <div key={group.group} className="mb-6 last:mb-0">
            <h2 className="text-body font-bold text-ink mb-3">{group.group}. {locale === 'en' ? group.titleEn : group.titleKo}</h2>
            <div className="space-y-3">
              {group.items.map(item => {
                const entry = checklist[String(item.id)] || {};
                return (
                  <div key={item.id} className="border border-border rounded-[var(--radius-card)] p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-body text-ink font-medium">{item.id}. {locale === 'en' ? item.labelEn : item.labelKo}</span>
                    </div>
                    {item.id === 1 && dryingRef && (
                      <p className="text-[length:var(--text-label)] text-brand-ink bg-brand-tint rounded-lg px-2.5 py-1.5 mb-2">
                        {t('tryout.drying_reference')}: {dryingRef.tempC}°C, {dryingRef.hours[0]}~{dryingRef.hours[1]}{locale === 'en' ? 'h' : '시간'}
                        {dryingRef.targetMoisturePct != null ? ` · <${dryingRef.targetMoisturePct}%` : ''}
                      </p>
                    )}
                    <div className="flex gap-1.5 mb-2">
                      {(['ok', 'ng', 'na'] as ChecklistState[]).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setItemState(item.id, st)}
                          className={`min-h-[44px] px-3.5 rounded-full text-sm font-bold transition-colors ${
                            entry.state === st
                              ? st === 'ok' ? 'bg-[var(--ok-bg)] text-ok border border-[var(--ok-border)]'
                              : st === 'ng' ? 'bg-[var(--danger-bg)] text-danger border border-[var(--danger-border)]'
                              : 'bg-surface-sunken text-muted border border-border-strong'
                              : 'bg-surface-sunken text-faint border border-border hover:text-ink'
                          }`}
                        >
                          {t(`tryout.state_${st}`)}
                        </button>
                      ))}
                    </div>
                    {item.hasDefectTags && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {GUIDE_DEFECTS.map(d => {
                          const on = (entry.defects || []).includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleItemDefect(item.id, d.id)}
                              className={`min-h-[36px] px-2.5 rounded-full text-[length:var(--text-label)] font-medium transition-colors ${on ? 'bg-danger text-on-brand' : 'bg-surface-sunken text-muted hover:text-ink'}`}
                            >
                              {locale === 'en' ? d.nameEn : d.nameKo}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {item.hasDefectTags && (entry.defects || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const firstDefect = GUIDE_DEFECTS.find(d => d.id === (entry.defects || [])[0]);
                          const resin = resinType === RESIN_CUSTOM_VALUE ? customResin : resinType;
                          const q = new URLSearchParams();
                          if (resin) q.set('resin', resin);
                          if (firstDefect) q.set('defect', firstDefect.nameKo);
                          router.push(`/diagnose?${q.toString()}`);
                        }}
                        className="inline-flex items-center gap-1 mb-2 text-brand hover:text-brand-ink text-[length:var(--text-label)] font-bold min-h-[36px]"
                      >
                        → {t('tryout.ai_estimate_item')}
                      </button>
                    )}
                    <input
                      type="text"
                      value={entry.memo || ''}
                      onChange={e => setItemMemo(item.id, e.target.value)}
                      placeholder={t('tryout.memo_placeholder')}
                      className="ui-input w-full"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 측정·기록 */}
      <div className="ui-card ui-card-lg p-5 mb-6">
        <h2 className="text-body font-bold text-ink mb-4">D. {t('tryout.measures_title')}</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelCls}>{t('tryout.shot_weight')}</label>
            <input type="text" inputMode="decimal" className={inputCls} placeholder="g" value={measures.shotWeight || ''} onChange={e => setMeasures(prev => ({ ...prev, shotWeight: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>{t('tryout.cycle_time')}</label>
            <input type="text" inputMode="decimal" className={inputCls} placeholder="sec" value={measures.cycleTime || ''} onChange={e => setMeasures(prev => ({ ...prev, cycleTime: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>{t('tryout.dims')}</label>
          <input type="text" className={inputCls} value={measures.dims || ''} onChange={e => setMeasures(prev => ({ ...prev, dims: e.target.value }))} placeholder={t('tryout.dims_placeholder')} />
        </div>
      </div>

      {/* 최종 확정 조건 */}
      <div className="ui-card ui-card-lg p-5 mb-6">
        <button type="button" onClick={() => setShowFinalSettings(v => !v)} className="w-full flex items-center justify-between min-h-[44px] text-left mb-2">
          <span className="text-body font-bold text-ink">18. {t('tryout.final_settings_title')}</span>
          <span className="text-faint text-sm">{showFinalSettings ? '▲' : '▼'}</span>
        </button>
        {showFinalSettings && (
          <div className="space-y-4 mt-3">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {TEMP_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-[length:var(--text-label)] text-faint block mb-1">{t(f.labelKey)}</label>
                  <input type="text" inputMode="decimal" className={inputCls} value={finalSettings[f.key] ?? ''} onChange={e => setFinalSettings(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MOLD_TEMP_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-[length:var(--text-label)] text-faint block mb-1">{t(f.labelKey)}</label>
                  <input type="text" inputMode="decimal" className={inputCls} value={finalSettings[f.key] ?? ''} onChange={e => setFinalSettings(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MACHINE_PARAM_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-[length:var(--text-label)] text-faint block mb-1">{t(f.labelKey)}</label>
                  <input type="text" inputMode="decimal" placeholder={f.placeholder} className={inputCls} value={finalSettings[f.key] ?? ''} onChange={e => setFinalSettings(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 총평 */}
      <div className="ui-card ui-card-lg p-5 mb-6">
        <label className={labelCls}>{t('tryout.summary_label')}</label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder={t('tryout.summary_placeholder')}
          rows={3}
          className="ui-input w-full resize-none"
        />
      </div>

      {/* 액션 */}
      <div className="space-y-3">
        {saveOk && <p className="text-ok text-[length:var(--text-label)] text-center">{t('tryout.save_ok')}</p>}
        <button type="button" onClick={() => handleSave()} disabled={saving} className="ui-cta w-full text-body disabled:opacity-60">
          {saving ? t('tryout.saving') : t('tryout.save')}
        </button>
        {status === 'in_progress' ? (
          <button type="button" onClick={() => handleSave('done')} disabled={saving} className="w-full min-h-[var(--touch-cta)] rounded-[var(--radius-cta)] border border-[var(--ok-border)] bg-[var(--ok-bg)] text-ok font-bold text-body transition-colors disabled:opacity-60">
            {t('tryout.mark_done')}
          </button>
        ) : (
          <button type="button" onClick={() => handleSave('in_progress')} disabled={saving} className="w-full min-h-[var(--touch-cta)] rounded-[var(--radius-cta)] border border-border-strong text-muted hover:text-ink font-medium text-body transition-colors disabled:opacity-60">
            {t('tryout.mark_in_progress')}
          </button>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleSaveAsLedgerStandard}
            disabled={savingLedger || machineMode !== 'linked' || !selectedMachineId}
            className="flex-1 min-h-[var(--touch-cta)] px-4 rounded-[var(--radius-cta)] border border-border-strong text-muted hover:text-ink font-medium text-body transition-colors disabled:opacity-40"
          >
            {savingLedger ? t('tryout.saving') : t('tryout.save_ledger_cta')}
          </button>
          <button
            type="button"
            onClick={() => { setPdfBusy(true); setPrinting(true); }}
            disabled={pdfBusy}
            className="flex-1 min-h-[var(--touch-cta)] px-4 rounded-[var(--radius-cta)] border border-border-strong text-muted hover:text-ink font-medium text-body transition-colors disabled:opacity-60"
          >
            {pdfBusy ? t('tryout.pdf_generating') : t('tryout.pdf_export')}
          </button>
        </div>
        {ledgerMsg && <p className="text-[length:var(--text-label)] text-center text-muted">{ledgerMsg}</p>}
        {machineMode !== 'linked' && (
          <p className="text-[length:var(--text-label)] text-faint text-center">{t('tryout.save_ledger_needs_machine')}</p>
        )}

        <button type="button" onClick={handleAiEstimate} className="ui-cta w-full text-body">
          {t('tryout.ai_estimate_cta')}
        </button>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* 인쇄용 히든 렌더 */}
      {printing && record && (
        <div style={{ position: 'fixed', top: 0, left: '-99999px', zIndex: -1 }}>
          <div ref={printRef}>
            <PrintableTryoutReport
              record={{ ...record, ...buildPatch(), final_settings: showFinalSettings ? finalSettings : record.final_settings }}
              machineName={machineMode === 'linked' ? (machines.find(m => m.id === selectedMachineId)?.name || '') : freeformMachineName}
              authorName={user?.email || ''}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TryoutDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>}>
      <TryoutDetailContent />
    </Suspense>
  );
}

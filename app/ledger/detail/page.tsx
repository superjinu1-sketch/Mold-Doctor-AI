'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import PhotoInputTrigger, { type PhotoInputTriggerHandle } from '@/components/PhotoInputTrigger';
import PrintableMachinePage from '@/components/ledger/PrintableMachinePage';
import { downscaleImageClient } from '@/lib/clientDownscale';
import { authHeaders } from '@/lib/supabase/authHeader';
import { apiUrl } from '@/lib/apiBase';
import { reportClientError } from '@/lib/observability/client';
import { exportSectionsToPdf } from '@/lib/pdfExport';
import { RESIN_OPTIONS, RESIN_OPTION_EN_LABEL, RESIN_CUSTOM_VALUE } from '@/lib/resinOptions';
import {
  TEMP_FIELDS, MOLD_TEMP_FIELDS, MACHINE_PARAM_FIELDS, ADV_FIELD_GROUPS,
  BASIC_SETTING_KEYS, ADV_SETTING_KEYS, emptySettings,
} from '@/lib/machineSettingsFields';
import {
  getMachine, listStandards, createStandard, deleteMachine, getSignedPhotoUrl,
  type Machine, type ConditionStandard,
} from '@/lib/ledger';

const inputCls = 'ui-input';
const labelCls = 'ui-label';
const selectCls = 'ui-input ui-select';
// OCR 자동 채움 필드 강조 — app/diagnose/page.tsx settingInputCls와 동일 패턴(brand-tint, ok/danger 색 아님)
const extractedInputCls = 'w-full bg-brand-tint border border-[var(--brand-border)] rounded-lg px-3 py-3 text-base text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand focus:border-[var(--brand-border)] min-h-[var(--touch-min)]';

function fmtDateTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function LedgerMachineDetailContent() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineId = searchParams.get('id') ?? '';
  const { user, loading: authLoading } = useAuth();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [standards, setStandards] = useState<ConditionStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  // 매뉴얼 입력 폼
  const [moldName, setMoldName] = useState('');
  const [itemName, setItemName] = useState('');
  const [resinType, setResinType] = useState('');
  const [customResin, setCustomResin] = useState('');
  const [settings, setSettings] = useState<Record<string, string>>(emptySettings());
  const [memo, setMemo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set());

  // 사진
  const photoRef = useRef<PhotoInputTriggerHandle>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);      // 업로드용(2048px q0.8)
  const [photoThumbBase64, setPhotoThumbBase64] = useState<string | null>(null); // 썸네일(320px)
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [prefilling, setPrefilling] = useState(false);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const current = standards[0] ?? null;

  const load = useCallback(async () => {
    if (!machineId) return;
    setLoading(true);
    const [m, s] = await Promise.all([getMachine(machineId), listStandards(machineId)]);
    setMachine(m);
    setStandards(s);
    setLoading(false);
  }, [machineId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    (async () => {
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (cancelled || !printRef.current || !machine) return;
      try {
        await exportSectionsToPdf([[printRef.current]], `mold-doctor-${machine.name.replace(/\s/g, '-')}-${Date.now()}.pdf`);
      } catch (e) {
        reportClientError('ledger.detail.exportPdf', e);
        alert(t('ledger.pdf_error'));
      } finally {
        if (!cancelled) { setPrinting(false); setPdfBusy(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [printing, machine, t]);

  const handlePhotoFiles = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const raw = await fileToBase64(file);
      const upload = await downscaleImageClient(raw, 2048, 0.8, file.type);
      const thumb = await downscaleImageClient(raw, 320, 0.75, file.type);
      if (!upload || !thumb) {
        setPhotoError(t('ledger.photo_decode_error'));
        return;
      }
      setPhotoBase64(upload);
      setPhotoThumbBase64(thumb);
    } catch (e) {
      reportClientError('ledger.photo', e);
      setPhotoError(t('ledger.photo_decode_error'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleOcr = async () => {
    if (!photoBase64 || ocrLoading) return;
    setOcrLoading(true);
    setOcrError('');
    try {
      const res = await fetch(apiUrl('/api/extract-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ image: { mediaType: 'image/jpeg', data: photoBase64 } }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setOcrError(data.error || t('ledger.ocr_rate_limit'));
        return;
      }
      if (res.status === 401) {
        setOcrError(t('auth.login_required'));
        return;
      }
      const data = await res.json();
      if (!res.ok) { setOcrError(data.error || t('ledger.ocr_error')); return; }
      const filled = new Set<string>();
      setSettings(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === 'string' && v.trim() && (BASIC_SETTING_KEYS.includes(k) || k === 'pressureUnit')) {
            next[k] = v;
            filled.add(k);
          }
        }
        return next;
      });
      setExtractedFields(filled);
    } catch (e) {
      reportClientError('ledger.ocr', e);
      setOcrError(t('ledger.ocr_error'));
    } finally {
      setOcrLoading(false);
    }
  };

  const setField = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setExtractedFields(prev => { if (!prev.has(key)) return prev; const n = new Set(prev); n.delete(key); return n; });
  };

  const handleSave = async () => {
    if (!user || !machine || saving) return;
    setSaving(true);
    setSaveError('');
    setSaveOk(false);
    const resin = resinType === RESIN_CUSTOM_VALUE ? customResin : resinType;
    const res = await createStandard({
      userId: user.id,
      machineId: machine.id,
      moldName, itemName, resin, settings, memo,
      photoBase64, photoThumbBase64,
    });
    setSaving(false);
    if (!res.ok) {
      if (res.code === 'STANDARD_CAP_EXCEEDED') setSaveError(t('ledger.err_standard_cap'));
      else if (res.code === 'PHOTO_CAP_EXCEEDED') setSaveError(t('ledger.err_photo_cap'));
      else setSaveError(t('ledger.err_generic'));
      return;
    }
    setSaveOk(true);
    setPhotoBase64(null);
    setPhotoThumbBase64(null);
    setExtractedFields(new Set());
    void load();
  };

  const handleDeleteMachine = async () => {
    if (!machine || deleting) return;
    setDeleting(true);
    const ok = await deleteMachine(machine.id);
    setDeleting(false);
    if (ok) router.push('/ledger');
  };

  const handleShowOriginal = async (photoPath: string) => {
    const url = await getSignedPhotoUrl(photoPath);
    if (url) setLightboxUrl(url);
  };

  const handleAiEstimate = async () => {
    if (!current || prefilling) return;
    setPrefilling(true);
    try {
      const s = current.settings || {};
      const basicSettings: Record<string, string> = {};
      const advSettings: Record<string, string> = {};
      for (const [k, v] of Object.entries(s)) {
        if (ADV_SETTING_KEYS.includes(k)) advSettings[k] = v;
        else basicSettings[k] = v;
      }
      let photo: { base64: string; mediaType: string } | null = null;
      if (current.photo_path) {
        const url = await getSignedPhotoUrl(current.photo_path);
        if (url) {
          const blob = await fetch(url).then(r => r.blob());
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const resized = await downscaleImageClient(base64, 1568, 0.82, 'image/jpeg');
          if (resized) photo = { base64: resized, mediaType: 'image/jpeg' };
        }
      }
      const isPresetResin = current.resin ? RESIN_OPTIONS.some(g => g.options.includes(current.resin!)) : false;
      sessionStorage.setItem('molddoctor_ledger_prefill', JSON.stringify({
        resinType: isPresetResin ? current.resin : (current.resin ? RESIN_CUSTOM_VALUE : ''),
        customResin: isPresetResin ? '' : (current.resin ?? ''),
        settings: basicSettings,
        advSettings,
        photo,
      }));
      router.push('/diagnose');
    } catch (e) {
      reportClientError('ledger.aiEstimate', e);
      setPrefilling(false);
    }
  };

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-center text-muted text-body">{t('common.loading')}</div>;
  }
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="ui-card ui-card-lg p-8 text-center">
          <p className="text-muted text-body mb-5">{t('ledger.login_prompt')}</p>
          <button type="button" onClick={() => setAuthOpen(true)} className="ui-cta px-6 text-body">{t('auth.login')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }
  if (!machine) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-muted text-body mb-4">{t('ledger.not_found')}</p>
        <button type="button" onClick={() => router.push('/ledger')} className="ui-cta px-6 text-body">{t('ledger.back_to_list')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
      <button type="button" onClick={() => router.push('/ledger')} className="text-faint hover:text-ink text-sm mb-3 min-h-[44px] flex items-center gap-1">
        ← {t('ledger.back_to_list')}
      </button>

      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[length:var(--text-h2)] font-bold text-ink">{machine.name}</h1>
          {machine.memo && <p className="text-muted text-body mt-1">{machine.memo}</p>}
        </div>
        <button
          type="button"
          onClick={() => confirmDelete ? void handleDeleteMachine() : setConfirmDelete(true)}
          disabled={deleting}
          className="shrink-0 min-h-[var(--touch-min)] px-3 rounded-full text-danger hover:bg-[var(--danger-bg)] text-sm font-medium transition-colors disabled:opacity-50"
        >
          {deleting ? t('ledger.deleting') : confirmDelete ? t('ledger.confirm_delete') : t('ledger.delete_machine')}
        </button>
      </div>

      {/* 현행 표준 요약 + AI 추정 CTA */}
      {current && (
        <div className="ui-card ui-card-lg p-5 mb-6">
          <div className="flex items-start gap-4">
            {current.photo_thumb && (
              <button
                type="button"
                onClick={() => current.photo_path && handleShowOriginal(current.photo_path)}
                className="shrink-0"
                aria-label={t('ledger.view_original')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:image/jpeg;base64,${current.photo_thumb}`} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[length:var(--text-label)] text-faint mb-1">{t('ledger.current_standard')} · {fmtDateTime(current.created_at, locale)}</div>
              <div className="text-body text-ink font-semibold">{current.resin || t('ledger.no_resin')}</div>
              {(current.mold_name || current.item_name) && (
                <div className="text-[length:var(--text-label)] text-faint mt-0.5">
                  {[current.item_name, current.mold_name].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              type="button"
              onClick={handleAiEstimate}
              disabled={prefilling}
              className="ui-cta flex-1 text-body disabled:opacity-60"
            >
              {prefilling ? t('ledger.preparing') : t('ledger.ai_estimate_cta')}
            </button>
            <button
              type="button"
              onClick={() => { setPdfBusy(true); setPrinting(true); }}
              disabled={pdfBusy}
              className="min-h-[var(--touch-cta)] px-5 rounded-[var(--radius-cta)] border border-border-strong text-muted hover:text-ink font-medium text-body transition-colors disabled:opacity-60"
            >
              {pdfBusy ? t('ledger.pdf_generating') : t('ledger.pdf_export_single')}
            </button>
          </div>
        </div>
      )}

      {/* 개정 이력 */}
      {standards.length > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowHistory(v => !v)}
            aria-expanded={showHistory}
            className="w-full flex items-center justify-between min-h-[44px] text-left"
          >
            <span className="text-body font-bold text-ink">{t('ledger.revision_history')} ({standards.length})</span>
            <span className="text-faint text-sm">{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <ul className="divide-y divide-border mt-1 ui-card ui-card-lg overflow-hidden">
              {standards.map((s, i) => (
                <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-body text-ink truncate">{s.resin || t('ledger.no_resin')}{i === 0 ? ` · ${t('ledger.current_badge')}` : ''}</div>
                    <div className="text-[length:var(--text-label)] text-faint">{fmtDateTime(s.created_at, locale)}{s.memo ? ` · ${s.memo}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 조건 표준 입력 */}
      <div className="ui-card ui-card-lg p-5 mb-6">
        <h2 className="text-body font-bold text-ink mb-4">{t('ledger.new_standard')}</h2>

        {/* 사진 → OCR */}
        <div className="mb-5">
          <label className={labelCls}>{t('ledger.photo_label')}</label>
          <PhotoInputTrigger ref={photoRef} accept="image/*" onFiles={handlePhotoFiles} />
          {photoThumbBase64 ? (
            <div className="flex items-center gap-3 mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${photoThumbBase64}`} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
              <div className="flex flex-col gap-2">
                <button type="button" onClick={handleOcr} disabled={ocrLoading} className="min-h-[44px] px-4 rounded-full bg-brand text-on-brand font-bold text-sm disabled:opacity-60">
                  {ocrLoading ? t('step3.camera_loading') : t('ledger.ocr_btn')}
                </button>
                <button type="button" onClick={() => { setPhotoBase64(null); setPhotoThumbBase64(null); }} className="text-faint hover:text-ink text-sm min-h-[44px] flex items-center">
                  {t('step3.photo_remove')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoRef.current?.open()}
              disabled={photoBusy}
              className="w-full min-h-[var(--touch-cta)] mt-2 rounded-[var(--radius-cta)] border-2 border-dashed border-border-strong text-muted hover:bg-surface-sunken text-body transition-colors disabled:opacity-60"
            >
              {photoBusy ? t('step3.camera_loading') : t('ledger.photo_add')}
            </button>
          )}
          {photoError && <p className="text-danger text-[length:var(--text-label)] mt-2">{photoError}</p>}
          {ocrError && <p className="text-danger text-[length:var(--text-label)] mt-2">{ocrError}</p>}
          {extractedFields.size > 0 && <p className="text-ok text-[length:var(--text-label)] mt-2">{t('step3.extracted_hint')}</p>}
        </div>

        {/* 금형/아이템/수지 */}
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className={labelCls}>{t('ledger.item_name')}</label>
            <input type="text" className={inputCls} value={itemName} onChange={e => setItemName(e.target.value)} placeholder={t('ledger.item_name_placeholder')} />
          </div>
          <div>
            <label className={labelCls}>{t('ledger.mold_name')}</label>
            <input type="text" className={inputCls} value={moldName} onChange={e => setMoldName(e.target.value)} placeholder={t('ledger.mold_name_placeholder')} />
          </div>
          <div className="sm:col-span-2">
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
          </div>
        </div>

        {/* 온도 */}
        <div className="mb-5">
          <label className={labelCls}>{t('step3.temp_label')}</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {TEMP_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-[length:var(--text-label)] text-faint block mb-1">{t(f.labelKey)}</label>
                <input type="text" inputMode="decimal" className={extractedFields.has(f.key) ? extractedInputCls : inputCls} value={settings[f.key] ?? ''} onChange={e => setField(f.key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <label className={labelCls}>{t('step3.mold_temp')}</label>
          <div className="grid grid-cols-2 gap-2">
            {MOLD_TEMP_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-[length:var(--text-label)] text-faint block mb-1">{t(f.labelKey)}</label>
                <input type="text" inputMode="decimal" className={extractedFields.has(f.key) ? extractedInputCls : inputCls} value={settings[f.key] ?? ''} onChange={e => setField(f.key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* 압력 단위 */}
        <div className="mb-5">
          <label className={labelCls}>{t('step3.pressure_unit')}</label>
          <div className="flex gap-2">
            {['bar', 'MPa', 'kgf/cm2'].map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setField('pressureUnit', u)}
                className={`min-h-[44px] px-4 rounded-full text-sm font-medium border transition-colors ${settings.pressureUnit === u ? 'bg-brand text-on-brand border-brand' : 'border-border-strong text-muted hover:bg-surface-sunken'}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* 압력/속도/시간 등 */}
        <div className="mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MACHINE_PARAM_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-[length:var(--text-label)] text-faint block mb-1">{t(f.labelKey)}</label>
                <input type="text" inputMode="decimal" placeholder={f.placeholder} className={extractedFields.has(f.key) ? extractedInputCls : inputCls} value={settings[f.key] ?? ''} onChange={e => setField(f.key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* 고급 설정 */}
        <button type="button" onClick={() => setShowAdvanced(v => !v)} className="text-brand hover:text-brand-ink text-body min-h-[44px] flex items-center gap-1 mb-2">
          {showAdvanced ? t('adv.toggle_collapse') : t('adv.toggle_expand')}
        </button>
        {showAdvanced && (
          <div className="space-y-4 mb-5">
            {ADV_FIELD_GROUPS.map(group => (
              <div key={group.titleKey}>
                <label className={labelCls}>{t(group.titleKey)}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {group.fields.map(f => (
                    <div key={f.key}>
                      <label className="text-[length:var(--text-label)] text-faint block mb-1">{t(f.labelKey)}</label>
                      <input type="text" className={inputCls} value={settings[f.key] ?? ''} onChange={e => setField(f.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-5">
          <label className={labelCls}>{t('ledger.standard_memo')}</label>
          <input type="text" className={inputCls} value={memo} onChange={e => setMemo(e.target.value)} placeholder={t('ledger.standard_memo_placeholder')} />
        </div>

        {saveError && <p className="text-danger text-[length:var(--text-label)] mb-3">{saveError}</p>}
        {saveOk && <p className="text-ok text-[length:var(--text-label)] mb-3">{t('ledger.save_ok')}</p>}
        <button type="button" onClick={handleSave} disabled={saving} className="ui-cta w-full text-body disabled:opacity-60">
          {saving ? t('ledger.saving') : t('ledger.save_standard')}
        </button>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* 원본 사진 라이트박스 — 네이티브 핀치줌(touch-action 기본값 유지) */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-ink/90 z-[70] flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain" style={{ touchAction: 'pinch-zoom' }} />
          <button type="button" onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full bg-surface/90 text-ink flex items-center justify-center">✕</button>
        </div>
      )}

      {/* 인쇄용 히든 렌더(단건) */}
      {printing && (
        <div style={{ position: 'fixed', top: 0, left: '-99999px', zIndex: -1 }}>
          <div ref={printRef}>
            <PrintableMachinePage machine={machine} standard={current} authorName={user?.email || ''} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function LedgerMachineDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>}>
      <LedgerMachineDetailContent />
    </Suspense>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import PrintableMachinePage from '@/components/ledger/PrintableMachinePage';
import { listMachinesWithCurrent, createMachine, type MachineWithCurrent } from '@/lib/ledger';
import { exportSectionsToPdf } from '@/lib/pdfExport';
import { reportClientError } from '@/lib/observability/client';

function fmtUpdated(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' });
  } catch { return iso.slice(0, 10); }
}

export default function LedgerPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [machines, setMachines] = useState<MachineWithCurrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [query, setQuery] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printMachines, setPrintMachines] = useState<MachineWithCurrent[] | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const list = await listMachinesWithCurrent(user.id);
    setMachines(list);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // printMachines가 설정되면 히든 컨테이너에 인쇄용 페이지들이 렌더 → 레이아웃 안정화 대기 후 캡처
  useEffect(() => {
    if (!printMachines || printMachines.length === 0) return;
    let cancelled = false;
    (async () => {
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (cancelled) return;
      try {
        const container = printContainerRef.current;
        if (!container) return;
        const pageEls = Array.from(container.children) as HTMLElement[];
        const sections = pageEls.map(el => [el]);
        await exportSectionsToPdf(sections, `mold-doctor-조건대장-${Date.now()}.pdf`);
      } catch (e) {
        reportClientError('ledger.exportPdf', e);
        alert(t('ledger.pdf_error'));
      } finally {
        if (!cancelled) { setPrintMachines(null); setPdfBusy(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [printMachines, t]);

  const filtered = machines.filter(m => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || (m.memo ?? '').toLowerCase().includes(q);
  });

  const toggleSelected = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleAddMachine = async () => {
    if (!user || !newName.trim() || adding) return;
    setAdding(true);
    setAddError('');
    const res = await createMachine(user.id, newName, newMemo);
    setAdding(false);
    if (!res.ok) {
      if (res.code === 'DUPLICATE_NAME') setAddError(t('ledger.err_duplicate_name'));
      else if (res.code === 'MACHINE_CAP_EXCEEDED') setAddError(t('ledger.err_machine_cap'));
      else setAddError(t('ledger.err_generic'));
      return;
    }
    setNewName('');
    setNewMemo('');
    setShowAddForm(false);
    void load();
  };

  const handleExportSelected = () => {
    if (selected.size === 0 || pdfBusy) return;
    setPdfBusy(true);
    setPrintMachines(machines.filter(m => selected.has(m.id)));
  };

  if (!authLoading && !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-[length:var(--text-h2)] font-bold text-ink mb-6">{t('ledger.title')}</h1>
        <div className="ui-card ui-card-lg p-8 text-center">
          <p className="text-muted text-body mb-5">{t('ledger.login_prompt')}</p>
          <button type="button" onClick={() => setAuthOpen(true)} className="ui-cta px-6 text-body">
            {t('auth.login')}
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-28">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-[length:var(--text-h2)] font-bold text-ink">{t('ledger.title')}</h1>
        <button
          type="button"
          onClick={() => setSelectMode(v => { if (v) setSelected(new Set()); return !v; })}
          className="shrink-0 min-h-[var(--touch-min)] px-4 rounded-full border border-border-strong text-muted hover:text-ink hover:bg-surface-sunken text-sm font-medium transition-colors"
        >
          {selectMode ? t('common.cancel') : t('ledger.select_mode')}
        </button>
      </div>
      <p className="text-muted text-body mb-5">{t('ledger.subtitle')}</p>

      {!selectMode && (
        <div className="mb-5">
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full min-h-[var(--touch-cta)] flex items-center justify-center gap-2 rounded-[var(--radius-cta)] border-2 border-dashed border-border-strong text-brand-ink hover:bg-brand-tint font-bold text-body transition-colors"
            >
              + {t('ledger.add_machine')}
            </button>
          ) : (
            <div className="ui-card ui-card-lg p-4 space-y-3">
              <div>
                <label className="ui-label">{t('ledger.machine_name')}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={t('ledger.machine_name_placeholder')}
                  className="ui-input w-full"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="ui-label">{t('ledger.machine_memo')}</label>
                <input
                  type="text"
                  value={newMemo}
                  onChange={e => setNewMemo(e.target.value)}
                  placeholder={t('ledger.machine_memo_placeholder')}
                  className="ui-input w-full"
                  maxLength={200}
                />
              </div>
              {addError && <p className="text-danger text-[length:var(--text-label)]">{addError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddMachine}
                  disabled={!newName.trim() || adding}
                  className="ui-cta flex-1 text-body disabled:opacity-50"
                >
                  {adding ? t('ledger.adding') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setAddError(''); setNewName(''); setNewMemo(''); }}
                  className="min-h-[var(--touch-cta)] px-5 rounded-[var(--radius-cta)] border border-border-strong text-muted hover:text-ink font-medium text-body transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!selectMode && machines.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('ledger.search_placeholder')}
          className="ui-input w-full mb-4"
        />
      )}

      {loading ? (
        <div className="text-center text-muted text-body py-10">{t('common.loading')}</div>
      ) : machines.length === 0 ? (
        <div className="ui-card ui-card-lg p-10 text-center">
          <p className="text-muted text-body">{t('ledger.empty')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ui-card ui-card-lg p-8 text-center">
          <p className="text-muted text-body">{t('ledger.no_search_results')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => selectMode ? toggleSelected(m.id) : router.push(`/ledger/detail?id=${m.id}`)}
              onKeyDown={e => { if (e.key === 'Enter') (selectMode ? toggleSelected(m.id) : router.push(`/ledger/detail?id=${m.id}`)); }}
              className={`ui-card ui-card-lg p-4 flex items-center gap-3 cursor-pointer transition-colors ${selectMode && selected.has(m.id) ? 'border-brand bg-brand-tint' : 'hover:bg-surface-sunken'}`}
            >
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggleSelected(m.id)}
                  onClick={e => e.stopPropagation()}
                  className="shrink-0 w-5 h-5"
                  aria-label={m.name}
                />
              )}
              {m.current?.photo_thumb ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`data:image/jpeg;base64,${m.current.photo_thumb}`}
                  alt=""
                  className="shrink-0 w-14 h-14 rounded-lg object-cover border border-border"
                />
              ) : (
                <div className="shrink-0 w-14 h-14 rounded-lg bg-surface-sunken border border-border flex items-center justify-center text-faint text-xl">⚙️</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink text-body truncate">{m.name}</div>
                <div className="text-[length:var(--text-label)] text-faint truncate">
                  {m.current
                    ? `${m.current.resin || t('ledger.no_resin')} · ${fmtUpdated(m.updated_at, locale)}`
                    : t('ledger.no_standard_yet')}
                </div>
              </div>
              {!selectMode && <span className="shrink-0 text-faint">›</span>}
            </div>
          ))}
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <button
              type="button"
              onClick={handleExportSelected}
              disabled={pdfBusy}
              className="ui-cta w-full text-body disabled:opacity-60"
            >
              {pdfBusy ? t('ledger.pdf_generating') : `${t('ledger.pdf_export')} (${selected.size})`}
            </button>
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* 인쇄용 히든 렌더 — 화면 밖(-9999px)이지만 레이아웃/페인트는 정상 수행되어 html2canvas가 캡처 가능 */}
      {printMachines && (
        <div ref={printContainerRef} style={{ position: 'fixed', top: 0, left: '-99999px', zIndex: -1 }}>
          {printMachines.map(m => (
            <div key={m.id}>
              <PrintableMachinePage machine={m} standard={m.current} authorName={user?.email || ''} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

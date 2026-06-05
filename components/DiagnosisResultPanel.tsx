'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { authHeaders } from '@/lib/supabase/authHeader';
import { downscaleImageClient } from '@/lib/clientDownscale';

interface DiagnosisResult {
  defect_type: { ko: string; en: string };
  defect_phase?: 'filling' | 'packing' | 'cooling' | 'material';
  severity: 'high' | 'medium' | 'low';
  tier?: 'simple' | 'complex';
  summary: string;
  process_window_check?: {
    melt_temp?: { status: 'ok' | 'warning' | 'critical'; note: string };
    mold_temp?: { status: 'ok' | 'warning' | 'critical'; note: string };
    injection_speed?: { status: 'ok' | 'warning' | 'critical'; note: string };
    pack_pressure?: { status: 'ok' | 'warning' | 'critical'; note: string };
    drying?: { status: 'ok' | 'warning' | 'critical'; note: string };
  };
  causes: {
    rank: number;
    category: string;
    probability: number;
    description: string;
    detail?: string;
    scientific_reasoning?: string;
    evidence?: string;
    elimination?: string;
    verification?: string;
  }[];
  recommendations: {
    priority?: number;
    parameter: string;
    current: string;
    recommended: string;
    reason: string;
    expected_result?: string;
    risk?: string;
    interaction_note?: string;
    direction?: 'up' | 'down' | 'same';
  }[];
  checklist: string[] | { before_changes: string[]; after_changes: string[]; escalation: string[] };
  top5_actions?: { step: number; action: string; why: string }[];
  resin_specific_notes: string;
  drying_assessment?: string;
  additional_advice?: string;
  mold_analysis?: {
    gate_assessment: string;
    cooling_assessment: string;
    design_risk_factors: string[];
    recommendations: string[];
  };
  raw_response?: string;
  is_demo?: boolean;
  _debug?: {
    model: string;
    input_tokens: number;
    output_tokens: number;
    cache_read: number;
  };
}

function SeverityBadge({ severity }: { severity: string }) {
  const { t } = useLocale();
  const config = {
    high: { key: 'result.severity_high', cls: 'bg-[var(--danger-bg)] text-danger border border-[var(--danger-border)]' },
    medium: { key: 'result.severity_medium', cls: 'bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)]' },
    low: { key: 'result.severity_low', cls: 'bg-brand-tint text-brand-ink border border-[var(--brand-border)]' },
  };
  const c = config[severity as keyof typeof config] || config.medium;
  return <span className={`px-3 py-1 rounded-full text-sm font-bold ${c.cls}`}>{t(c.key)}</span>;
}

function DirectionArrow({ direction }: { direction?: string }) {
  if (direction === 'up') return <span className="text-danger font-bold">↑</span>;
  if (direction === 'down') return <span className="text-brand font-bold">↓</span>;
  return <span className="text-ok font-bold">✓</span>;
}

type CauseItem = DiagnosisResult['causes'][number];

function CauseCard({ cause }: { cause: CauseItem }) {
  const { t } = useLocale();
  const [openPanel, setOpenPanel] = useState<string | null>('scientific_reasoning');
  const toggle = (key: string) => setOpenPanel(prev => prev === key ? null : key);

  const rankColor = cause.rank === 1 ? 'bg-danger' : cause.rank === 2 ? 'bg-warn' : 'bg-surface-sunken';
  const rankBg = cause.rank === 1 ? 'bg-[var(--danger-bg)] text-danger' : cause.rank === 2 ? 'bg-[var(--warn-bg)] text-warn' : 'bg-surface-sunken text-faint';
  const catColor =
    cause.category?.includes('Material') || cause.category?.includes('Drying') || cause.category === '건조' || cause.category === '수지' ? 'bg-brand-tint text-brand-ink' :
    cause.category?.includes('Machine') || cause.category?.includes('Temperature') || cause.category?.includes('Pressure') || cause.category === '온도' || cause.category === '압력' ? 'bg-[var(--danger-bg)] text-danger' :
    cause.category?.includes('Mold') || cause.category === '금형' ? 'bg-purple-500/15 text-brand-ink' :
    cause.category?.includes('Method') ? 'bg-[var(--warn-bg)] text-warn' :
    'bg-surface-sunken text-faint';

  const panels: { key: string; label: string; icon: string; value: string | undefined; headerCls: string; bodyCls: string }[] = [
    {
      key: 'scientific_reasoning',
      label: t('result.cause_why'),
      icon: '🔬',
      value: cause.scientific_reasoning || cause.detail,
      headerCls: 'bg-brand-tint hover:bg-brand-tint text-brand-ink',
      bodyCls: 'bg-brand-tint border-[var(--brand-border)] text-brand-ink',
    },
    {
      key: 'evidence',
      label: t('result.cause_evidence'),
      icon: '📊',
      value: cause.evidence,
      headerCls: 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400',
      bodyCls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    },
    {
      key: 'elimination',
      label: t('result.cause_elimination'),
      icon: '✕',
      value: cause.elimination,
      headerCls: 'bg-[var(--warn-bg)] hover:bg-[var(--warn-bg)] text-warn',
      bodyCls: 'bg-[var(--warn-bg)] border-[var(--warn-border)] text-warn',
    },
    {
      key: 'verification',
      label: t('result.cause_verification'),
      icon: '✓',
      value: cause.verification,
      headerCls: 'bg-brand-tint hover:bg-purple-500/15 text-brand-ink',
      bodyCls: 'bg-brand-tint border-[var(--brand-border)] text-purple-300',
    },
  ].filter(p => p.value);

  return (
    <div className="border border-border rounded-xl p-4 bg-surface">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-ink ${rankColor}`}>
            {cause.rank}
          </span>
          <span className="font-semibold text-ink text-base sm:text-lg">{cause.description}</span>
        </div>
        <span className={`shrink-0 text-xl font-bold px-3 py-1 rounded ${rankBg}`}>{cause.probability}%</span>
      </div>
      <div className="w-full bg-surface-sunken rounded-full h-2 mb-3">
        <div className={`h-2 rounded-full ${rankColor}`} style={{ width: `${cause.probability}%` }} />
      </div>
      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3 ${catColor}`}>{cause.category}</span>
      {panels.length > 0 && (
        <div className="space-y-1">
          {panels.map(({ key, label, icon, value, headerCls, bodyCls }) => (
            <div key={key} className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${headerCls}`}
              >
                <span className="flex items-center gap-1.5">
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
                <span className={`text-sm transition-transform inline-block ${openPanel === key ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {openPanel === key && (
                <div className={`px-3 py-3 text-sm leading-relaxed border-x border-b rounded-b-lg ${bodyCls}`}>
                  {value}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function ChatSection({
  chatMessages, chatInput, setChatInput, isChatLoading, chatError,
  chatDisabled, userTurns, suggestedQuestions, sendChat, chatBottomRef,
}: {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  isChatLoading: boolean;
  chatError: string;
  chatDisabled: boolean;
  userTurns: number;
  suggestedQuestions: string[];
  sendChat: (q: string) => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useLocale();
  const MAX_CHAT_TURNS = 5;
  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <span className="font-bold text-ink text-sm sm:text-base">{t('chat.title')}</span>
          </div>
          <span className="text-xs text-faint">{userTurns}/{MAX_CHAT_TURNS}{t('chat.limit')}</span>
        </div>
      </div>

      {chatMessages.length > 0 && (
        <div className="px-4 sm:px-6 py-4 space-y-3 max-h-80 overflow-y-auto bg-surface-sunken">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-surface-sunken text-ink rounded-tr-sm'
                  : 'bg-surface text-muted border border-border rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="text-xs font-bold text-brand-ink mb-1">{t('chat.ai_label')}</div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          {chatError && (
            <div className="text-xs text-danger bg-[var(--danger-bg)] rounded-lg px-3 py-2 border border-[var(--danger-border)]">{chatError}</div>
          )}
          <div ref={chatBottomRef} />
        </div>
      )}

      {!chatDisabled && chatMessages.length === 0 && suggestedQuestions.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b border-border flex flex-wrap gap-2">
          {suggestedQuestions.slice(0, 3).map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendChat(q)}
              className="text-sm bg-surface-sunken hover:bg-surface-sunken text-muted border border-border px-3 py-2.5 rounded-full transition-colors text-left min-h-[44px] flex items-center"
            >
              {q.length > 40 ? q.slice(0, 40) + '…' : q}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-6 py-4">
        {chatDisabled ? (
          <div className="text-center text-xs text-faint py-2">
            {t('chat.limit_msg').replace('%d', String(MAX_CHAT_TURNS))}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
              placeholder={t('chat.placeholder')}
              disabled={isChatLoading}
              className="flex-1 text-base bg-surface-sunken border border-border rounded-xl px-4 py-3 text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand focus:border-[var(--brand-border)] disabled:opacity-50 min-h-[var(--touch-min)]"
            />
            <button
              type="button"
              onClick={() => sendChat(chatInput)}
              disabled={isChatLoading || !chatInput.trim()}
              className="shrink-0 bg-brand hover:bg-brand/90 disabled:bg-surface-sunken disabled:cursor-not-allowed text-on-brand disabled:text-faint px-4 py-3 rounded-xl text-base font-bold transition-colors min-h-[var(--touch-min)]"
            >
              {isChatLoading ? '…' : t('chat.send')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface FollowUpHistoryItem {
  round: number;
  timestamp: string;
  changeDescription: string;
}

interface Props {
  result: DiagnosisResult;
  onSavePDF: () => void;
  round?: number;
  followUpHistory?: FollowUpHistoryItem[];
  onResolved?: () => void;
  onResolvedWithStatus?: (status: string, memo: string, afterPhoto?: string) => void;
  onStartFollowUp?: () => void;
  resinType?: string;
  machineSettings?: Record<string, unknown>;
  sessionId?: string | null;
}

export default function DiagnosisResultPanel({ result, onSavePDF, round = 1, followUpHistory = [], onResolved, onResolvedWithStatus, onStartFollowUp, resinType, machineSettings, sessionId }: Props) {
  const { t, locale } = useLocale();
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [isDebug, setIsDebug] = useState(false);
  const [showResolvedForm, setShowResolvedForm] = useState(false);
  const [resolvedStatus, setResolvedStatus] = useState('solved');
  const [resolvedMemo, setResolvedMemo] = useState('');
  const [afterPhoto, setAfterPhoto] = useState<string | undefined>(undefined);
  const afterPhotoRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1');
  }, []);

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const defectTypeKo = result?.defect_type?.ko || (locale === 'en' ? 'Analysis Complete' : '분석 완료');
  const defectTypeEn = result?.defect_type?.en || 'Analysis Complete';
  const defectTypeMain = locale === 'en' ? defectTypeEn : defectTypeKo;
  const defectTypeSub = locale === 'en' ? null : defectTypeEn;
  const severity = result?.severity || 'medium';
  const summary = result?.summary || '';
  const causes = result?.causes || [];
  const recommendations = result?.recommendations || [];
  const checklist = result?.checklist || { before_changes: [], after_changes: [], escalation: [] };
  const processWindow = result?.process_window_check || {};
  const hasRawResponse = !!result?.raw_response;

  const toggleCheck = (i: number) => {
    setCheckedItems(prev => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const MAX_CHAT_TURNS = 5;
  const userTurns = chatMessages.filter(m => m.role === 'user').length;
  const chatDisabled = userTurns >= MAX_CHAT_TURNS;

  const sendChat = async (question: string) => {
    const q = question.trim();
    if (!q || isChatLoading || chatDisabled) return;

    const userMsg: ChatMessage = { role: 'user', content: q };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatError('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/diagnose-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          question: q,
          diagnosisResult: result,
          chatHistory: chatMessages,
          resinType,
          machineSettings,
          locale,
          session_id: sessionId,
        }),
      });

      if (res.status === 401) {
        setChatError(t('auth.login_required'));
        setIsChatLoading(false);
        return;
      }
      if (res.status === 402) {
        setChatError(t('chat.followup_limit'));
        setIsChatLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('chat.error'));
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : '...');
    } finally {
      setIsChatLoading(false);
    }
  };

  const suggestedQuestions: string[] = [];
  if (recommendations[0]) {
    suggestedQuestions.push(`${recommendations[0].parameter}${t('chat.q1')}`);
  }
  if (causes[0]) {
    suggestedQuestions.push(`${causes[0].description}${t('chat.q2')}`);
  }
  suggestedQuestions.push(t('chat.q3'));

  const roundBadge = round === 1
    ? { label: t('result.round1'), cls: 'bg-brand-tint text-brand-ink border border-[var(--brand-border)]' }
    : round === 2
    ? { label: t('result.round2'), cls: 'bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)]' }
    : { label: `${round}${t('result.round_n')}`, cls: 'bg-[var(--danger-bg)] text-danger border border-[var(--danger-border)]' };

  /* Image_Unreadable */
  if (defectTypeEn === 'Image_Unreadable') {
    return (
      <div className="bg-surface-solid border border-[var(--warn-border)] rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <div className="text-5xl">📷</div>
        <h2 className="text-lg font-bold text-warn">{t('fallback.unreadable_title')}</h2>
        <p className="text-muted text-base leading-relaxed">
          {t('fallback.unreadable_body')}<br />
          {t('fallback.unreadable_detail')}
        </p>
        <p className="text-faint text-[length:var(--text-label)]">{summary}</p>
        <button type="button" onClick={onResolved}
          className="mx-auto mt-2 flex items-center gap-2 bg-[var(--warn-bg)] hover:bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)] px-5 py-3 rounded-xl text-base font-bold transition-colors min-h-[var(--touch-cta)]">
          {t('fallback.unreadable_btn')}
        </button>
      </div>
    );
  }

  /* No_Defect_Detected */
  if (defectTypeEn === 'No_Defect_Detected') {
    return (
      <div className="bg-surface-solid border border-[var(--brand-border)] rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-lg font-bold text-brand-ink">{t('fallback.nodefect_title')}</h2>
        <p className="text-muted text-base leading-relaxed">
          {t('fallback.nodefect_body')}
        </p>
        <p className="text-faint text-[length:var(--text-label)]">{summary}</p>
        <button type="button" onClick={onResolved}
          className="mx-auto mt-2 flex items-center gap-2 bg-brand-tint hover:bg-brand-tint text-brand-ink border border-[var(--brand-border)] px-5 py-3 rounded-xl text-base font-bold transition-colors min-h-[var(--touch-cta)]">
          {t('fallback.nodefect_btn')}
        </button>
      </div>
    );
  }

  /* Insufficient_Input — 이미지 없고 입력 근거 부족 (이미지 관련 멘트 없음) */
  if (defectTypeEn === 'Insufficient_Input') {
    return (
      <div className="bg-surface-solid border border-border rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <div className="text-5xl">📝</div>
        <h2 className="text-lg font-bold text-ink">
          {locale === 'en' ? 'More Information Needed' : '추가 정보가 필요합니다'}
        </h2>
        <p className="text-muted text-base leading-relaxed">{summary}</p>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mx-auto mt-2 flex items-center gap-2 bg-brand hover:brightness-90 text-on-brand px-5 py-3 rounded-xl text-base font-bold transition-colors min-h-[var(--touch-cta)]"
        >
          {locale === 'en' ? 'Add Information & Retry' : '정보 입력 후 재시도'}
        </button>
      </div>
    );
  }

  /* Parse failure fallback */
  if (hasRawResponse) {
    const raw = result?.raw_response ?? '';
    const extractStr = (key: string) => {
      const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]{1,120})"`, 'i'));
      return m ? m[1] : '';
    };
    const extractedSummary = extractStr('summary') || summary || '';
    const extractedCause = (() => {
      const m = raw.match(/"description"\s*:\s*"([^"]{1,80})"/);
      return m ? m[1] : '';
    })();

    return (
      <div className="space-y-4">
        <div className="bg-surface-solid border border-[var(--warn-border)] rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-warn text-lg">⚠</span>
            <span className="text-warn font-bold text-sm">{t('fallback.parse_title')}</span>
            <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold ${roundBadge.cls}`}>{roundBadge.label}</span>
          </div>

          {defectTypeMain && (
            <div className="mb-3">
              <span className="text-ink font-bold text-lg">{defectTypeMain}</span>
              {defectTypeSub && <span className="text-muted text-sm ml-2">({defectTypeSub})</span>}
            </div>
          )}
          {extractedSummary && (
            <p className="text-muted text-sm bg-surface-sunken rounded-xl px-4 py-3 border border-border mb-3">
              {extractedSummary}
            </p>
          )}
          {extractedCause && (
            <p className="text-muted text-[length:var(--text-label)] px-3">{t('fallback.parse_cause_prefix')}{extractedCause}</p>
          )}

          <p className="text-muted text-[length:var(--text-label)] mt-4">{t('fallback.parse_body')}</p>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 bg-brand-tint hover:bg-brand-tint text-brand-ink border border-[var(--brand-border)] px-4 py-3.5 rounded-xl text-sm font-bold transition-colors min-h-[48px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('fallback.parse_retry')}
        </button>
      </div>
    );
  }

  const processWindowLabelMap: Record<string, string> = {
    melt_temp: t('summary.pw_melt'),
    mold_temp: t('summary.pw_mold'),
    injection_speed: t('summary.pw_speed'),
    pack_pressure: t('summary.pw_pack'),
    drying: t('summary.pw_dry'),
  };

  return (
    <div className="space-y-5">
      {/* Follow-up Timeline */}
      {followUpHistory.length > 0 && (
        <div className="bg-surface rounded-2xl p-4 border border-border overflow-x-auto">
          <div className="text-xs font-bold text-faint uppercase tracking-wider mb-3">{t('timeline.title')}</div>
          <div className="flex items-center gap-2 min-w-max">
            {followUpHistory.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-center">
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${h.round === 1 ? 'bg-brand-tint text-brand-ink' : h.round === 2 ? 'bg-[var(--warn-bg)] text-warn' : 'bg-[var(--danger-bg)] text-danger'}`}>
                    {locale === 'ko' ? `${h.round}${t('timeline.round_n')}` : `${t('timeline.round_n')} ${h.round}`}
                  </div>
                  {h.changeDescription && (
                    <div className="text-xs text-faint mt-1 max-w-[100px] truncate" title={h.changeDescription}>
                      {t('timeline.action_prefix')}{h.changeDescription}
                    </div>
                  )}
                </div>
                {i < followUpHistory.length - 1 && <span className="text-faint font-bold">→</span>}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-faint font-bold">→</span>
              <div className={`px-2 py-1 rounded-full text-xs font-bold ${roundBadge.cls}`}>{roundBadge.label}</div>
            </div>
          </div>
        </div>
      )}

      {/* 3차+ Expert banner */}
      {round >= 3 && (
        <div className="bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-2xl p-4 flex items-start gap-3">
          <span className="text-danger text-xl shrink-0">⚠</span>
          <div>
            <p className="font-bold text-danger text-sm">
              {locale === 'ko' ? `${round}${t('banner.repeat_title')}` : t('banner.repeat_title')}
            </p>
            <p className="text-danger/80 text-xs mt-1">{t('banner.repeat_body')}</p>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[length:var(--text-h2)] sm:text-[length:var(--text-h1)] font-bold text-ink leading-tight">
              {defectTypeMain}
              {defectTypeSub && <span className="text-faint text-base font-normal ml-2">({defectTypeSub})</span>}
            </h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <SeverityBadge severity={severity} />
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${roundBadge.cls}`}>{roundBadge.label}</span>
              {result?.tier === 'complex'
                ? <span className="px-3 py-1 rounded-full text-sm font-bold bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)]">{t('summary.complex_badge')}</span>
                : <span className="px-3 py-1 rounded-full text-sm font-bold bg-brand-tint text-brand-ink border border-[var(--brand-border)]">{t('summary.basic_badge')}</span>
              }
            </div>
          </div>
          <button
            type="button"
            onClick={onSavePDF}
            className="flex items-center gap-2 bg-surface-sunken hover:bg-surface-sunken text-ink px-3 py-2.5 rounded-lg text-base font-medium transition-colors whitespace-nowrap min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('summary.pdf_btn')}
          </button>
        </div>
        <p className="text-muted text-base leading-relaxed bg-surface-sunken rounded-lg p-4">{summary}</p>

        {result?.defect_phase && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-brand-tint text-brand-ink font-medium">
              {result.defect_phase === 'filling' ? t('summary.phase_filling') :
               result.defect_phase === 'packing' ? t('summary.phase_packing') :
               result.defect_phase === 'cooling' ? t('summary.phase_cooling') : t('summary.phase_material')}
            </span>
          </div>
        )}
        {Object.keys(processWindow).length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-bold text-faint uppercase tracking-wider mb-2">{t('summary.process_check')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(processWindow).map(([key, val]) => {
                if (!val) return null;
                const colorMap = { ok: 'bg-brand-tint border-[var(--brand-border)] text-brand-ink', warning: 'bg-[var(--warn-bg)] border-[var(--warn-border)] text-warn', critical: 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-danger' };
                const iconMap = { ok: '✓', warning: '⚠', critical: '✕' };
                const c = colorMap[val.status as keyof typeof colorMap] || colorMap.warning;
                return (
                  <div key={key} className={`flex items-start gap-2 text-xs p-2 rounded-lg border ${c}`}>
                    <span className="font-bold shrink-0">{iconMap[val.status as keyof typeof iconMap]} {processWindowLabelMap[key] || key}</span>
                    <span>{val.note}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top 5 Actions */}
      {result?.top5_actions && result.top5_actions.length > 0 && (
        <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
          <h3 className="text-ink font-bold text-lg mb-4 flex items-center gap-2">
            <span className="bg-brand text-on-brand text-xs px-2 py-1 rounded-full font-bold">{t('top5.badge')}</span>
            {t('top5.title')}
          </h3>
          <div className="space-y-3">
            {result.top5_actions.map((item) => {
              const colors = [
                { ring: 'bg-danger', badge: 'bg-danger/20 text-danger border-[var(--danger-border)]' },
                { ring: 'bg-warn', badge: 'bg-warn/20 text-warn border-[var(--warn-border)]' },
                { ring: 'bg-warn', badge: 'bg-warn/20 text-warn border-[var(--warn-border)]' },
                { ring: 'bg-brand', badge: 'bg-brand-tint text-brand-ink border-[var(--brand-border)]' },
                { ring: 'bg-surface-sunken', badge: 'bg-surface-sunken text-faint border-border' },
              ];
              const c = colors[(item.step - 1) % colors.length];
              return (
                <div key={item.step} className={`flex gap-3 p-3 rounded-xl border ${c.badge}`}>
                  <div className={`shrink-0 w-7 h-7 rounded-full ${c.ring} flex items-center justify-center text-ink text-sm font-bold`}>
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-semibold text-base leading-snug">{item.action}</p>
                    <p className="text-muted text-[length:var(--text-label)] mt-1">{item.why}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Causes */}
      {causes.length > 0 && (
        <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
          <h3 className="text-lg font-bold text-ink mb-4">{t('causes.title')}</h3>
          <div className="space-y-4">
            {causes.map((cause) => (
              <CauseCard key={cause.rank} cause={cause} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
          <h3 className="text-lg font-bold text-ink mb-4">{t('rec.title')}</h3>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-sunken text-faint">
                  <th className="text-left px-4 py-3 font-semibold rounded-l-lg">{t('rec.col_param')}</th>
                  <th className="text-center px-4 py-3 font-semibold">{t('rec.col_current')}</th>
                  <th className="text-center px-4 py-3 font-semibold">{t('rec.col_recommended')}</th>
                  <th className="text-left px-4 py-3 font-semibold rounded-r-lg">{t('rec.col_reason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recommendations.map((rec, i) => {
                  const changed = rec.current !== rec.recommended && rec.direction !== 'same';
                  return (
                    <tr key={i} className={changed ? 'bg-warn/5' : ''}>
                      <td className="px-4 py-3 font-medium text-muted">{rec.parameter}</td>
                      <td className="px-4 py-3 text-center text-muted">{rec.current || '-'}</td>
                      <td className="px-4 py-3 text-center font-bold text-ink">
                        <span className="flex items-center justify-center gap-1">
                          <DirectionArrow direction={rec.direction} />
                          {rec.recommended}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{rec.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {recommendations.map((rec, i) => {
              const changed = rec.current !== rec.recommended && rec.direction !== 'same';
              return (
                <div key={i} className={`rounded-xl p-3 border ${changed ? 'bg-[var(--warn-bg)] border-[var(--warn-border)]' : 'bg-surface border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-muted text-sm">{rec.parameter}</span>
                    {changed && <span className="text-xs bg-warn/20 text-warn px-2 py-0.5 rounded-full font-medium">{t('rec.change_needed')}</span>}
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 text-center bg-surface-sunken rounded-lg p-2 border border-border">
                      <div className="text-[length:var(--text-label)] text-faint mb-0.5">{t('rec.col_current')}</div>
                      <div className="text-base text-muted font-medium">{rec.current || '-'}</div>
                    </div>
                    <div className="text-faint">→</div>
                    <div className="flex-1 text-center bg-surface-sunken rounded-lg p-2 border border-[var(--brand-border)]">
                      <div className="text-[length:var(--text-label)] text-faint mb-0.5">{t('rec.col_recommended')}</div>
                      <div className="text-base font-bold text-ink flex items-center justify-center gap-1">
                        <DirectionArrow direction={rec.direction} />
                        {rec.recommended}
                      </div>
                    </div>
                  </div>
                  <p className="text-[length:var(--text-label)] text-muted mb-1">{rec.reason}</p>
                  {rec.expected_result && <p className="text-[length:var(--text-label)] text-muted bg-brand-tint rounded px-2 py-1">{t('rec.expected_prefix')}{rec.expected_result}</p>}
                  {rec.risk && <p className="text-[length:var(--text-label)] text-warn bg-[var(--warn-bg)] rounded px-2 py-1 mt-1">{t('rec.risk_prefix')}{rec.risk}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
        <h3 className="text-lg font-bold text-ink mb-4">{t('checklist.title')}</h3>
        {Array.isArray(checklist) ? (
          <div className="space-y-2">
            {(checklist as string[]).map((item, i) => (
              <label key={i} className={`flex items-start gap-3 cursor-pointer px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${checkedItems.has(i) ? 'bg-brand-tint line-through text-faint' : 'hover:bg-surface-sunken'}`}>
                <input type="checkbox" className="mt-0.5 w-6 h-6 rounded accent-[var(--brand)] shrink-0" checked={checkedItems.has(i)} onChange={() => toggleCheck(i)} />
                <span className="text-base text-muted">{item}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { key: 'before_changes', label: t('checklist.before'), color: 'text-brand-ink', bg: 'bg-brand-tint', border: 'border-[var(--brand-border)]' },
              { key: 'after_changes', label: t('checklist.after'), color: 'text-brand-ink', bg: 'bg-brand-tint', border: 'border-[var(--brand-border)]' },
              { key: 'escalation', label: t('checklist.escalation'), color: 'text-danger', bg: 'bg-[var(--danger-bg)]', border: 'border-[var(--danger-border)]' },
            ].map(({ key, label, color, bg, border }) => {
              const items = (checklist as Record<string, string[]>)[key] ?? [];
              if (!items.length) return null;
              return (
                <div key={key} className={`rounded-xl p-3 border ${bg} ${border}`}>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</div>
                  <div className="space-y-1">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-base text-muted">
                        <span className={`shrink-0 font-bold ${color}`}>·</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mold Analysis */}
      {result?.mold_analysis && (
        <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-[var(--brand-border)]">
          <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('mold.title')}
          </h3>
          <div className="space-y-3">
            {result.mold_analysis.gate_assessment && (
              <div className="bg-brand-tint rounded-xl p-3 border border-[var(--brand-border)]">
                <div className="text-xs font-bold text-brand-ink uppercase tracking-wider mb-1">{t('mold.gate')}</div>
                <p className="text-base text-muted">{result.mold_analysis.gate_assessment}</p>
              </div>
            )}
            {result.mold_analysis.cooling_assessment && (
              <div className="bg-brand-tint rounded-xl p-3 border border-[var(--brand-border)]">
                <div className="text-xs font-bold text-brand-ink uppercase tracking-wider mb-1">{t('mold.cooling')}</div>
                <p className="text-base text-muted">{result.mold_analysis.cooling_assessment}</p>
              </div>
            )}
            {(result.mold_analysis.design_risk_factors?.length ?? 0) > 0 && (
              <div className="bg-[var(--warn-bg)] rounded-xl p-3 border border-[var(--warn-border)]">
                <div className="text-xs font-bold text-warn uppercase tracking-wider mb-2">{t('mold.risks')}</div>
                <div className="space-y-1">
                  {result.mold_analysis.design_risk_factors?.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted">
                      <span className="shrink-0 text-warn font-bold">!</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(result.mold_analysis.recommendations?.length ?? 0) > 0 && (
              <div className="bg-brand-tint rounded-xl p-3 border border-[var(--brand-border)]">
                <div className="text-xs font-bold text-brand-ink/80 uppercase tracking-wider mb-2">{t('mold.suggestions')}</div>
                <div className="space-y-1">
                  {result.mold_analysis.recommendations?.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted">
                      <span className="shrink-0 text-brand-ink font-bold">→</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Notes */}
      {(result?.resin_specific_notes || result?.drying_assessment || result?.additional_advice) && (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 space-y-4">
          {result?.resin_specific_notes && (
            <div>
              <h3 className="font-bold text-brand-ink mb-2">{t('notes.resin')}</h3>
              <p className="text-muted text-base leading-relaxed">{result.resin_specific_notes}</p>
            </div>
          )}
          {result?.drying_assessment && (
            <div>
              <h3 className="font-bold text-brand-ink mb-2">{t('notes.drying')}</h3>
              <p className="text-muted text-base leading-relaxed">{result.drying_assessment}</p>
            </div>
          )}
          {result?.additional_advice && (
            <div>
              <h3 className="font-bold text-warn mb-2">{t('notes.advice')}</h3>
              <p className="text-muted text-base leading-relaxed">{result.additional_advice}</p>
            </div>
          )}
        </div>
      )}

      {result.is_demo ? (
        <div className="rounded-xl border border-[var(--brand-border)] bg-brand-tint p-4 text-center">
          <p className="text-muted text-base">{t('demo.notice')}</p>
        </div>
      ) : (
        <>
          {/* Follow-up Actions */}
          <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
            <div className="text-base font-bold text-muted mb-3">{t('action.prompt')}</div>
            {showResolvedForm ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  {(['solved', 'partial', 'unsolved'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setResolvedStatus(s)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium border transition-colors min-h-[44px] ${
                        resolvedStatus === s
                          ? 'bg-brand text-on-brand border-brand'
                          : 'bg-surface-sunken text-muted border-border hover:border-[var(--brand-border)]'
                      }`}
                    >
                      {s === 'solved' ? '✓' : s === 'partial' ? '△' : '✗'} {t(`history.${s}`)}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full bg-surface-sunken border border-border rounded-xl px-3 py-3 text-base text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  rows={2}
                  placeholder={t('history.memo_placeholder')}
                  value={resolvedMemo}
                  onChange={(e) => setResolvedMemo(e.target.value)}
                />
                {/* 해결 사진 업로드 */}
                <div>
                  <button
                    type="button"
                    onClick={() => afterPhotoRef.current?.click()}
                    className="w-full flex items-center gap-2 bg-surface-sunken border border-border rounded-xl px-3 py-3 text-muted text-sm font-medium hover:border-[var(--brand-border)] transition-colors min-h-[44px]"
                  >
                    <span>📷</span>
                    <span>{afterPhoto ? t('history.after_photo') + ' ✓' : t('history.after_photo_label')}</span>
                  </button>
                  <p className="text-faint text-xs mt-1 px-1">{t('history.after_photo_help')}</p>
                  <input
                    ref={afterPhotoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const b64 = (ev.target?.result as string)?.split(',')[1];
                        if (b64) {
                          const small = await downscaleImageClient(b64, 400);
                          setAfterPhoto(small);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {afterPhoto && (
                    <div className="mt-2 relative">
                      <img src={`data:image/jpeg;base64,${afterPhoto}`} alt="" className="w-full max-h-32 object-cover rounded-lg" />
                      <button type="button" onClick={() => setAfterPhoto(undefined)} className="absolute top-1 right-1 bg-surface text-muted rounded-full w-6 h-6 flex items-center justify-center text-xs border border-border">×</button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResolvedWithStatus?.(resolvedStatus, resolvedMemo, afterPhoto);
                      onResolved?.();
                      setShowResolvedForm(false);
                      setAfterPhoto(undefined);
                      setResolvedMemo('');
                    }}
                    className="flex-1 bg-brand text-on-brand py-3 rounded-xl font-bold text-base hover:bg-brand-ink transition-colors min-h-[var(--touch-cta)]"
                  >
                    {t('history.save_record')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowResolvedForm(false); setAfterPhoto(undefined); setResolvedMemo(''); }}
                    className="px-5 py-3 rounded-xl border border-border text-muted font-medium hover:bg-surface-sunken transition-colors min-h-[var(--touch-cta)]"
                  >
                    {t('history.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowResolvedForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-tint hover:bg-brand-tint text-brand-ink border border-[var(--brand-border)] px-4 py-3 rounded-xl text-base font-bold transition-colors min-h-[var(--touch-cta)]"
                >
                  <span className="text-lg">✓</span>
                  {t('action.resolved')}
                </button>
                <button
                  type="button"
                  onClick={onStartFollowUp}
                  className="flex-1 flex items-center justify-center gap-2 bg-[var(--warn-bg)] hover:bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)] px-4 py-3 rounded-xl text-base font-bold transition-colors min-h-[var(--touch-cta)]"
                >
                  <span className="text-lg">→</span>
                  {t('action.followup')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {isDebug && result._debug && (() => {
        const d = result._debug!;
        const isHaiku = d.model.toLowerCase().includes('haiku');
        const priceIn = isHaiku ? 1 : 3;
        const priceOut = isHaiku ? 5 : 15;
        const costUsd = d.input_tokens / 1e6 * priceIn + d.output_tokens / 1e6 * priceOut;
        const costKrw = Math.round(costUsd * 1500);
        return (
          <div className="mt-2 px-3 py-1.5 bg-surface-sunken rounded-lg">
            <span className="font-mono text-faint" style={{ fontSize: '11px' }}>
              tok in={d.input_tokens} out={d.output_tokens} cache={d.cache_read} · {d.model} · ≈₩{costKrw}
            </span>
          </div>
        );
      })()}
      {!result.is_demo && (
        <ChatSection
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          isChatLoading={isChatLoading}
          chatError={chatError}
          chatDisabled={chatDisabled}
          userTurns={userTurns}
          suggestedQuestions={suggestedQuestions}
          sendChat={sendChat}
          chatBottomRef={chatBottomRef}
        />
      )}
    </div>
  );
}

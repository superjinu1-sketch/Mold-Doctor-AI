'use client';

import { useState, useRef, useEffect } from 'react';

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
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    high: { label: '심각 (상)', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
    medium: { label: '주의 (중)', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
    low: { label: '경미 (하)', cls: 'bg-[#00E887]/15 text-[#00E887] border border-[#00E887]/30' },
  };
  const c = config[severity as keyof typeof config] || config.medium;
  return <span className={`px-3 py-1 rounded-full text-sm font-bold ${c.cls}`}>{c.label}</span>;
}

function DirectionArrow({ direction }: { direction?: string }) {
  if (direction === 'up') return <span className="text-red-500 font-bold">↑</span>;
  if (direction === 'down') return <span className="text-blue-500 font-bold">↓</span>;
  return <span className="text-green-500 font-bold">✓</span>;
}

type CauseItem = DiagnosisResult['causes'][number];

function CauseCard({ cause }: { cause: CauseItem }) {
  const [openPanel, setOpenPanel] = useState<string | null>('scientific_reasoning');
  const toggle = (key: string) => setOpenPanel(prev => prev === key ? null : key);

  const rankColor = cause.rank === 1 ? 'bg-red-500' : cause.rank === 2 ? 'bg-amber-500' : 'bg-white/20';
  const rankBg = cause.rank === 1 ? 'bg-red-500/15 text-red-400' : cause.rank === 2 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/10 text-white/50';
  const catColor =
    cause.category?.includes('Material') || cause.category === '건조' || cause.category === '수지' ? 'bg-blue-500/15 text-blue-400' :
    cause.category?.includes('Machine') || cause.category === '온도' || cause.category === '압력' ? 'bg-red-500/15 text-red-400' :
    cause.category?.includes('Mold') || cause.category === '금형' ? 'bg-purple-500/15 text-purple-400' :
    cause.category?.includes('Method') ? 'bg-amber-500/15 text-amber-400' :
    'bg-white/10 text-white/50';

  const panels: { key: string; label: string; icon: string; value: string | undefined; headerCls: string; bodyCls: string }[] = [
    {
      key: 'scientific_reasoning',
      label: '왜?',
      icon: '🔬',
      value: cause.scientific_reasoning || cause.detail,
      headerCls: 'bg-blue-500/10 hover:bg-blue-500/15 text-blue-400',
      bodyCls: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    },
    {
      key: 'evidence',
      label: '근거',
      icon: '📊',
      value: cause.evidence,
      headerCls: 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400',
      bodyCls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    },
    {
      key: 'elimination',
      label: '다른 원인 배제',
      icon: '✕',
      value: cause.elimination,
      headerCls: 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-400',
      bodyCls: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    },
    {
      key: 'verification',
      label: '현장 확인법',
      icon: '✓',
      value: cause.verification,
      headerCls: 'bg-purple-500/10 hover:bg-purple-500/15 text-purple-400',
      bodyCls: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
    },
  ].filter(p => p.value);

  return (
    <div className="border border-white/8 rounded-xl p-4 bg-white/[0.02]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${rankColor}`}>
            {cause.rank}
          </span>
          <span className="font-semibold text-white/80 text-sm sm:text-base">{cause.description}</span>
        </div>
        <span className={`shrink-0 text-sm font-bold px-2 py-1 rounded ${rankBg}`}>{cause.probability}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 mb-3">
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
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${headerCls}`}
              >
                <span className="flex items-center gap-1.5">
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
                <span className={`text-xs transition-transform inline-block ${openPanel === key ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {openPanel === key && (
                <div className={`px-3 py-2.5 text-xs leading-relaxed border-x border-b rounded-b-lg ${bodyCls}`}>
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
  const MAX_CHAT_TURNS = 5;
  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/8 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <span className="font-bold text-white text-sm sm:text-base">추가 질문이 있으신가요?</span>
          </div>
          <span className="text-xs text-white/30">{userTurns}/{MAX_CHAT_TURNS}회 사용</span>
        </div>
      </div>

      {/* 대화 내역 */}
      {chatMessages.length > 0 && (
        <div className="px-4 sm:px-6 py-4 space-y-3 max-h-80 overflow-y-auto bg-black/20">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-white/10 text-white rounded-tr-sm'
                  : 'bg-white/[0.05] text-white/70 border border-white/10 rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="text-xs font-bold text-[#00E887] mb-1">AI 전문가</div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-[#00E887] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#00E887] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#00E887] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          {chatError && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{chatError}</div>
          )}
          <div ref={chatBottomRef} />
        </div>
      )}

      {/* 예시 질문 버튼 */}
      {!chatDisabled && chatMessages.length === 0 && suggestedQuestions.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b border-white/5 flex flex-wrap gap-2">
          {suggestedQuestions.slice(0, 3).map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendChat(q)}
              className="text-xs bg-white/5 hover:bg-white/10 text-white/50 border border-white/10 px-3 py-1.5 rounded-full transition-colors text-left"
            >
              {q.length > 40 ? q.slice(0, 40) + '…' : q}
            </button>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div className="px-4 sm:px-6 py-4">
        {chatDisabled ? (
          <div className="text-center text-xs text-white/30 py-2">
            무료 플랜 질문 한도({MAX_CHAT_TURNS}회)를 모두 사용했습니다. {/* TODO: Pro 업그레이드 링크 */}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
              placeholder="추정 결과에 대해 질문하세요..."
              disabled={isChatLoading}
              className="flex-1 text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#00E887]/30 focus:border-[#00E887]/40 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => sendChat(chatInput)}
              disabled={isChatLoading || !chatInput.trim()}
              className="shrink-0 bg-[#00E887] hover:bg-[#00E887]/90 disabled:bg-white/10 disabled:cursor-not-allowed text-black disabled:text-white/20 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
            >
              {isChatLoading ? '…' : '전송'}
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
  onStartFollowUp?: () => void;
  resinType?: string;
  machineSettings?: Record<string, unknown>;
}

export default function DiagnosisResultPanel({ result, onSavePDF, round = 1, followUpHistory = [], onResolved, onStartFollowUp, resinType, machineSettings }: Props) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // 안전 변수 — 모든 필드 접근은 여기서만
  const defectTypeKo = result?.defect_type?.ko || '분석 완료';
  const defectTypeEn = result?.defect_type?.en || 'Analysis Complete';
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          diagnosisResult: result,
          chatHistory: chatMessages,
          resinType,
          machineSettings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '응답 오류');
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : '채팅 응답 중 오류가 발생했습니다.');
    } finally {
      setIsChatLoading(false);
    }
  };

  // 예시 질문 동적 생성
  const suggestedQuestions: string[] = [];
  if (recommendations[0]) {
    suggestedQuestions.push(`${recommendations[0].parameter}을(를) ${recommendations[0].recommended}으로 바꾸면 사이클 타임이 늘어나나요?`);
  }
  if (causes[0]) {
    suggestedQuestions.push(`${causes[0].description}을 먼저 확인하려면 구체적으로 어떻게 하나요?`);
  }
  suggestedQuestions.push('이 조건에서 다른 수지로 바꾸면 어떤 차이가 있나요?');

  const roundBadge = round === 1
    ? { label: '1차 추정', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' }
    : round === 2
    ? { label: '2차 후속 추정', cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' }
    : { label: `${round}차 심층 추정`, cls: 'bg-red-500/15 text-red-400 border border-red-500/30' };

  /* Image_Unreadable: 판독 불가 이미지 */
  if (defectTypeEn === 'Image_Unreadable') {
    return (
      <div className="bg-[#0D1117] border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <div className="text-5xl">📷</div>
        <h2 className="text-lg font-bold text-amber-400">이미지 판독 불가</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          밝은 곳에서 불량 부위를 선명하게 재촬영해 주세요.<br />
          단색·흐린 사진·사출 제품 무관 이미지는 분석할 수 없습니다.
        </p>
        <p className="text-white/30 text-xs">{summary}</p>
        <button type="button" onClick={onResolved}
          className="mx-auto mt-2 flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
          사진 교체 후 재시도
        </button>
      </div>
    );
  }

  /* No_Defect_Detected: 불량 미검출 */
  if (defectTypeEn === 'No_Defect_Detected') {
    return (
      <div className="bg-[#0D1117] border border-[#00E887]/20 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-lg font-bold text-[#00E887]">불량 미검출</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          이 이미지에서 불량 형상이 검출되지 않았습니다.<br />
          의심되는 부위를 확대 촬영하거나 다른 각도 사진을 추가하세요.
        </p>
        <p className="text-white/30 text-xs">{summary}</p>
        <button type="button" onClick={onResolved}
          className="mx-auto mt-2 flex items-center gap-2 bg-[#00E887]/10 hover:bg-[#00E887]/15 text-[#00E887] border border-[#00E887]/30 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
          사진 추가 후 재시도
        </button>
      </div>
    );
  }

  /* 파싱 실패 fallback — raw JSON 절대 노출 금지. 최소 정보 카드만 표시. */
  if (hasRawResponse) {
    // raw 텍스트에서 핵심 필드만 정규식 추출
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
        {/* 최소 결과 카드 */}
        <div className="bg-[#0D1117] border border-amber-500/30 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-amber-400 text-lg">⚠</span>
            <span className="text-amber-400 font-bold text-sm">상세 결과 생성 실패</span>
            <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold ${roundBadge.cls}`}>{roundBadge.label}</span>
          </div>

          {defectTypeKo && (
            <div className="mb-3">
              <span className="text-white font-bold text-lg">{defectTypeKo}</span>
              {defectTypeEn && <span className="text-white/40 text-sm ml-2">({defectTypeEn})</span>}
            </div>
          )}
          {extractedSummary && (
            <p className="text-white/70 text-sm bg-white/5 rounded-xl px-4 py-3 border border-white/8 mb-3">
              {extractedSummary}
            </p>
          )}
          {extractedCause && (
            <p className="text-white/50 text-xs px-3">추정 원인 단서: {extractedCause}</p>
          )}

          <p className="text-white/30 text-xs mt-4">
            응답이 너무 길어 구조화 파싱에 실패했습니다. 아래 버튼으로 다시 추정하거나 불량 설명을 줄여서 재시도하세요.
          </p>
        </div>

        {/* 재시도 버튼 */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 bg-[#00E887]/10 hover:bg-[#00E887]/15 text-[#00E887] border border-[#00E887]/30 px-4 py-3.5 rounded-xl text-sm font-bold transition-colors min-h-[48px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          다시 추정하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Follow-up Timeline */}
      {followUpHistory.length > 0 && (
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/8 overflow-x-auto">
          <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">추정 이력</div>
          <div className="flex items-center gap-2 min-w-max">
            {followUpHistory.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-center">
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${h.round === 1 ? 'bg-blue-500/15 text-blue-400' : h.round === 2 ? 'bg-orange-500/15 text-orange-400' : 'bg-red-500/15 text-red-400'}`}>
                    {h.round}차 추정
                  </div>
                  {h.changeDescription && (
                    <div className="text-xs text-white/30 mt-1 max-w-[100px] truncate" title={h.changeDescription}>
                      조치: {h.changeDescription}
                    </div>
                  )}
                </div>
                {i < followUpHistory.length - 1 && <span className="text-white/20 font-bold">→</span>}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-white/20 font-bold">→</span>
              <div className={`px-2 py-1 rounded-full text-xs font-bold ${roundBadge.cls}`}>{roundBadge.label}</div>
            </div>
          </div>
        </div>
      )}

      {/* 3차+ 전문가 상담 권장 배너 */}
      {round >= 3 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-xl shrink-0">⚠</span>
          <div>
            <p className="font-bold text-red-400 text-sm">{round}차 반복 추정 — 전문가 상담 권장</p>
            <p className="text-red-400/80 text-xs mt-1">성형 조건 조정으로 해결이 어려운 단계입니다. 금형 정밀 점검, 사출기 기계적 점검, 또는 소재 변경을 검토하세요.</p>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white/[0.03] rounded-2xl p-4 sm:p-6 border border-white/8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {defectTypeKo}
              <span className="text-white/30 text-sm sm:text-base font-normal ml-2">({defectTypeEn})</span>
            </h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <SeverityBadge severity={severity} />
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${roundBadge.cls}`}>{roundBadge.label}</span>
              {/* TODO: complex → "심층 분석 (Pro)" 배지 (보라) 로 변경 예정 */}
              {result?.tier === 'complex'
                ? <span className="px-3 py-1 rounded-full text-sm font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">복합 분석</span>
                : <span className="px-3 py-1 rounded-full text-sm font-bold bg-[#00E887]/15 text-[#00E887] border border-[#00E887]/30">기본 분석</span>
              }
            </div>
          </div>
          <button
            type="button"
            onClick={onSavePDF}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF 저장
          </button>
        </div>
        <p className="text-white/60 text-base leading-relaxed bg-white/5 rounded-lg p-4">{summary}</p>

        {result?.defect_phase && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 font-medium">
              {result.defect_phase === 'filling' ? '충전(Filling) 불량' :
               result.defect_phase === 'packing' ? '보압(Packing) 불량' :
               result.defect_phase === 'cooling' ? '냉각(Cooling) 불량' : '재료(Material) 불량'}
            </span>
          </div>
        )}
        {Object.keys(processWindow).length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">프로세스 윈도우 체크</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(processWindow).map(([key, val]) => {
                if (!val) return null;
                const labelMap: Record<string, string> = { melt_temp: '용융 온도', mold_temp: '금형 온도', injection_speed: '사출 속도', pack_pressure: '보압', drying: '건조' };
                const colorMap = { ok: 'bg-[#00E887]/10 border-[#00E887]/20 text-[#00E887]', warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400', critical: 'bg-red-500/10 border-red-500/20 text-red-400' };
                const iconMap = { ok: '✓', warning: '⚠', critical: '✕' };
                const c = colorMap[val.status as keyof typeof colorMap] || colorMap.warning;
                return (
                  <div key={key} className={`flex items-start gap-2 text-xs p-2 rounded-lg border ${c}`}>
                    <span className="font-bold shrink-0">{iconMap[val.status as keyof typeof iconMap]} {labelMap[key] || key}</span>
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
        <div className="bg-white/[0.03] rounded-2xl p-4 sm:p-6 border border-white/8">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="bg-[#00E887] text-black text-xs px-2 py-1 rounded-full font-bold">즉시 실행</span>
            최우선 조치 5가지
          </h3>
          <div className="space-y-3">
            {result.top5_actions.map((item) => {
              const colors = [
                { ring: 'bg-red-500', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
                { ring: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
                { ring: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                { ring: 'bg-blue-500', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                { ring: 'bg-white/20', badge: 'bg-white/10 text-white/50 border-white/15' },
              ];
              const c = colors[(item.step - 1) % colors.length];
              return (
                <div key={item.step} className={`flex gap-3 p-3 rounded-xl border ${c.badge}`}>
                  <div className={`shrink-0 w-7 h-7 rounded-full ${c.ring} flex items-center justify-center text-white text-sm font-bold`}>
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-snug">{item.action}</p>
                    <p className="text-white/40 text-xs mt-1">{item.why}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Causes */}
      {causes.length > 0 && (
        <div className="bg-white/[0.03] rounded-2xl p-4 sm:p-6 border border-white/8">
          <h3 className="text-lg font-bold text-white mb-4">원인 분석</h3>
          <div className="space-y-4">
            {causes.map((cause) => (
              <CauseCard key={cause.rank} cause={cause} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white/[0.03] rounded-2xl p-4 sm:p-6 border border-white/8">
          <h3 className="text-lg font-bold text-white mb-4">해결 방안 — 셋팅 비교</h3>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-white/40">
                  <th className="text-left px-4 py-3 font-semibold rounded-l-lg">파라미터</th>
                  <th className="text-center px-4 py-3 font-semibold">현재값</th>
                  <th className="text-center px-4 py-3 font-semibold">권장값</th>
                  <th className="text-left px-4 py-3 font-semibold rounded-r-lg">변경 이유</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recommendations.map((rec, i) => {
                  const changed = rec.current !== rec.recommended && rec.direction !== 'same';
                  return (
                    <tr key={i} className={changed ? 'bg-amber-500/5' : ''}>
                      <td className="px-4 py-3 font-medium text-white/70">{rec.parameter}</td>
                      <td className="px-4 py-3 text-center text-white/40">{rec.current || '-'}</td>
                      <td className="px-4 py-3 text-center font-bold text-white">
                        <span className="flex items-center justify-center gap-1">
                          <DirectionArrow direction={rec.direction} />
                          {rec.recommended}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60">{rec.reason}</td>
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
                <div key={i} className={`rounded-xl p-3 border ${changed ? 'bg-amber-500/10 border-amber-500/25' : 'bg-white/[0.03] border-white/8'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white/70 text-sm">{rec.parameter}</span>
                    {changed && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">변경 필요</span>}
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 text-center bg-white/5 rounded-lg p-2 border border-white/10">
                      <div className="text-xs text-white/30 mb-0.5">현재값</div>
                      <div className="text-sm text-white/50 font-medium">{rec.current || '-'}</div>
                    </div>
                    <div className="text-white/20">→</div>
                    <div className="flex-1 text-center bg-white/5 rounded-lg p-2 border border-[#00E887]/30">
                      <div className="text-xs text-white/30 mb-0.5">권장값</div>
                      <div className="text-sm font-bold text-white flex items-center justify-center gap-1">
                        <DirectionArrow direction={rec.direction} />
                        {rec.recommended}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mb-1">{rec.reason}</p>
                  {rec.expected_result && <p className="text-xs text-[#00E887] bg-[#00E887]/10 rounded px-2 py-1">기대 효과: {rec.expected_result}</p>}
                  {rec.risk && <p className="text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1 mt-1">주의: {rec.risk}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-white/[0.03] rounded-2xl p-4 sm:p-6 border border-white/8">
        <h3 className="text-lg font-bold text-white mb-4">현장 체크리스트</h3>
        {Array.isArray(checklist) ? (
          <div className="space-y-2">
            {(checklist as string[]).map((item, i) => (
              <label key={i} className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg transition-colors ${checkedItems.has(i) ? 'bg-[#00E887]/5 line-through text-white/25' : 'hover:bg-white/5'}`}>
                <input type="checkbox" className="mt-0.5 w-5 h-5 rounded accent-[#00E887]" checked={checkedItems.has(i)} onChange={() => toggleCheck(i)} />
                <span className="text-sm text-white/70">{item}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { key: 'before_changes', label: '변경 전 확인', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { key: 'after_changes', label: '변경 후 모니터링', color: 'text-[#00E887]', bg: 'bg-[#00E887]/10', border: 'border-[#00E887]/20' },
              { key: 'escalation', label: '에스컬레이션 기준', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            ].map(({ key, label, color, bg, border }) => {
              const items = (checklist as Record<string, string[]>)[key] ?? [];
              if (!items.length) return null;
                return (
                  <div key={key} className={`rounded-xl p-3 border ${bg} ${border}`}>
                    <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</div>
                    <div className="space-y-1">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-white/70">
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
        <div className="bg-white/[0.03] rounded-2xl p-4 sm:p-6 border border-purple-500/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            금형 도면 분석
          </h3>
          <div className="space-y-3">
            {result.mold_analysis.gate_assessment && (
              <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">게이트 평가</div>
                <p className="text-sm text-white/70">{result.mold_analysis.gate_assessment}</p>
              </div>
            )}
            {result.mold_analysis.cooling_assessment && (
              <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">냉각 효율 평가</div>
                <p className="text-sm text-white/70">{result.mold_analysis.cooling_assessment}</p>
              </div>
            )}
            {(result.mold_analysis.design_risk_factors?.length ?? 0) > 0 && (
              <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">설계 위험 요소</div>
                <div className="space-y-1">
                  {result.mold_analysis.design_risk_factors?.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="shrink-0 text-amber-400 font-bold">!</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(result.mold_analysis.recommendations?.length ?? 0) > 0 && (
              <div className="bg-[#00E887]/10 rounded-xl p-3 border border-[#00E887]/20">
                <div className="text-xs font-bold text-[#00E887]/80 uppercase tracking-wider mb-2">금형 수정 제안</div>
                <div className="space-y-1">
                  {result.mold_analysis.recommendations?.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="shrink-0 text-[#00E887] font-bold">→</span>
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
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 sm:p-6 space-y-4">
          {result?.resin_specific_notes && (
            <div>
              <h3 className="font-bold text-[#00E887] mb-2">수지 특성 주의사항</h3>
              <p className="text-white/60 text-sm leading-relaxed">{result.resin_specific_notes}</p>
            </div>
          )}
          {result?.drying_assessment && (
            <div>
              <h3 className="font-bold text-blue-400 mb-2">건조 조건 평가</h3>
              <p className="text-white/60 text-sm leading-relaxed">{result.drying_assessment}</p>
            </div>
          )}
          {result?.additional_advice && (
            <div>
              <h3 className="font-bold text-amber-400 mb-2">추가 조언</h3>
              <p className="text-white/60 text-sm leading-relaxed">{result.additional_advice}</p>
            </div>
          )}
        </div>
      )}

      {/* Follow-up Actions */}
      {/* TODO: Free: 1차 추정만 무료 / Pro: 후속 추정 무제한 */}
      <div className="bg-white/[0.03] rounded-2xl p-4 sm:p-6 border border-white/8">
        <div className="text-sm font-bold text-white/40 mb-3">조치 결과가 어떻게 됐나요?</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onResolved}
            className="flex-1 flex items-center justify-center gap-2 bg-[#00E887]/10 hover:bg-[#00E887]/15 text-[#00E887] border border-[#00E887]/30 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
          >
            <span className="text-lg">✓</span>
            해결됨
          </button>
          <button
            type="button"
            onClick={onStartFollowUp}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/15 text-amber-400 border border-amber-500/30 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
          >
            <span className="text-lg">→</span>
            해결 안 됨 — 후속 추정
          </button>
        </div>
      </div>
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
    </div>
  );
}

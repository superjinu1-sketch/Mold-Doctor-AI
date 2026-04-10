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
    high: { label: '심각 (상)', cls: 'bg-red-100 text-red-700 border border-red-300' },
    medium: { label: '주의 (중)', cls: 'bg-amber-100 text-amber-700 border border-amber-300' },
    low: { label: '경미 (하)', cls: 'bg-green-100 text-green-700 border border-green-300' },
  };
  const c = config[severity as keyof typeof config] || config.medium;
  return <span className={`px-3 py-1 rounded-full text-sm font-bold ${c.cls}`}>{c.label}</span>;
}

function DirectionArrow({ direction }: { direction?: string }) {
  if (direction === 'up') return <span className="text-red-500 font-bold">↑</span>;
  if (direction === 'down') return <span className="text-blue-500 font-bold">↓</span>;
  return <span className="text-green-500 font-bold">✓</span>;
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <span className="font-bold text-[#1E293B] text-sm sm:text-base">추가 질문이 있으신가요?</span>
          </div>
          <span className="text-xs text-slate-400">{userTurns}/{MAX_CHAT_TURNS}회 사용</span>
        </div>
      </div>

      {/* 대화 내역 */}
      {chatMessages.length > 0 && (
        <div className="px-4 sm:px-6 py-4 space-y-3 max-h-80 overflow-y-auto bg-slate-50">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1E293B] text-white rounded-tr-sm'
                  : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="text-xs font-bold text-[#059669] mb-1">AI 전문가</div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-[#059669] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#059669] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#059669] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          {chatError && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{chatError}</div>
          )}
          <div ref={chatBottomRef} />
        </div>
      )}

      {/* 예시 질문 버튼 */}
      {!chatDisabled && chatMessages.length === 0 && suggestedQuestions.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex flex-wrap gap-2">
          {suggestedQuestions.slice(0, 3).map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendChat(q)}
              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full transition-colors text-left"
            >
              {q.length > 40 ? q.slice(0, 40) + '…' : q}
            </button>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div className="px-4 sm:px-6 py-4">
        {chatDisabled ? (
          <div className="text-center text-xs text-slate-400 py-2">
            무료 플랜 질문 한도({MAX_CHAT_TURNS}회)를 모두 사용했습니다. {/* TODO: Pro 업그레이드 링크 */}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
              placeholder="진단 결과에 대해 질문하세요..."
              disabled={isChatLoading}
              className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669] disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-300"
            />
            <button
              type="button"
              onClick={() => sendChat(chatInput)}
              disabled={isChatLoading || !chatInput.trim()}
              className="shrink-0 bg-[#059669] hover:bg-[#047857] disabled:bg-slate-200 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
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
    ? { label: '1차 진단', cls: 'bg-blue-100 text-blue-700 border border-blue-300' }
    : round === 2
    ? { label: '2차 후속 진단', cls: 'bg-orange-100 text-orange-700 border border-orange-300' }
    : { label: `${round}차 심층 진단`, cls: 'bg-red-100 text-red-700 border border-red-300' };

  /* raw_response fallback: 구조화 JSON 파싱 실패 시 */
  if (hasRawResponse) {
    return (
      <div className="space-y-5">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-200">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
                {defectTypeKo}
                <span className="text-slate-400 text-sm sm:text-base font-normal ml-2">({defectTypeEn})</span>
              </h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <SeverityBadge severity={severity} />
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${roundBadge.cls}`}>{roundBadge.label}</span>
              </div>
            </div>
            <button type="button" onClick={onSavePDF}
              className="flex items-center gap-2 bg-[#1E293B] hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF 저장
            </button>
          </div>
          <div className="flex items-center gap-2 text-amber-600 text-sm mb-3">
            <span>⚠</span>
            <span>AI가 구조화된 JSON 대신 텍스트로 응답했습니다. 아래 내용을 참고하세요.</span>
          </div>
          <pre className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-x-auto leading-relaxed">
            {result?.raw_response}
          </pre>
        </div>
        {/* Follow-up Actions */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <div className="text-sm font-bold text-slate-600 mb-3">조치 결과가 어떻게 됐나요?</div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={onResolved}
              className="flex-1 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-300 px-4 py-3 rounded-xl text-sm font-bold transition-colors">
              <span className="text-lg">✓</span>해결됨
            </button>
            <button type="button" onClick={onStartFollowUp}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-300 px-4 py-3 rounded-xl text-sm font-bold transition-colors">
              <span className="text-lg">→</span>해결 안 됨 — 후속 진단
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

  return (
    <div className="space-y-5">
      {/* Follow-up Timeline */}
      {followUpHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 overflow-x-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">진단 이력</div>
          <div className="flex items-center gap-2 min-w-max">
            {followUpHistory.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-center">
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${h.round === 1 ? 'bg-blue-100 text-blue-700' : h.round === 2 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                    {h.round}차 진단
                  </div>
                  {h.changeDescription && (
                    <div className="text-xs text-slate-400 mt-1 max-w-[100px] truncate" title={h.changeDescription}>
                      조치: {h.changeDescription}
                    </div>
                  )}
                </div>
                {i < followUpHistory.length - 1 && <span className="text-slate-300 font-bold">→</span>}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold">→</span>
              <div className={`px-2 py-1 rounded-full text-xs font-bold ${roundBadge.cls}`}>{roundBadge.label}</div>
            </div>
          </div>
        </div>
      )}

      {/* 3차+ 전문가 상담 권장 배너 */}
      {round >= 3 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-xl shrink-0">⚠</span>
          <div>
            <p className="font-bold text-red-700 text-sm">{round}차 반복 진단 — 전문가 상담 권장</p>
            <p className="text-red-600 text-xs mt-1">성형 조건 조정으로 해결이 어려운 단계입니다. 금형 정밀 점검, 사출기 기계적 점검, 또는 소재 변경을 검토하세요.</p>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
              {defectTypeKo}
              <span className="text-slate-400 text-sm sm:text-base font-normal ml-2">({defectTypeEn})</span>
            </h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <SeverityBadge severity={severity} />
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${roundBadge.cls}`}>{roundBadge.label}</span>
              {/* TODO: complex → "심층 분석 (Pro)" 배지 (보라) 로 변경 예정 */}
              {result?.tier === 'complex'
                ? <span className="px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-700 border border-orange-300">복합 분석</span>
                : <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700 border border-green-300">기본 분석</span>
              }
            </div>
          </div>
          <button
            type="button"
            onClick={onSavePDF}
            className="flex items-center gap-2 bg-[#1E293B] hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF 저장
          </button>
        </div>
        <p className="text-slate-600 text-base leading-relaxed bg-slate-50 rounded-lg p-4">{summary}</p>

        {result?.defect_phase && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
              {result.defect_phase === 'filling' ? '충전(Filling) 불량' :
               result.defect_phase === 'packing' ? '보압(Packing) 불량' :
               result.defect_phase === 'cooling' ? '냉각(Cooling) 불량' : '재료(Material) 불량'}
            </span>
          </div>
        )}
        {Object.keys(processWindow).length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">프로세스 윈도우 체크</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(processWindow).map(([key, val]) => {
                if (!val) return null;
                const labelMap: Record<string, string> = { melt_temp: '용융 온도', mold_temp: '금형 온도', injection_speed: '사출 속도', pack_pressure: '보압', drying: '건조' };
                const colorMap = { ok: 'bg-green-50 border-green-200 text-green-700', warning: 'bg-amber-50 border-amber-200 text-amber-700', critical: 'bg-red-50 border-red-200 text-red-700' };
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
        <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-2xl p-4 sm:p-6 shadow-lg">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="bg-[#059669] text-white text-xs px-2 py-1 rounded-full font-bold">즉시 실행</span>
            최우선 조치 5가지
          </h3>
          <div className="space-y-3">
            {result.top5_actions.map((item) => {
              const colors = [
                { ring: 'bg-red-500', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
                { ring: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
                { ring: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                { ring: 'bg-blue-500', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                { ring: 'bg-slate-500', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
              ];
              const c = colors[(item.step - 1) % colors.length];
              return (
                <div key={item.step} className={`flex gap-3 p-3 rounded-xl border ${c.badge}`}>
                  <div className={`shrink-0 w-7 h-7 rounded-full ${c.ring} flex items-center justify-center text-white text-sm font-bold`}>
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-snug">{item.action}</p>
                    <p className="text-slate-400 text-xs mt-1">{item.why}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Causes */}
      {causes.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-[#1E293B] mb-4">원인 분석</h3>
          <div className="space-y-4">
            {causes.map((cause) => (
              <div key={cause.rank} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      cause.rank === 1 ? 'bg-red-500' : cause.rank === 2 ? 'bg-amber-500' : 'bg-slate-400'
                    }`}>{cause.rank}</span>
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">{cause.description}</span>
                  </div>
                  <span className={`shrink-0 text-sm font-bold px-2 py-1 rounded ${
                    cause.rank === 1 ? 'bg-red-50 text-red-600' : cause.rank === 2 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                  }`}>{cause.probability}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full ${cause.rank === 1 ? 'bg-red-500' : cause.rank === 2 ? 'bg-amber-500' : 'bg-slate-400'}`}
                    style={{ width: `${cause.probability}%` }}
                  />
                </div>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${
                  cause.category?.includes('Material') || cause.category === '건조' || cause.category === '수지' ? 'bg-blue-100 text-blue-700' :
                  cause.category?.includes('Machine') || cause.category === '온도' || cause.category === '압력' ? 'bg-red-100 text-red-700' :
                  cause.category?.includes('Mold') || cause.category === '금형' ? 'bg-purple-100 text-purple-700' :
                  cause.category?.includes('Method') ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}>{cause.category}</span>
                <p className="text-slate-600 text-sm mb-1">{cause.detail || cause.scientific_reasoning}</p>
                {cause.evidence && <p className="text-xs text-slate-400 bg-slate-50 rounded px-2 py-1">근거: {cause.evidence}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-[#1E293B] mb-4">해결 방안 — 셋팅 비교</h3>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-3 font-semibold rounded-l-lg">파라미터</th>
                  <th className="text-center px-4 py-3 font-semibold">현재값</th>
                  <th className="text-center px-4 py-3 font-semibold">권장값</th>
                  <th className="text-left px-4 py-3 font-semibold rounded-r-lg">변경 이유</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recommendations.map((rec, i) => {
                  const changed = rec.current !== rec.recommended && rec.direction !== 'same';
                  return (
                    <tr key={i} className={changed ? 'bg-amber-50' : ''}>
                      <td className="px-4 py-3 font-medium text-slate-700">{rec.parameter}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{rec.current || '-'}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#1E293B]">
                        <span className="flex items-center justify-center gap-1">
                          <DirectionArrow direction={rec.direction} />
                          {rec.recommended}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{rec.reason}</td>
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
                <div key={i} className={`rounded-xl p-3 border ${changed ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-700 text-sm">{rec.parameter}</span>
                    {changed && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">변경 필요</span>}
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 text-center bg-white rounded-lg p-2 border border-slate-200">
                      <div className="text-xs text-slate-400 mb-0.5">현재값</div>
                      <div className="text-sm text-slate-600 font-medium">{rec.current || '-'}</div>
                    </div>
                    <div className="text-slate-400">→</div>
                    <div className="flex-1 text-center bg-white rounded-lg p-2 border border-[#059669]/30">
                      <div className="text-xs text-slate-400 mb-0.5">권장값</div>
                      <div className="text-sm font-bold text-[#1E293B] flex items-center justify-center gap-1">
                        <DirectionArrow direction={rec.direction} />
                        {rec.recommended}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{rec.reason}</p>
                  {rec.expected_result && <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">기대 효과: {rec.expected_result}</p>}
                  {rec.risk && <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">주의: {rec.risk}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-[#1E293B] mb-4">현장 체크리스트</h3>
        {Array.isArray(checklist) ? (
          <div className="space-y-2">
            {(checklist as string[]).map((item, i) => (
              <label key={i} className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg transition-colors ${checkedItems.has(i) ? 'bg-green-50 line-through text-slate-400' : 'hover:bg-slate-50'}`}>
                <input type="checkbox" className="mt-0.5 w-5 h-5 rounded accent-[#059669]" checked={checkedItems.has(i)} onChange={() => toggleCheck(i)} />
                <span className="text-sm text-slate-700">{item}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { key: 'before_changes', label: '변경 전 확인', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
              { key: 'after_changes', label: '변경 후 모니터링', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
              { key: 'escalation', label: '에스컬레이션 기준', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
            ].map(({ key, label, color, bg, border }) => {
              const items = (checklist as Record<string, string[]>)[key] ?? [];
              if (!items.length) return null;
                return (
                  <div key={key} className={`rounded-xl p-3 border ${bg} ${border}`}>
                    <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</div>
                    <div className="space-y-1">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
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
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-purple-200">
          <h3 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            금형 도면 분석
          </h3>
          <div className="space-y-3">
            {result.mold_analysis.gate_assessment && (
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">게이트 평가</div>
                <p className="text-sm text-slate-700">{result.mold_analysis.gate_assessment}</p>
              </div>
            )}
            {result.mold_analysis.cooling_assessment && (
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">냉각 효율 평가</div>
                <p className="text-sm text-slate-700">{result.mold_analysis.cooling_assessment}</p>
              </div>
            )}
            {(result.mold_analysis.design_risk_factors?.length ?? 0) > 0 && (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">설계 위험 요소</div>
                <div className="space-y-1">
                  {result.mold_analysis.design_risk_factors?.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="shrink-0 text-amber-500 font-bold">!</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(result.mold_analysis.recommendations?.length ?? 0) > 0 && (
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">금형 수정 제안</div>
                <div className="space-y-1">
                  {result.mold_analysis.recommendations?.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="shrink-0 text-green-600 font-bold">→</span>
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
        <div className="bg-[#1E293B] text-white rounded-2xl p-4 sm:p-6 space-y-4">
          {result?.resin_specific_notes && (
            <div>
              <h3 className="font-bold text-[#34D399] mb-2">수지 특성 주의사항</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{result.resin_specific_notes}</p>
            </div>
          )}
          {result?.drying_assessment && (
            <div>
              <h3 className="font-bold text-blue-400 mb-2">건조 조건 평가</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{result.drying_assessment}</p>
            </div>
          )}
          {result?.additional_advice && (
            <div>
              <h3 className="font-bold text-amber-400 mb-2">추가 조언</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{result.additional_advice}</p>
            </div>
          )}
        </div>
      )}

      {/* Follow-up Actions */}
      {/* TODO: Free: 1차 진단만 무료 / Pro: 후속 진단 무제한 */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="text-sm font-bold text-slate-600 mb-3">조치 결과가 어떻게 됐나요?</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onResolved}
            className="flex-1 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-300 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
          >
            <span className="text-lg">✓</span>
            해결됨
          </button>
          <button
            type="button"
            onClick={onStartFollowUp}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-300 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
          >
            <span className="text-lg">→</span>
            해결 안 됨 — 후속 진단
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

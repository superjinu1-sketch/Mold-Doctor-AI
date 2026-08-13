'use client';

// AI 도움말 위젯(help-desk-widget-v1). 플로팅 FAB(말풍선+"도움말"/"Help" pill) + 바텀시트(모바일)/
// 플로팅 패널(데스크톱) 문답. /diagnose에서는 숨김(진단 화면 자체 UI와 겹침 방지).
// 로그인 유저는 Bearer 토큰 첨부(서버가 10회/일 판정), 비로그인은 서버가 IP로 3회/일 판정.
import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/apiBase';
import { authHeaders } from '@/lib/supabase/authHeader';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  cta?: 'diagnose';
}

export default function HelpWidget() {
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'error' | 'limit'>('idle');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    setStatus('idle');
    try {
      const res = await apiFetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user ? await authHeaders() : {}) },
        body: JSON.stringify({ question: q, locale }),
      });
      if (res.status === 429) {
        setStatus('limit');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setStatus('error');
        setLoading(false);
        return;
      }
      const data = await res.json();
      const cta = data?.cta === 'diagnose' ? 'diagnose' : undefined;
      setMessages(prev => [...prev, { role: 'ai', text: String(data?.answer ?? ''), cta }]);
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [loading, locale, user]);

  if (pathname?.startsWith('/diagnose')) return null;

  const chips = [t('help.chip1'), t('help.chip2'), t('help.chip3'), t('help.chip4')];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-5 z-40 flex items-center gap-2 min-h-[var(--touch-cta)] px-4 rounded-full bg-brand text-on-brand font-semibold text-body shadow-lg hover:bg-brand-ink transition-colors"
        aria-label={t('help.fab')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        <span>{t('help.fab')}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-ink/40 z-40 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 h-[78dvh] rounded-t-2xl bg-surface flex flex-col sm:inset-auto sm:right-4 sm:bottom-5 sm:w-[360px] sm:h-[520px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-border">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div>
                <p className="text-body font-bold text-ink">{t('help.title')}</p>
                <p className="text-[length:var(--text-label)] text-faint">{t('help.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[var(--touch-min)] min-w-[var(--touch-min)] flex items-center justify-center text-muted hover:text-ink"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div className="flex flex-col gap-2">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-sunken text-ink text-body px-3 py-2">
                  {t('help.greeting')}
                </div>
                {messages.length === 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {chips.map((chip, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => send(chip)}
                        className="min-h-[var(--touch-min)] px-3 rounded-full border border-[var(--brand-border)] text-brand-ink text-[length:var(--text-label)] font-medium hover:bg-brand-tint transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex flex-col gap-2 max-w-[85%]">
                    <div
                      className={
                        m.role === 'user'
                          ? 'rounded-2xl rounded-tr-sm bg-brand text-on-brand text-body px-3 py-2'
                          : 'rounded-2xl rounded-tl-sm bg-surface-sunken text-ink text-body px-3 py-2'
                      }
                    >
                      {m.text}
                    </div>
                    {m.cta === 'diagnose' && (
                      <a
                        href="/diagnose"
                        onClick={() => setOpen(false)}
                        className="ui-cta text-center text-body"
                      >
                        {t('help.cta_diagnose')}
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm bg-surface-sunken text-faint text-body px-3 py-2">
                    ···
                  </div>
                </div>
              )}

              {status === 'error' && (
                <p className="text-danger text-[length:var(--text-label)] px-1">{t('help.error')}</p>
              )}
              {status === 'limit' && (
                <p className="text-warn text-[length:var(--text-label)] px-1">{t('help.limit')}</p>
              )}
            </div>

            <div className="border-t border-border p-3 shrink-0 space-y-2">
              <form
                onSubmit={e => { e.preventDefault(); send(input); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={t('help.placeholder')}
                  maxLength={300}
                  className="ui-input flex-1"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="min-h-[var(--touch-min)] min-w-[var(--touch-min)] flex items-center justify-center rounded-full bg-brand text-on-brand disabled:opacity-50 hover:bg-brand-ink transition-colors"
                  aria-label="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M4 12l16-8-6 8 6 8-16-8z" fill="currentColor" />
                  </svg>
                </button>
              </form>
              <p className="text-[length:var(--text-label)] text-faint text-center">{t('help.legal')}</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}

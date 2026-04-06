'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ isSet: boolean; maskedKey: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setKeyStatus(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      if (!res.ok) throw new Error('저장 실패');
      setSaveMsg('✓ 저장되었습니다. 즉시 적용됩니다.');
      setApiKey('');
      await fetchStatus();
    } catch (e) {
      setSaveMsg('저장 중 오류: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <nav className="bg-[#1E293B] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="#059669"/>
                <path d="M8 16C8 11.582 11.582 8 16 8C18.5 8 20.75 9.1 22.25 10.85L24 9.1C22.05 7.2 19.15 6 16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26C19.15 26 22.05 24.8 24 22.9L22.25 21.15C20.75 22.9 18.5 24 16 24C11.582 24 8 20.418 8 16Z" fill="white"/>
                <circle cx="16" cy="16" r="4" fill="white"/>
                <path d="M20 12L26 6M26 6H22M26 6V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Mold Doctor AI</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/diagnose" className="hover:text-[#059669] transition-colors text-sm font-medium">
                진단하기
              </Link>
              <Link href="/guide" className="hover:text-[#059669] transition-colors text-sm font-medium">
                불량 가이드
              </Link>
              <Link href="/pricing" className="hover:text-[#059669] transition-colors text-sm font-medium">
                가격
              </Link>

<Link
                href="/diagnose"
                className="bg-[#059669] hover:bg-[#047857] text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
              >
                무료 진단
              </Link>
            </div>

            {/* Mobile: hamburger */}
            <div className="md:hidden flex items-center gap-2">
              <button
                className="p-2 rounded-lg hover:bg-white/10"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="메뉴 열기"
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  {menuOpen ? (
                    <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/>
                  ) : (
                    <>
                      <path d="M4 6h16" strokeLinecap="round"/>
                      <path d="M4 12h16" strokeLinecap="round"/>
                      <path d="M4 18h16" strokeLinecap="round"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="md:hidden pb-4 flex flex-col gap-3">
              <Link href="/diagnose" className="hover:text-[#059669] py-2 font-medium" onClick={() => setMenuOpen(false)}>
                진단하기
              </Link>
              <Link href="/guide" className="hover:text-[#059669] py-2 font-medium" onClick={() => setMenuOpen(false)}>
                불량 가이드
              </Link>
              <Link href="/pricing" className="hover:text-[#059669] py-2 font-medium" onClick={() => setMenuOpen(false)}>
                가격
              </Link>
              <Link
                href="/diagnose"
                className="bg-[#059669] text-white px-5 py-3 rounded-lg font-semibold text-center"
                onClick={() => setMenuOpen(false)}
              >
                무료 진단
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* API Key Modal */}
      {keyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setKeyModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-[#1E293B] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Anthropic API 키 설정
              </h2>
              <button onClick={() => setKeyModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>

            {/* Current status */}
            {keyStatus?.isSet && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-green-700">현재 키: <code className="font-mono">{keyStatus.maskedKey}</code></span>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                ANTHROPIC_API_KEY
              </label>
              <div className="relative">
                <input
                  type={apiKeyVisible ? 'text' : 'password'}
                  className="w-full border border-slate-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] pr-10 font-mono"
                  placeholder="sk-ant-api03-..."
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setSaveMsg(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {apiKeyVisible ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                키는 <code className="bg-slate-100 px-1 rounded">.env.local</code>에 저장되며 즉시 적용됩니다.
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[#059669] ml-1 underline">키 발급 →</a>
              </p>
            </div>

            {saveMsg && (
              <div className={`mb-4 text-sm px-3 py-2 rounded-lg ${saveMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {saveMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!apiKey.trim() || saving}
                className="flex-1 bg-[#059669] hover:bg-[#047857] disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-colors"
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
              <button
                onClick={() => setKeyModalOpen(false)}
                className="px-4 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

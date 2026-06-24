'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import Logo from './Logo';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  // Supabase 영문 메시지 → i18n 폴백 매핑 (없으면 원문 노출)
  const mapErr = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes('invalid login') || m.includes('invalid credentials')) return t('auth.invalid_login');
    if (m.includes('already registered') || m.includes('already exists') || m.includes('user already')) return t('auth.already_registered');
    if (m.includes('password') && (m.includes('least') || m.includes('weak') || m.includes('6 char'))) return t('auth.weak_password');
    if (m.includes('email') && m.includes('valid')) return t('auth.email_invalid');
    return msg || t('auth.fail');
  };

  const reset = () => { setError(''); setInfo(''); };
  const close = () => { reset(); onClose(); };
  const switchMode = () => { setMode(mode === 'login' ? 'signup' : 'login'); reset(); };

  const submit = async () => {
    reset();
    if (!email.trim() || !password) { setError(t('auth.email_invalid')); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: e } = await signInWithEmail(email.trim(), password);
        if (e) { setError(mapErr(e)); return; }
        close();
      } else {
        const { error: e, needsConfirm } = await signUpWithEmail(email.trim(), password);
        if (e) { setError(mapErr(e)); return; }
        if (needsConfirm) setInfo(t('auth.confirm_sent'));
        else close();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-ink/40 z-[60] flex items-center justify-center p-4 overflow-y-auto"
      onClick={close}
      role="presentation"
    >
      <div
        className="bg-surface rounded-[var(--radius-card-lg)] w-full max-w-md p-6 my-8 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? t('auth.login') : t('auth.signup')}
      >
        <button
          type="button"
          onClick={close}
          aria-label={t('auth.close')}
          className="absolute top-3 right-3 min-w-[var(--touch-min)] min-h-[var(--touch-min)] flex items-center justify-center text-faint hover:text-ink"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" /></svg>
        </button>

        {/* 로고 + 부제 */}
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <Logo size={44} showWord={false} />
          <h2 className="text-h3 font-bold text-ink">Mold Doctor</h2>
          <p className="text-label text-muted">{t('auth.subtitle')}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="block text-label font-medium text-muted mb-1">{t('auth.email')}</label>
            <input
              id="auth-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ui-input"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-label font-medium text-muted mb-1">{t('auth.password')}</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              className="ui-input"
            />
          </div>
        </div>

        {error && <p className="text-body text-danger">{error}</p>}
        {info && <p className="text-body text-muted bg-brand-tint rounded-xl p-3">{info}</p>}

        {/* 주요 CTA(현 모드 제출) + 모드 토글(회원가입·5크레딧 무료) */}
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="ui-cta w-full text-body disabled:opacity-50"
        >
          {busy ? t('auth.signing_in') : (mode === 'login' ? t('auth.login') : t('auth.signup'))}
        </button>

        <button
          type="button"
          onClick={switchMode}
          className="ui-cta-secondary ui-cta w-full text-body"
        >
          {mode === 'login' ? t('auth.signup_with_credit') : t('auth.toggle_to_login')}
        </button>

        <button
          type="button"
          onClick={() => { close(); router.push('/diagnose'); }}
          className="w-full text-center text-body text-brand hover:text-brand-ink min-h-[var(--touch-min)]"
        >
          {t('auth.browse_sample')}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-label text-faint">{t('auth.or')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* 구글 로그인 — 유지(삭제 금지) */}
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-2 bg-surface hover:bg-surface-sunken text-ink border border-border-strong rounded-[var(--radius-cta)] min-h-[var(--touch-cta)] text-body font-semibold transition-colors"
        >
          <GoogleIcon />
          {t('auth.signin')}
        </button>
      </div>
    </div>
  );
}

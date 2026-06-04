'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { locale, setLocale, t } = useLocale();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const toggleLocale = () => setLocale(locale === 'ko' ? 'en' : 'ko');
  const email = user?.email ?? '';
  const shortEmail = email.length > 18 ? email.slice(0, 16) + '…' : email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-canvas/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shadow-sm">
                <span className="text-on-brand text-xs font-black">M</span>
              </div>
              <span className="text-sm tracking-tight text-ink">Mold Doctor AI</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-7 text-sm text-faint">
              <Link href="/diagnose" className="hover:text-ink transition-colors">{t('nav.estimate')}</Link>
              <Link href="/guide" className="hover:text-ink transition-colors">{t('nav.guide')}</Link>
              <Link href="/pricing" className="hover:text-ink transition-colors">{t('nav.pricing')}</Link>
            </div>

            {/* Desktop right */}
            <div className="hidden md:flex items-center gap-2">
              {/* KO/EN toggle */}
              <button
                type="button"
                onClick={toggleLocale}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-bold text-faint hover:text-ink border border-border hover:border-border-strong rounded-lg px-2 transition-colors"
                aria-label="언어 전환 / Switch language"
              >
                {t('nav.locale_toggle')}
              </button>

              {/* Auth button */}
              {!loading && !user && (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="min-h-[44px] flex items-center gap-2 bg-white hover:bg-surface-sunken text-ink border border-border-strong shadow-sm px-4 rounded-full text-sm font-semibold transition-colors"
                >
                  <GoogleIcon />
                  {t('auth.signin')}
                </button>
              )}

              {!loading && user && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="min-h-[44px] flex items-center gap-2 border border-border hover:border-border-strong rounded-full px-3 transition-colors"
                  >
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-brand-tint flex items-center justify-center shrink-0">
                        <span className="text-brand-ink text-xs font-bold">{email[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <span className="text-muted text-xs">{shortEmail}</span>
                    <svg className="w-3 h-3 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-44 bg-surface-solid border border-border rounded-xl shadow-xl z-20 py-1">
                        <div className="px-4 py-2 text-xs text-faint border-b border-border">{email}</div>
                        <button
                          type="button"
                          onClick={() => { signOut(); setUserMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-muted hover:text-ink hover:bg-surface-sunken transition-colors"
                        >
                          {t('auth.signout')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {loading && (
                <div className="min-h-[44px] w-24 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-border border-t-brand rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Mobile right side */}
            <div className="md:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLocale}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-bold text-faint hover:text-ink border border-border rounded-lg px-2 transition-colors"
                aria-label="언어 전환 / Switch language"
              >
                {t('nav.locale_toggle')}
              </button>
              <button
                type="button"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-sunken text-muted"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="메뉴 열기"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  {menuOpen
                    ? <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/>
                    : <><path d="M4 6h16" strokeLinecap="round"/><path d="M4 12h16" strokeLinecap="round"/><path d="M4 18h16" strokeLinecap="round"/></>
                  }
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="md:hidden pb-4 flex flex-col gap-1 border-t border-border pt-3">
              {[
                { href: '/diagnose', label: t('nav.estimate') },
                { href: '/guide', label: t('nav.guide') },
                { href: '/pricing', label: t('nav.pricing') },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  className="text-faint hover:text-ink hover:bg-surface-sunken px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center"
                  onClick={() => setMenuOpen(false)}>
                  {label}
                </Link>
              ))}

              {/* Mobile auth */}
              {!loading && !user && (
                <button
                  type="button"
                  onClick={() => { signInWithGoogle(); setMenuOpen(false); }}
                  className="mt-2 flex items-center justify-center gap-2 bg-white text-ink border border-border-strong shadow-sm px-4 py-3 rounded-full font-bold text-sm min-h-[44px]"
                >
                  <GoogleIcon />
                  {t('auth.signin')}
                </button>
              )}

              {!loading && user && (
                <div className="mt-2 border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-tint flex items-center justify-center shrink-0">
                        <span className="text-brand-ink text-sm font-bold">{email[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <span className="text-faint text-xs truncate flex-1">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="w-full text-left text-sm text-faint hover:text-ink py-2 px-2 rounded-lg hover:bg-surface-sunken transition-colors min-h-[44px] flex items-center"
                  >
                    {t('auth.signout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-14" />
    </>
  );
}

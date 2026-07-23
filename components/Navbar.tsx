'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import Logo from './Logo';

// 앱 WebView에서 구글 프로필 이미지가 referrer 정책 위반으로 거부되는 경우를 대비한 폴백 아바타
function AvatarImage({ avatarUrl, email, imgClassName, fallbackClassName, textClassName }: {
  avatarUrl?: string;
  email: string;
  imgClassName: string;
  fallbackClassName: string;
  textClassName: string;
}) {
  const [imgError, setImgError] = useState(false);
  if (avatarUrl && !imgError) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={imgClassName}
      />
    );
  }
  return (
    <div className={fallbackClassName}>
      <span className={textClassName}>{email[0]?.toUpperCase()}</span>
    </div>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { locale, setLocale, t } = useLocale();
  const { user, loading, signOut, credits } = useAuth();

  const toggleLocale = () => setLocale(locale === 'ko' ? 'en' : 'ko');
  const email = user?.email ?? '';
  const shortEmail = email.length > 18 ? email.slice(0, 16) + '…' : email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-canvas pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2" aria-label="Mold Doctor">
              <Logo size={28} wordClassName="text-sm" />
              <span className="text-[length:var(--text-label)] font-bold uppercase tracking-wider text-brand-ink bg-brand-tint border border-[var(--brand-border)] rounded px-1.5 py-0.5 leading-none">
                {t('nav.beta')}
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-7 text-sm text-faint">
              <Link href="/diagnose" className="hover:text-ink transition-colors">{t('nav.estimate')}</Link>
              <Link href="/ledger" className="hover:text-ink transition-colors">{t('nav.ledger')}</Link>
              <Link href="/tryout" className="hover:text-ink transition-colors">{t('nav.tryout')}</Link>
              <Link href="/guide" className="hover:text-ink transition-colors">{t('nav.guide')}</Link>
              <Link href={locale === 'en' ? '/en/resins' : '/resins'} className="hover:text-ink transition-colors">{t('nav.resins')}</Link>
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

              {/* Credit badge — 잔액 + 충전 어포던스(탭 가능함이 보이게) */}
              {!loading && user && (
                <Link
                  href="/pricing"
                  className="min-h-[44px] flex items-center gap-1.5 px-3 rounded-full bg-brand-tint text-xs font-bold border border-[var(--brand-border)] hover:bg-brand-tint/70 transition-colors"
                  aria-label={`${t('nav.credits')} ${credits ?? 5} · ${t('nav.topup')}`}
                >
                  <span className="text-brand-ink">{t('nav.credits')}</span>
                  <span className="text-brand-ink tabular-nums">{credits ?? 5}</span>
                  <span className="text-brand-ink/40">·</span>
                  <span className="text-brand-ink font-extrabold">{t('nav.topup')}</span>
                </Link>
              )}

              {/* Auth button */}
              {!loading && !user && (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="min-h-[44px] flex items-center gap-2 bg-surface hover:bg-surface-sunken text-ink border border-border-strong shadow-sm px-4 rounded-full text-sm font-semibold transition-colors"
                >
                  {t('auth.login')}
                </button>
              )}

              {!loading && user && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="min-h-[44px] flex items-center gap-2 border border-border hover:border-border-strong rounded-full px-3 transition-colors"
                  >
                    <AvatarImage
                      avatarUrl={avatarUrl}
                      email={email}
                      imgClassName="w-6 h-6 rounded-full shrink-0"
                      fallbackClassName="w-6 h-6 rounded-full bg-brand-tint flex items-center justify-center shrink-0"
                      textClassName="text-brand-ink text-xs font-bold"
                    />
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
                        <Link
                          href="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-muted hover:text-ink hover:bg-surface-sunken transition-colors"
                        >
                          {t('nav.account')}
                        </Link>
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
            <div className="md:hidden flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleLocale}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-bold text-faint hover:text-ink border border-border rounded-lg px-2 transition-colors"
                aria-label="언어 전환 / Switch language"
              >
                {t('nav.locale_toggle')}
              </button>

              {/* 비로그인: brand 배경 로그인 버튼 / 로그인: 아바타 */}
              {!loading && !user && (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="min-h-[44px] flex items-center gap-1.5 bg-brand text-on-brand px-3.5 rounded-full text-sm font-bold transition-colors hover:bg-brand-ink shrink-0"
                >
                  {t('auth.login')}
                </button>
              )}

              {!loading && user && (
                <Link
                  href="/pricing"
                  className="min-h-[44px] flex items-center gap-1 px-2.5 rounded-full bg-brand-tint text-xs font-bold shrink-0"
                  aria-label={`${t('nav.credits')} ${credits ?? 5} · ${t('nav.topup')}`}
                >
                  <span className="text-brand-ink tabular-nums">{credits ?? 5}</span>
                  <span className="text-brand-ink/40">·</span>
                  <span className="text-brand-ink font-extrabold">{t('nav.topup')}</span>
                </Link>
              )}

              {!loading && user && (
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="계정 메뉴"
                >
                  <AvatarImage
                    avatarUrl={avatarUrl}
                    email={email}
                    imgClassName="w-8 h-8 rounded-full border-2 border-border"
                    fallbackClassName="w-8 h-8 rounded-full bg-brand-tint border-2 border-[var(--brand-border)] flex items-center justify-center"
                    textClassName="text-brand-ink text-sm font-bold"
                  />
                </button>
              )}

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
                { href: '/ledger', label: t('nav.ledger') },
                { href: '/tryout', label: t('nav.tryout') },
                { href: '/guide', label: t('nav.guide') },
                { href: locale === 'en' ? '/en/resins' : '/resins', label: t('nav.resins') },
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
                  onClick={() => { setAuthModalOpen(true); setMenuOpen(false); }}
                  className="mt-2 flex items-center justify-center gap-2 bg-surface text-ink border border-border-strong shadow-sm px-4 py-3 rounded-full font-bold text-sm min-h-[44px]"
                >
                  {t('auth.login')}
                </button>
              )}

              {!loading && user && (
                <div className="mt-2 border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AvatarImage
                      avatarUrl={avatarUrl}
                      email={email}
                      imgClassName="w-8 h-8 rounded-full shrink-0"
                      fallbackClassName="w-8 h-8 rounded-full bg-brand-tint flex items-center justify-center shrink-0"
                      textClassName="text-brand-ink text-sm font-bold"
                    />
                    <span className="text-faint text-xs truncate flex-1">{email}</span>
                  </div>
                  <div className="text-sm text-muted px-2">{t('nav.credits')}: {credits ?? 5}</div>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-left text-sm text-faint hover:text-ink py-2 px-2 rounded-lg hover:bg-surface-sunken transition-colors min-h-[44px] flex items-center"
                  >
                    {t('nav.account')}
                  </Link>
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

      {/* Spacer — 네비바 실제 높이(콘텐츠 h-14 + safe-area)만큼 문서 흐름에 공간 확보 */}
      <div className="h-[calc(3.5rem+env(safe-area-inset-top,0px))]" />

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}

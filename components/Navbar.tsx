'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { isNativeApp } from '@/lib/platform';
import { en as enMessages } from '@/messages/en';
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
  const pathname = usePathname();
  // 웹 로그아웃 랜딩 전용 네비 variant(homepage-revamp-web-v1) — 전역 교체가 아니라 이 조건(홈·웹·
  // 로그아웃)에서만 데스크톱 행을 프로스티드+앵커링크로 바꾼다. 모바일은 기존 햄버거 패턴 그대로
  // 재사용(mandate 명시) — 아래 모바일 블록은 무변경.
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  // loading 상태를 조건에 넣지 않는다 — HomeClient.tsx의 랜딩 분기(!user && !native)와 동일 공식으로
  // 맞춰야 로그인 세션 확인 중(auth loading) 구간에서 "새 히어로 + 기존 네비"처럼 뒤섞여 렌더되는
  // 순간을 피한다. user가 나중에 확정되면 두 컴포넌트가 함께 기존 화면으로 전환된다.
  const isLandingHero = pathname === '/' && !user && !native;
  // 영문 라우트(/en/*)는 locale 토글 상태와 무관하게 항상 영문 내비 라벨 — 실측 확인된 한국어 잔존 수정.
  // /ja/*(ja-notes-axis-v1)는 ja 전용 셸이 아직 없어 영문 셸로 폴백 — 한국어 SSR 잔존 방지가 목적이며
  // 3-way 로케일 토글 신설이 아니다(messages/*·LocaleContext 무변경).
  const isEnRoute = (pathname?.startsWith('/en') ?? false) || (pathname?.startsWith('/ja') ?? false);
  const nt = (key: string) => (isEnRoute ? (enMessages[key] ?? key) : t(key));

  const toggleLocale = () => setLocale(locale === 'ko' ? 'en' : 'ko');
  const email = user?.email ?? '';
  const shortEmail = email.length > 18 ? email.slice(0, 16) + '…' : email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 pt-[env(safe-area-inset-top,var(--safe-area-inset-top,0px))] ${
        isLandingHero
          ? 'border-b border-black/[.06] bg-[color:var(--surface)]/[.82] backdrop-blur-xl backdrop-saturate-[1.8]'
          : 'border-b border-border bg-canvas'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2" aria-label="Mold Doctor">
              <Logo size={28} wordClassName="text-sm" />
            </Link>

            {/* Desktop Nav — 랜딩 히어로(웹+로그아웃+홈)에서만 앵커링크 variant, 나머지는 기존 그대로 */}
            {isLandingHero ? (
              <div className="hidden md:flex items-center gap-6 text-sm text-muted" style={{ fontFamily: 'var(--font-landing)' }}>
                <Link href="/diagnose" className="hover:text-ink transition-colors">{t('landing.web_nav_analyze')}</Link>
                <a href="#how" className="hover:text-ink transition-colors">{t('landing.web_nav_how')}</a>
                <a href="#tools" className="hover:text-ink transition-colors">{t('landing.web_nav_tools')}</a>
                <a href="#notes" className="hover:text-ink transition-colors">{t('landing.web_nav_notes')}</a>
                <Link href="/pricing" className="hover:text-ink transition-colors">{t('landing.web_nav_credits')}</Link>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-7 text-sm text-faint">
                <Link href="/diagnose" className="hover:text-ink transition-colors">{nt('nav.estimate')}</Link>
                <Link href="/tools" className="hover:text-ink transition-colors">{nt('nav.tools')}</Link>
                <Link href="/pricing" className="hover:text-ink transition-colors">{nt('nav.pricing')}</Link>
              </div>
            )}

            {/* Desktop right */}
            {isLandingHero && (
              <div className="hidden md:flex items-center gap-4" style={{ fontFamily: 'var(--font-landing)' }}>
                <button
                  type="button"
                  onClick={toggleLocale}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 text-xs font-bold text-muted hover:text-ink bg-surface border border-border-strong hover:border-brand rounded-lg px-2.5 transition-colors"
                  aria-label="Switch language"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <ellipse cx="12" cy="12" rx="4" ry="9" />
                  </svg>
                  {t('nav.locale_toggle')}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="text-sm text-muted hover:text-ink transition-colors"
                >
                  {t('landing.web_nav_login')}
                </button>
                <Link
                  href="/diagnose"
                  className="inline-flex items-center justify-center text-sm font-normal rounded-full py-1.5 px-4 bg-brand text-on-brand hover:bg-brand-ink transition-colors active:scale-[.96]"
                >
                  {t('landing.web_nav_start')}
                </Link>
              </div>
            )}
            {!isLandingHero && (
            <div className="hidden md:flex items-center gap-2">
              {/* KO/EN toggle */}
              <button
                type="button"
                onClick={toggleLocale}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 text-xs font-bold text-muted hover:text-ink bg-surface border border-border-strong hover:border-brand rounded-lg px-2.5 transition-colors"
                aria-label={isEnRoute ? 'Switch language' : '언어 전환 / Switch language'}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <ellipse cx="12" cy="12" rx="4" ry="9" />
                </svg>
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
            )}

            {/* Mobile right side */}
            <div className="md:hidden flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleLocale}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 text-xs font-bold text-muted hover:text-ink bg-surface border border-border-strong hover:border-brand rounded-lg px-2.5 transition-colors"
                aria-label={isEnRoute ? 'Switch language' : '언어 전환 / Switch language'}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <ellipse cx="12" cy="12" rx="4" ry="9" />
                </svg>
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
                  aria-label={isEnRoute ? 'Account menu' : '계정 메뉴'}
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
                aria-label={isEnRoute ? 'Open menu' : '메뉴 열기'}
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
                { href: '/diagnose', label: nt('nav.estimate') },
                { href: '/tools', label: nt('nav.tools') },
                { href: '/pricing', label: nt('nav.pricing') },
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
      <div className="h-[calc(3.5rem+env(safe-area-inset-top,var(--safe-area-inset-top,0px)))]" />

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}

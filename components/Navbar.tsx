'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { locale, setLocale, t } = useLocale();

  const toggleLocale = () => setLocale(locale === 'ko' ? 'en' : 'ko');

  return (
    <>
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#07090F]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold">
              <div className="w-7 h-7 rounded-lg bg-[#00E887] flex items-center justify-center shadow-[0_0_12px_rgba(0,232,135,0.4)]">
                <span className="text-black text-xs font-black">M</span>
              </div>
              <span className="text-sm tracking-tight text-white">Mold Doctor AI</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-7 text-sm text-white/40">
              <Link href="/diagnose" className="hover:text-white transition-colors">{t('nav.estimate')}</Link>
              <Link href="/guide" className="hover:text-white transition-colors">{t('nav.guide')}</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">{t('nav.pricing')}</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {/* KO/EN toggle */}
              <button
                type="button"
                onClick={toggleLocale}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-bold text-white/50 hover:text-white border border-white/15 hover:border-white/40 rounded-lg px-2 transition-colors"
                aria-label="언어 전환 / Switch language"
              >
                {t('nav.locale_toggle')}
              </button>
              <Link href="/diagnose"
                className="text-sm bg-white text-black px-4 py-1.5 rounded-full font-semibold hover:bg-white/90 transition-colors">
                {t('nav.free')}
              </Link>
            </div>

            {/* Mobile right side */}
            <div className="md:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLocale}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-bold text-white/50 hover:text-white border border-white/15 rounded-lg px-2 transition-colors"
                aria-label="언어 전환 / Switch language"
              >
                {t('nav.locale_toggle')}
              </button>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-white/5 text-white/60"
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
            <div className="md:hidden pb-4 flex flex-col gap-1 border-t border-white/5 pt-3">
              {[
                { href: '/diagnose', label: t('nav.estimate') },
                { href: '/guide', label: t('nav.guide') },
                { href: '/pricing', label: t('nav.pricing') },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  className="text-white/50 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  onClick={() => setMenuOpen(false)}>
                  {label}
                </Link>
              ))}
              <Link href="/diagnose"
                className="mt-2 bg-white text-black px-4 py-2.5 rounded-full font-bold text-sm text-center"
                onClick={() => setMenuOpen(false)}>
                {t('nav.free')}
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-14" />
    </>
  );
}

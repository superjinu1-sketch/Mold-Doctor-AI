'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

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
              <Link href="/diagnose" className="hover:text-white transition-colors">추정하기</Link>
              <Link href="/guide" className="hover:text-white transition-colors">불량 가이드</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">가격</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/diagnose"
                className="text-sm bg-white text-black px-4 py-1.5 rounded-full font-semibold hover:bg-white/90 transition-colors">
                무료 추정
              </Link>
            </div>

            {/* Mobile */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-white/5 text-white/60"
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

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="md:hidden pb-4 flex flex-col gap-1 border-t border-white/5 pt-3">
              {[
                { href: '/diagnose', label: '추정하기' },
                { href: '/guide', label: '불량 가이드' },
                { href: '/pricing', label: '가격' },
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
                무료 추정
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

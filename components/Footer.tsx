import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#1E293B] text-white py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#059669"/>
            <path d="M8 16C8 11.582 11.582 8 16 8C18.5 8 20.75 9.1 22.25 10.85L24 9.1C22.05 7.2 19.15 6 16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26C19.15 26 22.05 24.8 24 22.9L22.25 21.15C20.75 22.9 18.5 24 16 24C11.582 24 8 20.418 8 16Z" fill="white"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
          </svg>
          <span>Mold Doctor AI</span>
        </Link>
        <p className="text-slate-400 text-sm">contact@molddoctor.ai</p>
        <p className="text-slate-500 text-sm">© 2026 Mold Doctor AI. All rights reserved.</p>
      </div>
    </footer>
  );
}

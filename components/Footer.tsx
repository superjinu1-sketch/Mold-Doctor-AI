import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#07090F] py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <div className="w-6 h-6 rounded-md bg-[#00E887] flex items-center justify-center shadow-[0_0_10px_rgba(0,232,135,0.3)]">
            <span className="text-black text-xs font-black">M</span>
          </div>
          <span className="text-sm text-white/60">Mold Doctor AI</span>
        </Link>
        <p className="text-white/20 text-xs">contact@molddoctor.ai</p>
        <p className="text-white/20 text-xs">© 2026 Mold Doctor AI. All rights reserved.</p>
      </div>
    </footer>
  );
}

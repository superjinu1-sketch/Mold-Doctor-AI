// 로고 마크 — brand 라운드 사각 + 흰 돋보기 글리프 + 워드마크. 인라인 SVG(외부 에셋 0), 토큰만.
export default function Logo({ size = 28, showWord = true, wordClassName = '' }: { size?: number; showWord?: boolean; wordClassName?: string }) {
  const glyph = Math.round(size * 0.58);
  return (
    <span className="flex items-center gap-2">
      <span
        className="flex items-center justify-center shrink-0 bg-brand text-on-brand"
        style={{ width: size, height: size, borderRadius: 'var(--radius-card)' }}
        aria-hidden="true"
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
          <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="2.4" />
          <path d="M15 15l5.2 5.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      {showWord && <span className={`font-bold tracking-tight text-ink ${wordClassName}`}>Mold Doctor</span>}
    </span>
  );
}

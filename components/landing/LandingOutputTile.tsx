'use client';

// 다크 타일(output) — 규율4 예외(homepage-revamp-web-v1, 랜딩 한정). --tile-dark/--on-dark 등
// globals.css 신규 토큰만 사용, raw hex 없음.
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';

export default function LandingOutputTile() {
  const { t } = useLocale();

  const rows = [
    { label: t('landing.web_render_row1_name'), from: '90', to: '→ 110 MPa' },
    { label: t('landing.web_render_row2_name'), from: '40', to: '→ 55 MPa' },
    { label: t('landing.web_render_row3_name'), from: '240', to: '→ 250°C' },
  ];

  return (
    <section className="py-24 max-md:py-[60px] text-[color:var(--on-dark)]" style={{ background: 'var(--tile-dark)', fontFamily: 'var(--font-landing)' }}>
      <div className="max-w-[1120px] mx-auto px-[22px]">
        <div className="grid md:grid-cols-2 gap-11 items-center text-left">
          <div>
            <p className="text-[19px] font-semibold mb-1.5 tracking-[-.02em]" style={{ color: 'var(--accent-on-dark)' }}>{t('landing.web_output_eyebrow')}</p>
            <h2 className="font-semibold tracking-[-.028em]" style={{ fontSize: 'clamp(2rem,4vw,2.625rem)', lineHeight: 1.09 }}>{t('landing.web_output_h2')}</h2>
            <p className="font-normal mt-3.5" style={{ fontSize: 'clamp(1.25rem,2.2vw,1.5625rem)', lineHeight: 1.3, letterSpacing: '-.014em', color: 'var(--on-dark-muted)' }}>
              {t('landing.web_output_tagline')}
            </p>
            <Link
              href="/diagnose"
              className="inline-block mt-5 hover:underline"
              style={{ color: 'var(--accent-on-dark)' }}
            >
              {t('landing.web_output_link')} ›
            </Link>
          </div>
          <div className="rounded-2xl p-1" style={{ background: 'var(--tile-dark-2)' }}>
            {rows.map((r, i) => (
              <div
                key={r.label}
                className="flex justify-between px-[18px] py-3 text-[14px]"
                style={{
                  color: 'var(--on-dark-muted)',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,.08)' : undefined,
                }}
              >
                <span>{r.label}</span>
                <span>
                  <b className="text-white font-semibold tabular-nums">{r.from}</b>{' '}
                  <span className="tabular-nums" style={{ color: 'var(--accent-on-dark)' }}>{r.to}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

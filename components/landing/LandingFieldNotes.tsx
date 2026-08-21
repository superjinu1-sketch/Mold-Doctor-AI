'use client';

// Field Notes 섹션 — 하드코딩 금지(mandate 명시). app/page.tsx가 넘기는 실제 notes prop(NOTES 데이터)에서
// 상위 3건만 렌더. 링크는 /en/notes·가이드 인덱스로 크롤러 내부링크 확보(internal-links-to-notes 요건 유지).
// 레퍼런스의 카드별 "kicker"(Splay/Gate blush 등 짧은 분류 라벨)는 목업 placeholder 전용 필드라 실제
// Note 데이터엔 대응 값이 없다 — 제목·설명·날짜만 렌더(실데이터 우선, 없는 필드를 지어내지 않음).
// 썸네일(v2 후속수정 1) — 기존 홈(HomeClient.tsx)과 동일하게 thumbSvg를 dangerouslySetInnerHTML로
// 주입. 카드 본문(제목·설명·날짜)은 진우 확정대로 영어 유지 — 번역하지 않는다.
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import type { HomeNoteCard } from '@/lib/notes';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

export default function LandingFieldNotes({ notes }: { notes: HomeNoteCard[] }) {
  const { t, locale } = useLocale();
  const guideHref = locale === 'en' ? '/en/guide' : '/guide';
  const top3 = notes.slice(0, 3);

  return (
    <section id="notes" className="bg-canvas py-24 max-md:py-[60px] text-center" style={{ fontFamily: 'var(--font-landing)' }}>
      <div className="max-w-[1120px] mx-auto px-[22px]">
        <p className="text-[19px] font-semibold text-brand mb-1.5 tracking-[-.02em]">{t('landing.web_notes_eyebrow')}</p>
        <h2 className="font-semibold tracking-[-.028em] text-ink" style={{ fontSize: 'clamp(2rem,4vw,2.625rem)', lineHeight: 1.09 }}>{t('landing.web_notes_h2')}</h2>
        <p className="font-normal text-muted mx-auto mt-3.5" style={{ fontSize: 'clamp(1.25rem,2.2vw,1.5625rem)', lineHeight: 1.3, letterSpacing: '-.014em', maxWidth: '34ch' }}>
          {t('landing.web_notes_tagline')}
        </p>

        <div className="grid md:grid-cols-3 gap-[22px] text-left mt-12 max-md:mt-8">
          {top3.map(n => (
            <Link key={n.slug} href={`/en/notes/${n.slug}`} className="block bg-surface border border-border rounded-[18px] overflow-hidden hover:border-[var(--brand-border)] transition-colors">
              {n.thumbSvg && (
                <div
                  aria-hidden="true"
                  className="border-b border-border [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: n.thumbSvg }}
                />
              )}
              <div className="p-6">
                <h3 className="text-[17px] font-semibold leading-snug text-ink mb-1.5">{n.title}</h3>
                <p className="text-[14px] text-muted leading-snug mb-2.5 line-clamp-3">{n.description}</p>
                <div className="text-[12px] text-faint">{formatDate(n.publishedAt)}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex gap-6 justify-start flex-wrap mt-8 text-[16px]">
          <Link href="/en/notes" className="text-brand hover:underline">{t('landing.web_notes_see_all')} ›</Link>
          <Link href={guideHref} className="text-brand hover:underline">{t('landing.web_notes_guide_link')} ›</Link>
        </div>
      </div>
    </section>
  );
}

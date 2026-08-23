import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteUrl';
import { NOTES, getNoteBySlug, getSeriesForNote, type NoteDiagramId } from '@/lib/notes';
import { getNoteKoBySlug, KO_FALLBACK_NOTICE } from '@/lib/notesKo';
import { readNoteDiagramSvg } from '@/lib/notesDiagramSvg';
import { getNoteJaBySlug } from '@/lib/notesJa';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

// NOTES(EN) 전 슬러그 생성 — KO 미번역 슬러그도 정적 페이지가 있어야 토글이 404 없이 왕복한다
// (미번역은 아래서 EN 폴백 + KO_FALLBACK_NOTICE 배너로 렌더).
export function generateStaticParams() {
  return NOTES.map(n => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const enNote = getNoteBySlug(slug);
  if (!enNote) return {};
  const note = getNoteKoBySlug(slug) ?? enNote;
  const url = `${SITE_URL}/notes/${slug}`;
  // ja 번역이 있는 노트만 hreflang ja를 내보낸다 — 없는 slug로 내보내면 404 hreflang(en 상세와 동일 규칙).
  const hasJa = Boolean(getNoteJaBySlug(slug));
  return {
    title: note.title,
    description: note.description,
    alternates: {
      canonical: url,
      languages: {
        ko: url,
        en: `${SITE_URL}/en/notes/${slug}`,
        ...(hasJa ? { ja: `${SITE_URL}/ja/notes/${slug}` } : {}),
      },
    },
    openGraph: { title: note.title, description: note.description, type: 'article', locale: 'ko_KR', url },
    twitter: { card: 'summary', title: note.title, description: note.description },
  };
}

// SVG 도식을 <img src>가 아니라 인라인으로 주입 — SVG 내부 var(--ok) 등 CSS 커스텀 프로퍼티가
// 페이지 :root를 상속받으려면 같은 DOM 트리에 있어야 한다(별도 문서 컨텍스트로 로드되면 색이 사라짐).
// 도식은 영문판 SVG를 그대로 재사용한다(EN/JA 상세와 동일 절충).
function Diagram({ id }: { id: NoteDiagramId }) {
  const svg = readNoteDiagramSvg(id);
  return (
    // eslint-disable-next-line react/no-danger
    <div className="w-full my-6 [&>svg]:w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

function NoteImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="w-full my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="w-full h-auto rounded-[var(--radius-card)]" />
      {caption && <figcaption className="text-[length:var(--text-label)] text-faint mt-2">{caption}</figcaption>}
    </figure>
  );
}

export default async function NoteDetailPageKo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const enNote = getNoteBySlug(slug);
  if (!enNote) notFound();
  const koNote = getNoteKoBySlug(slug);
  const note = koNote ?? enNote;

  const seriesInfo = getSeriesForNote(slug);
  // 시리즈 멤버 제목 — KO 있으면 KO, 없으면 EN(개별 노트 폴백과 동일 원칙).
  const seriesNoteTitle = (s: string) => (getNoteKoBySlug(s) ?? getNoteBySlug(s))?.title;

  const url = `${SITE_URL}/notes/${slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: note.title,
    description: note.description,
    datePublished: note.publishedAt,
    inLanguage: 'ko',
    author: {
      '@type': 'Person',
      name: 'Jinwoo Park',
      url: `${SITE_URL}/en/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'JINSIM.LABS',
      url: SITE_URL,
    },
    mainEntityOfPage: url,
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-[880px] mx-auto px-4 sm:px-6 py-10">
        <Link href="/notes" className="max-w-[65ch] text-faint hover:text-ink text-sm mb-3 min-h-[44px] inline-flex items-center gap-1">
          ← 노트
        </Link>
        <h1 className="max-w-[65ch] text-[length:var(--text-h1)] font-bold text-ink mb-6">{note.title}</h1>

        {/* 미번역 폴백 배너 — KO 원고 없으면 EN 본문 위에 상시 노출 */}
        {!koNote && (
          <div className="max-w-[65ch] ui-card bg-surface-sunken p-4 mb-6">
            <p className="text-muted text-label leading-relaxed">{KO_FALLBACK_NOTICE}</p>
          </div>
        )}

        {seriesInfo && (
          <nav aria-label="시리즈" className="max-w-[65ch] bg-brand-tint border border-[var(--brand-border)] rounded-[var(--radius-card)] px-4 py-3 mb-8">
            <p className="text-[length:var(--text-label)] font-bold text-brand-ink mb-2">
              시리즈 · {seriesInfo.series.name} — {seriesInfo.index + 1} / {seriesInfo.series.slugs.length}
            </p>
            <ol className="space-y-1">
              {seriesInfo.series.slugs.map((s, i) => {
                const title = seriesNoteTitle(s);
                if (!title) return null;
                return (
                  <li key={s} className="text-sm leading-snug">
                    {i === seriesInfo.index ? (
                      <span className="font-bold text-ink">{i + 1}. {title}</span>
                    ) : (
                      <Link href={`/notes/${s}`} className="text-brand-ink hover:underline underline-offset-2">{i + 1}. {title}</Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div>
          {note.body.map((block, i) => {
            if (block.type === 'h2') {
              return (
                <h2 key={i} className="max-w-[65ch] text-[length:var(--text-h3)] font-bold text-ink mt-8 mb-3">
                  {block.text}
                </h2>
              );
            }
            if (block.type === 'diagram') {
              return <Diagram key={i} id={block.id} />;
            }
            if (block.type === 'image') {
              return <NoteImage key={i} src={block.src} alt={block.alt} caption={block.caption} />;
            }
            return (
              <p key={i} className="max-w-[65ch] text-body text-muted leading-relaxed mb-4">
                {block.text}
              </p>
            );
          })}
        </div>

        {seriesInfo && (() => {
          const len = seriesInfo.series.slugs.length;
          const prevSlug = seriesInfo.index > 0 ? seriesInfo.series.slugs[seriesInfo.index - 1] : undefined;
          const nextSlug = seriesInfo.index < len - 1 ? seriesInfo.series.slugs[seriesInfo.index + 1] : undefined;
          const prevTitle = prevSlug ? seriesNoteTitle(prevSlug) : undefined;
          const nextTitle = nextSlug ? seriesNoteTitle(nextSlug) : undefined;
          if (!prevTitle && !nextTitle) return null;
          return (
            <nav aria-label="시리즈 이동" className="max-w-[65ch] mt-10 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 sm:justify-between">
              {prevSlug && prevTitle ? (
                <Link href={`/notes/${prevSlug}`} className="group flex-1 border border-border hover:border-brand rounded-[var(--radius-card)] px-4 py-3 transition-colors">
                  <span className="block text-[length:var(--text-label)] text-faint mb-1">← 이전 · {seriesInfo.index} / {len}</span>
                  <span className="block text-sm font-medium text-ink group-hover:text-brand-ink">{prevTitle}</span>
                </Link>
              ) : <span className="flex-1" />}
              {nextSlug && nextTitle ? (
                <Link href={`/notes/${nextSlug}`} className="group flex-1 border border-border hover:border-brand rounded-[var(--radius-card)] px-4 py-3 transition-colors sm:text-right">
                  <span className="block text-[length:var(--text-label)] text-faint mb-1">다음 · {seriesInfo.index + 2} / {len} →</span>
                  <span className="block text-sm font-medium text-ink group-hover:text-brand-ink">{nextTitle}</span>
                </Link>
              ) : <span className="flex-1" />}
            </nav>
          );
        })()}

        {/* 저자 바이라인 — KO 홈 링크(ko /about 없음) */}
        <p className="max-w-[65ch] text-faint text-sm text-center mt-10">
          <Link href="/" className="hover:text-muted transition-colors">JINSIMLABS.COM</Link>
        </p>
      </article>
    </>
  );
}

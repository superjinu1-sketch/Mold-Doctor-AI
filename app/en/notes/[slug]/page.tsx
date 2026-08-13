import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteUrl';
import { NOTES, getNoteBySlug, getSeriesForNote, type NoteDiagramId } from '@/lib/notes';
import { readNoteDiagramSvg } from '@/lib/notesDiagramSvg';
import { getNoteJaBySlug } from '@/lib/notesJa';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

export function generateStaticParams() {
  return NOTES.map(n => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const note = getNoteBySlug(slug);
  if (!note) return {};
  const url = `${SITE_URL}/en/notes/${slug}`;
  // ja 번역이 있는 노트만 hreflang ja를 내보낸다 — 없는 slug로 내보내면 404 hreflang (en-notes-06-nmt-v1).
  const hasJa = Boolean(getNoteJaBySlug(slug));
  return {
    title: note.title,
    description: note.description,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        ...(hasJa ? { ja: `${SITE_URL}/ja/notes/${slug}` } : {}),
      },
    },
    openGraph: { title: note.title, description: note.description, type: 'article', locale: 'en_US', url },
    // 루트 레이아웃의 twitter 메타는 한국어 고정값 — 영문 페이지에서는 페이지별 영문 title/description으로 덮어쓴다.
    twitter: { card: 'summary', title: note.title, description: note.description },
  };
}

// SVG 도식을 <img src>가 아니라 인라인으로 주입 — SVG 내부 var(--ok) 등 CSS 커스텀 프로퍼티가
// 페이지 :root를 상속받으려면 같은 DOM 트리에 있어야 한다(별도 문서 컨텍스트로 로드되면 색이 사라짐).
// 파일(public/notes/*.svg) 자체는 확정본 그대로 두고, 375px 대응 크기 처리만 바깥 wrapper에서 담당한다.
// 도식은 article(max-w-[880px]) 전체 폭을 그대로 채운다 — 별도 max-width/mx-auto를 걸면
// 텍스트 블록(max-w-[65ch], 좌측 정렬)과 중심이 달라져 좌측 기준선이 어긋난다(실측 확인됨).
function Diagram({ id }: { id: NoteDiagramId }) {
  const svg = readNoteDiagramSvg(id);
  return (
    // eslint-disable-next-line react/no-danger
    <div className="w-full my-6 [&>svg]:w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

export default async function NoteDetailPageEn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = getNoteBySlug(slug);
  if (!note) notFound();

  const seriesInfo = getSeriesForNote(slug);

  const url = `${SITE_URL}/en/notes/${slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: note.title,
    description: note.description,
    datePublished: note.publishedAt,
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
      {/* article 자체를 max-w-[880px] mx-auto로 페이지에서 한 번만 중앙 정렬한다. 텍스트 블록은
          그 안에서 max-w-[65ch]로 폭만 좁히고(mx-auto 없음 — 좌측 정렬 유지) 도식은 article 전체
          폭(w-full)을 채운다. 텍스트·도식을 각자 mx-auto로 따로 중앙 정렬하면 서로 다른 폭
          기준으로 중심이 갈라져 좌측 기준선이 어긋난다(실측 확인됨 — h2 x≈340 vs p x≈482). */}
      <article className="max-w-[880px] mx-auto px-4 sm:px-6 py-10">
        <Link href="/en/notes" className="max-w-[65ch] text-faint hover:text-ink text-sm mb-3 min-h-[44px] inline-flex items-center gap-1">
          ← Notes
        </Link>
        <h1 className="max-w-[65ch] text-[length:var(--text-h1)] font-bold text-ink mb-6">{note.title}</h1>

        {seriesInfo && (
          <nav aria-label="Series" className="max-w-[65ch] bg-brand-tint border border-[var(--brand-border)] rounded-[var(--radius-card)] px-4 py-3 mb-8">
            <p className="text-[length:var(--text-label)] font-bold text-brand-ink mb-2">
              Series · {seriesInfo.series.name} — Part {seriesInfo.index + 1} of {seriesInfo.series.slugs.length}
            </p>
            <ol className="space-y-1">
              {seriesInfo.series.slugs.map((s, i) => {
                const n = getNoteBySlug(s);
                if (!n) return null;
                return (
                  <li key={s} className="text-sm leading-snug">
                    {i === seriesInfo.index ? (
                      <span className="font-bold text-ink">{i + 1}. {n.title}</span>
                    ) : (
                      <Link href={`/en/notes/${s}`} className="text-brand-ink hover:underline underline-offset-2">{i + 1}. {n.title}</Link>
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
            return (
              <p key={i} className="max-w-[65ch] text-body text-muted leading-relaxed mb-4">
                {block.text}
              </p>
            );
          })}
        </div>

        {seriesInfo && (() => {
          const len = seriesInfo.series.slugs.length;
          const prev = seriesInfo.index > 0 ? getNoteBySlug(seriesInfo.series.slugs[seriesInfo.index - 1]) : undefined;
          const next = seriesInfo.index < len - 1 ? getNoteBySlug(seriesInfo.series.slugs[seriesInfo.index + 1]) : undefined;
          if (!prev && !next) return null;
          return (
            <nav aria-label="Series pagination" className="max-w-[65ch] mt-10 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 sm:justify-between">
              {prev ? (
                <Link href={`/en/notes/${prev.slug}`} className="group flex-1 border border-border hover:border-brand rounded-[var(--radius-card)] px-4 py-3 transition-colors">
                  <span className="block text-[length:var(--text-label)] text-faint mb-1">← Previous · Part {seriesInfo.index} of {len}</span>
                  <span className="block text-sm font-medium text-ink group-hover:text-brand-ink">{prev.title}</span>
                </Link>
              ) : <span className="flex-1" />}
              {next ? (
                <Link href={`/en/notes/${next.slug}`} className="group flex-1 border border-border hover:border-brand rounded-[var(--radius-card)] px-4 py-3 transition-colors sm:text-right">
                  <span className="block text-[length:var(--text-label)] text-faint mb-1">Next · Part {seriesInfo.index + 2} of {len} →</span>
                  <span className="block text-sm font-medium text-ink group-hover:text-brand-ink">{next.title}</span>
                </Link>
              ) : <span className="flex-1" />}
            </nav>
          );
        })()}

        {/* 저자 바이라인 — /en/guide·/en/resins와 동일 스타일(author-page-en-v1) */}
        <p className="max-w-[65ch] text-faint text-sm text-center mt-10">
          <Link href="/en/about" className="hover:text-muted transition-colors">Written by Jinwoo Park</Link>
        </p>
      </article>
    </>
  );
}

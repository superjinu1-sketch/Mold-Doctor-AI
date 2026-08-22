import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteUrl';
import type { NoteDiagramId } from '@/lib/notes';
import { NOTES_JA, getNoteJaBySlug, JA_DISCLAIMER_TITLE, JA_DISCLAIMER_BODY } from '@/lib/notesJa';
import { readNoteDiagramSvg } from '@/lib/notesDiagramSvg';

// Capacitor 정적 export(output:'export') 호환 — app/sitemap.ts 선례와 동일 원칙 적용.
export const dynamic = 'force-static';

export function generateStaticParams() {
  return NOTES_JA.map(n => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const note = getNoteJaBySlug(slug);
  if (!note) return {};
  const url = `${SITE_URL}/ja/notes/${slug}`;
  return {
    title: note.title,
    description: note.description,
    alternates: {
      canonical: url,
      languages: {
        en: `${SITE_URL}/en/notes/${slug}`,
        ja: url,
      },
    },
    openGraph: { title: note.title, description: note.description, type: 'article', locale: 'ja_JP', url },
    // 루트 레이아웃의 twitter 메타는 한국어 고정값 — ja 페이지에서는 페이지별 ja title/description으로 덮어쓴다.
    twitter: { card: 'summary', title: note.title, description: note.description },
  };
}

// SVG 도식을 <img src>가 아니라 인라인으로 주입 — SVG 내부 var(--ok) 등 CSS 커스텀 프로퍼티가
// 페이지 :root를 상속받으려면 같은 DOM 트리에 있어야 한다(별도 문서 컨텍스트로 로드되면 색이 사라짐).
// 도식은 영문판 SVG를 그대로 재사용한다(진우 확정 절충 — ja판 SVG는 별도 단계, ja-notes-axis-v1).
function Diagram({ id }: { id: NoteDiagramId }) {
  const svg = readNoteDiagramSvg(id);
  return (
    // eslint-disable-next-line react/no-danger
    <div className="w-full my-6 [&>svg]:w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

// 래스터 히어로 사진(image 블록, note-gf-warpage-insert-web-v1) — en판 렌더러와 동일 규칙.
// NOTES_JA엔 아직 image 블록을 쓰는 노트가 없지만, 두 렌더러를 동일 블록 타입 집합으로 맞춰둔다.
function NoteImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="w-full my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="w-full h-auto rounded-[var(--radius-card)]" />
      {caption && <figcaption className="text-[length:var(--text-label)] text-faint mt-2">{caption}</figcaption>}
    </figure>
  );
}

export default async function NoteDetailPageJa({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = getNoteJaBySlug(slug);
  if (!note) notFound();

  const url = `${SITE_URL}/ja/notes/${slug}`;
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
      <article className="max-w-[880px] mx-auto px-4 sm:px-6 py-10">
        <Link href="/ja/notes" className="max-w-[65ch] text-faint hover:text-ink text-sm mb-3 min-h-[44px] inline-flex items-center gap-1">
          ← ノート一覧
        </Link>
        <h1 className="max-w-[65ch] text-[length:var(--text-h1)] font-bold text-ink mb-4">{note.title}</h1>

        {/* 디스클레이머 — 오역 한계 안내, 본문 시작 전 상시 노출(ja-notes-axis-v1) */}
        <div className="max-w-[65ch] ui-card bg-surface-sunken p-4 mb-6">
          <p className="font-bold text-label text-ink mb-1">{JA_DISCLAIMER_TITLE}</p>
          <p className="text-muted text-label leading-relaxed">{JA_DISCLAIMER_BODY}</p>
          <Link href={`/en/notes/${slug}`} className="inline-block text-brand hover:text-brand-ink text-label font-medium mt-2 min-h-[44px] items-center">
            English version →
          </Link>
        </div>

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

        {/* 저자 바이라인 — /en/notes와 동일 스타일 */}
        <p className="max-w-[65ch] text-faint text-sm text-center mt-10">
          <Link href="/en/about" className="hover:text-muted transition-colors">Written by Jinwoo Park</Link>
        </p>
      </article>
    </>
  );
}

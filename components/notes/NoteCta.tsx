// 현장 노트 본문 뒤 전환 CTA(growth-notes-article-cta-v1). 노트 상세는 Search Console 노출 상위
// 페이지인데 추정·앱으로 가는 길이 없었다. 노트 본문(진우 확정본)은 건드리지 않고 본문 "뒤"에만 붙인다.
// 노트 페이지는 locale이 라우트로 고정된 서버 컴포넌트라 useLocale 대신 locale prop으로 문구를 고른다.
// 앱 배지는 StoreBadges가 네이티브에서 스스로 null을 반환한다(앱 안에서 스토어 배지 미노출).
import Link from 'next/link';
import StoreBadges from '@/components/StoreBadges';

const COPY = {
  ko: {
    body: '현장에서 비슷한 불량을 보고 계신가요? 사진과 세팅값을 올리면 가능성 높은 원인과 조정 방향을 추정해 드립니다.',
    cta: '내 불량 원인 추정하기',
  },
  en: {
    body: 'Seeing a similar defect on the floor? Upload a photo and your settings to get the likely causes and what to adjust.',
    cta: 'Estimate my defect cause',
  },
} as const;

export default function NoteCta({ locale }: { locale: 'ko' | 'en' | 'ja' }) {
  const lang = locale === 'ko' ? 'ko' : 'en';
  const c = COPY[lang];
  return (
    <aside aria-label={c.cta} className="max-w-[65ch] mt-10 mb-8 grid gap-4">
      <div className="ui-card ui-card-lg p-5 grid gap-3">
        <p className="text-body text-ink">{c.body}</p>
        <Link href="/diagnose" className="ui-cta text-body">{c.cta}</Link>
      </div>
      <StoreBadges variant="article" locale={lang} />
    </aside>
  );
}

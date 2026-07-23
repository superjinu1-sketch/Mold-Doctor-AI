import type { Metadata } from 'next';
import ResinListView from '@/components/resins/ResinListView';
import { getAllResinListItems } from '@/lib/resinPageData';

export const metadata: Metadata = {
  title: '사출성형 수지 라이브러리 — 건조·사출온도·수축률 요약 | Mold Doctor',
  description: 'PA66·PC·POM·PPS 등 사출성형 수지 43여 종의 건조 조건, 사출(용융) 온도, 금형 온도, 수축률, 흔한 불량을 한눈에 정리했습니다.',
  alternates: {
    canonical: 'https://mold-doctor-ai.vercel.app/resins',
    languages: {
      ko: 'https://mold-doctor-ai.vercel.app/resins',
      en: 'https://mold-doctor-ai.vercel.app/en/resins',
      'x-default': 'https://mold-doctor-ai.vercel.app/en/resins',
    },
  },
  openGraph: {
    title: '사출성형 수지 라이브러리 | Mold Doctor',
    description: '수지별 건조 조건·사출 온도·금형 온도·수축률·흔한 불량 현장 요약.',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default function ResinsListPage() {
  const items = getAllResinListItems('ko');
  return (
    <div className="bg-canvas min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-border)] bg-brand-tint text-brand-ink text-[length:var(--text-label)] font-medium px-3.5 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-brand rounded-full" />
            수지 {items.length}종 현장 요약
          </div>
          <h1 className="text-[length:var(--text-h1)] font-bold text-ink mb-2">수지 라이브러리</h1>
          <p className="text-muted text-body">건조 조건·사출(용융) 온도·금형 온도·수축률·흔한 불량을 수지별로 정리했습니다.</p>
        </div>
        <ResinListView items={items} locale="ko" basePath="/resins" />
      </div>
    </div>
  );
}

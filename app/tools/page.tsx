import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteUrl';
import ToolsView from '@/components/tools/ToolsView';

// metadata는 서버 컴포넌트 전용이라 LocaleContext(t())를 쓸 수 없다. /en/tools 라우트를
// 만들지 않기로 했으므로(이 mandate 범위 밖 — canonical·hreflang 정합 문제) 이 URL은
// 애초에 en 크롤러 진입점이 아니다 — 한국어 고정 유지가 맞는 선택이다. 본문(ToolsView)만
// LocaleContext로 실시간 전환된다.
export const metadata: Metadata = {
  title: '무료 도구 — 작업표준 저장소·시사출 체크리스트·수지 라이브러리·불량 가이드 | Mold Doctor',
  description: '사출 현장을 위한 무료 도구 모음. 설비별 작업표준 저장, 시사출 샷 로그, 52종 수지 요약, 불량 유형별 가이드까지 전부 무료, 크레딧 소모 없음.',
  alternates: {
    canonical: `${SITE_URL}/tools`,
  },
  openGraph: {
    title: '무료 도구 모음 | Mold Doctor',
    description: '작업표준 저장소·시사출 체크리스트·수지 라이브러리·불량 가이드 — 전부 무료.',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default function ToolsHubPage() {
  return <ToolsView />;
}

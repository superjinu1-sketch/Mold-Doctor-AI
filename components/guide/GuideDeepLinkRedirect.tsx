'use client';
// 기존 /guide?d=<id> 딥링크(수지 상세 "흔한 불량과 첫 점검" 등에서 들어오던 구 링크) 보존용.
// /guide/[slug] 신설로 허브가 정적 목록이 되면서 더 이상 자동 펼침이 없으므로, 쿼리가 있으면
// 새 개별 라우트로 클라이언트 리다이렉트한다. useSearchParams 사용 — 호출부에서 Suspense 필수.
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { defects } from '@/lib/defectGuide';

export default function GuideDeepLinkRedirect({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const d = searchParams.get('d');
    if (d && defects.some(x => x.id === d)) {
      router.replace(`${basePath}/${d}`);
    }
  }, [searchParams, router, basePath]);

  return null;
}

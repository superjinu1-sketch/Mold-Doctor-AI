'use client';

// 히스토리는 마이페이지로 통합됨(v1, 서버 동기화). 기존 링크 호환용 redirect.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/account');
  }, [router]);
  return <div className="p-8 text-center text-muted">…</div>;
}

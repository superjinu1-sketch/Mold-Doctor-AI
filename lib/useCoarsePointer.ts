'use client';

// 터치 기기 판정(UX audit C4) — 휴대폰에서 "드래그"·"Ctrl+V" 같은 데스크톱 전용 카피를 감추는 용도.
// 정적 export 프리렌더 시점엔 window가 없으므로 false(데스크톱)로 시작해 마운트 후 보정한다.
// 서버 렌더와 클라이언트 첫 렌더의 초기값이 동일해 하이드레이션 경고가 나지 않는다.
import { useState, useEffect } from 'react';

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    setCoarse(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  return coarse;
}

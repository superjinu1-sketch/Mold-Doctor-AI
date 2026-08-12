// 인앱 리뷰 요청(in-app-review-v1) — "해결됨(Resolved)" 클릭 직후, 만족이 확인된 유일한 순간에만 호출.
// 플러그인: @capacitor-community/in-app-review v8.0.0 (@capacitor/core ^8.4.0과 호환, peerDep >=8.0.0).
// 웹에서는 플러그인 자체가 unimplemented를 throw하도록 구현돼 있어(web.ts) 아래 isNativeApp() 가드가
// 이중으로 no-op을 보장한다 — 웹에서는 아무 동작도 하지 않는다(§1).
// 사전 커스텀 프롬프트("별점 주시겠어요?") 없음 — OS 네이티브 API를 직접 호출만 한다(§2-3, Apple 가이드라인).
import { InAppReview } from '@capacitor-community/in-app-review';
import { isNativeApp } from './platform';

const LS_KEY = 'molddoctor_last_review_request';
const GUARD_DAYS = 30;
const GUARD_MS = GUARD_DAYS * 24 * 60 * 60 * 1000;

export async function requestInAppReviewIfEligible(): Promise<void> {
  if (!isNativeApp()) return; // 웹 no-op(§1) — 리뷰 유도는 범위 밖.
  try {
    const last = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    if (last && Date.now() - Number(last) < GUARD_MS) return; // 로컬 가드: 마지막 요청 후 30일 이내 재호출 금지(§2-2)
    localStorage.setItem(LS_KEY, String(Date.now()));
    await InAppReview.requestReview();
  } catch {
    // 실패는 조용히 무시(§2-1) — 리뷰 요청 실패가 UX를 깨면 안 된다.
  }
}

'use client';

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNativeApp } from './platform';

// 웹이거나 네이티브 런타임 부재 시 완전 no-op(웹 무영향) — lib/purchases.ts 가드 패턴 동일.
export async function hapticImpactLight() {
  if (!isNativeApp()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* 촉각 피드백 실패는 무시 — 부가 기능 */ }
}

export async function hapticSuccess() {
  if (!isNativeApp()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch { /* 촉각 피드백 실패는 무시 — 부가 기능 */ }
}

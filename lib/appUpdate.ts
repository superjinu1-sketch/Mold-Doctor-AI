// Play In-App Update(Android 전용) — components/UpdateGate.tsx의 업데이트 버튼에서 사용.
// 릴리스 직후 몇 시간은 Play가 새 버전을 아직 인지하지 못해 UPDATE_NOT_AVAILABLE일 수 있다.
// 이 경우/실패 시 조용히 false를 반환 — 호출측이 store_url 오픈으로 폴백한다(mandate §5).
import { isNativeApp } from './platform';

export async function performAndroidImmediateUpdate(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { AppUpdate, AppUpdateAvailability } = await import('@capawesome/capacitor-app-update');
    const info = await AppUpdate.getAppUpdateInfo();
    if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return false;
    if (info.immediateUpdateAllowed === false) return false;
    await AppUpdate.performImmediateUpdate();
    return true;
  } catch {
    return false;
  }
}

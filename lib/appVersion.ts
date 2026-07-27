// 강제 업데이트 게이트용 네이티브 build/version 조회. 웹 빌드에서는 절대 호출부가 실행되지
// 않게 isNativeApp() 단락을 최상단에 둔다(아래 getAppVersionInfo 1행) — 웹은 항상 null.
import { Capacitor } from '@capacitor/core';
import { isNativeApp } from './platform';

export type AppVersionInfo = { build: number; version: string; platform: 'android' | 'ios' } | null;

// 앱 실행당 1회만 조회 — 모듈 스코프 캐싱(재조회로 네이티브 브릿지 왕복 반복 방지).
let cached: AppVersionInfo | undefined;

export async function getAppVersionInfo(): Promise<AppVersionInfo> {
  if (!isNativeApp()) return null; // ← 웹 빌드 단락 지점. 아래 어떤 코드도 실행되지 않는다.
  if (cached !== undefined) return cached;
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    const platform = Capacitor.getPlatform();
    if (platform !== 'android' && platform !== 'ios') { cached = null; return cached; }
    const build = Number(info.build);
    cached = Number.isFinite(build) ? { build, version: info.version, platform } : null;
  } catch {
    cached = null; // 네이티브 브릿지 실패 시 게이트 조용히 비활성(안전 기본값 — 사용자 차단보다 나음)
  }
  return cached;
}

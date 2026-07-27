// Capacitor 앱은 origin이 https://localhost 라 상대경로 API가 깨진다.
// 웹(Vercel): env 미설정 → '' → 상대경로 그대로 (동작 변화 0)
// Capacitor 빌드: NEXT_PUBLIC_API_BASE_URL='https://<프로젝트>.vercel.app' → 절대경로
import { getAppVersionInfo } from './appVersion';
import { emitUpgradeRequired, type UpgradeRequiredBody } from './updateGateBus';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// 강제 업데이트 게이트용 헤더(lib/appVersionGate.ts가 서버에서 읽음). 웹 빌드는
// getAppVersionInfo()가 null을 반환하므로 빈 객체 — 헤더 자체가 실리지 않는다.
async function versionHeaders(): Promise<Record<string, string>> {
  const info = await getAppVersionInfo();
  if (!info) return {};
  return {
    'X-MD-Platform': info.platform,
    'X-MD-Build': String(info.build),
    'X-MD-Version': info.version,
  };
}

// 내부 API 호출 전용 fetch 래퍼 — 버전 헤더 자동 첨부 + 서버가 426(UPGRADE_REQUIRED)을
// 반환하면 updateGateBus로 발행해 UpdateGate 오버레이를 즉시 띄운다(mandate §4-4 이중 안전망).
// 기존 authHeaders() 등 호출부 자체 헤더는 init.headers로 그대로 넘기면 병합된다.
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = { ...(init?.headers as Record<string, string> | undefined), ...(await versionHeaders()) };
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 426) {
    res.clone().json().then((body: UpgradeRequiredBody) => emitUpgradeRequired(body)).catch(() => {});
  }
  return res;
}

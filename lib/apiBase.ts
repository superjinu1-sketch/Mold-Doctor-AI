// Capacitor 앱은 origin이 https://localhost 라 상대경로 API가 깨진다.
// 웹(Vercel): env 미설정 → '' → 상대경로 그대로 (동작 변화 0)
// Capacitor 빌드: NEXT_PUBLIC_API_BASE_URL='https://<프로젝트>.vercel.app' → 절대경로
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

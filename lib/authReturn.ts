// 로그인 후 복귀 경로 — OAuth(웹 리다이렉트 / 앱 딥링크)가 끝나면 원래 있던 화면으로 돌려보낸다.
// 예전엔 콜백이 무조건 '/'로 보내, /diagnose에서 폼을 채우고 로그인한 사용자가 홈에 떨어졌다.
// sessionStorage는 같은 탭(웹)·같은 WebView(앱)에서 OAuth 왕복 후에도 유지된다.
// 이메일 로그인처럼 페이지를 떠나지 않는 경우 값이 남을 수 있어 10분 뒤 자동 만료한다.
const KEY = 'molddoctor_auth_return';
const TTL_MS = 10 * 60 * 1000;

function isSafePath(p: unknown): p is string {
  // 같은 사이트 내부 경로만 허용(외부 주소·프로토콜 상대 경로로의 오픈 리다이렉트 방지).
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.includes('://');
}

export function setAuthReturn(path: string): void {
  if (!isSafePath(path)) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch { /* 저장 불가(시크릿 등) — 기본 '/' 복귀로 동작 */ }
}

export function consumeAuthReturn(fallback = '/'): string {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return fallback;
    const { path, at } = JSON.parse(raw);
    if (!isSafePath(path) || typeof at !== 'number' || Date.now() - at > TTL_MS) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

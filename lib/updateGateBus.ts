// lib/apiBase.ts(apiFetch)가 서버 426(UPGRADE_REQUIRED)을 받으면 여기로 발행 →
// components/UpdateGate.tsx가 구독해 동일 오버레이를 띄운다(이중 안전망, mandate §4-4).
// 순수 인메모리 pub-sub. 웹에서는 apiFetch가 애초에 426을 받을 일이 없어(§0) 아무도 emit하지 않는다.
export interface UpgradeRequiredBody {
  minBuild: number;
  storeUrl: string;
  message: string | null;
}

type Listener = (body: UpgradeRequiredBody) => void;

const listeners = new Set<Listener>();

export function onUpgradeRequired(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function emitUpgradeRequired(body: UpgradeRequiredBody): void {
  listeners.forEach(cb => cb(body));
}

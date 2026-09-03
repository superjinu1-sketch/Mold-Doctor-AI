// 진단 폼 draft 사진 임시보관(call-interruption-data-loss-fix-v1 Part B) — IndexedDB 단일
// object store. blob 원본 저장(base64 재인코딩 금지) — localStorage 용량 한계도 자연히 피한다.
// 시크릿 모드 등 IndexedDB 자체가 막힌 환경에서는 모든 함수가 조용히 실패해 텍스트 draft만 동작한다
// (호출부는 결과를 기다리지 않거나 빈 배열/무동작으로 처리하면 됨 — throw하지 않음).

const DB_NAME = 'molddoctor-draft-photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

export interface DraftPhotoRecord {
  id: string;               // app/diagnose/page.tsx의 ImageFile.id와 동일 값
  kind: 'image' | 'drawing';
  order: number;             // 배열 순서 복원용
  mediaType: string;
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 현재 이미지·도면 스냅샷으로 통째로 교체 — 삭제된 사진이 안 남게 매번 clear 후 다시 쓴다. */
export async function replaceDraftPhotos(records: DraftPhotoRecord[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const r of records) store.put(r);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* 조용히 무시 — 텍스트 draft만 동작 */ }
}

/** 저장된 사진 전체 로드(order 오름차순). 실패·미존재 시 빈 배열. */
export async function loadDraftPhotos(): Promise<DraftPhotoRecord[]> {
  try {
    const db = await openDB();
    const records = await new Promise<DraftPhotoRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as DraftPhotoRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return records.sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

/** draft 정리(제출 성공·TTL 만료) 시 전부 삭제. */
export async function clearDraftPhotos(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* 무시 */ }
}

// lib/clientDownscale.ts — 브라우저 canvas 기반 이미지 축소 (sharp 없음)
// 서버의 lib/downscale.ts 와 별개 — 클라이언트(localStorage 저장용 썸네일) 전용.

export async function downscaleImageClient(
  base64: string,
  maxPx = 400,
  quality = 0.75,
  srcMime = 'image/jpeg',
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width || 1, img.height || 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.split(',')[1] ?? base64);
    };
    img.onerror = () => resolve(null);  // 디코드 실패(HEIC 등) → 오라벨 전송 대신 null(호출부가 거부·안내)
    img.src = `data:${srcMime};base64,${base64}`;
  });
}

// localStorage 저장 시 QuotaExceededError 핸들링
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && (
      e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      return false; // caller should retry without photos
    }
    return false;
  }
}

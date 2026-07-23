// 현장 부착용 PDF 공통 브랜딩 — components/ledger/PrintableMachinePage.tsx에서 최초 도입,
// components/tryout/PrintableTryoutReport.tsx도 동일 규격 재사용을 위해 공유 모듈로 분리.
import QRCode from 'qrcode';

export const BRAND_URL = 'https://mold-doctor-ai.vercel.app';

let qrDataUrlCache: string | null = null;
export async function getBrandQrDataUrl(): Promise<string> {
  if (qrDataUrlCache) return qrDataUrlCache;
  qrDataUrlCache = await QRCode.toDataURL(BRAND_URL, { width: 96, margin: 0, color: { dark: '#14171C', light: '#FFFFFF' } });
  return qrDataUrlCache;
}

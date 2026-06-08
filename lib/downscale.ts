import sharp from 'sharp';

const PDF_TYPE = 'application/pdf';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function downscaleBase64(
  base64: string,
  mediaType: string,
  maxPx = 1024,
): Promise<{ data: string; mediaType: string }> {
  if (mediaType === PDF_TYPE) return { data: base64, mediaType };

  const buf = Buffer.from(base64, 'base64');
  if (buf.length > MAX_IMAGE_BYTES) {
    throw new Error(`이미지가 너무 큽니다. 최대 8 MB (${(buf.length / 1024 / 1024).toFixed(1)} MB 수신)`);
  }
  const out = await sharp(buf)
    .rotate()
    .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  return { data: out.toString('base64'), mediaType: 'image/jpeg' };
}

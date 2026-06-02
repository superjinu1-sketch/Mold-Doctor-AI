import sharp from 'sharp';

const PDF_TYPE = 'application/pdf';

export async function downscaleBase64(
  base64: string,
  mediaType: string,
  maxPx = 1024,
): Promise<{ data: string; mediaType: string }> {
  if (mediaType === PDF_TYPE) return { data: base64, mediaType };

  const buf = Buffer.from(base64, 'base64');
  const out = await sharp(buf)
    .rotate()
    .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  return { data: out.toString('base64'), mediaType: 'image/jpeg' };
}

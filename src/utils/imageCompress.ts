/**
 * 文件说明：客户端发帖配图压缩，控制体积与长边，默认上限 1MB。
 */

const MAX_BYTES = 1 * 1024 * 1024;
const MAX_LONG_SIDE = 1920;
const MIN_LONG_SIDE = 480;

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

async function bitmapToJpegUnderLimit(source: ImageBitmap, drawW: number, drawH: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持图片处理');

  let w = drawW;
  let h = drawH;

  for (let round = 0; round < 14; round++) {
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);

    let q = 0.9;
    while (q >= 0.42) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', q);
      });
      if (blob && blob.size <= MAX_BYTES) return blob;
      q -= 0.055;
    }

    if (Math.min(w, h) <= MIN_LONG_SIDE) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.42);
      });
      if (blob) return blob;
      throw new Error('单张图片体积仍超过 1MB，请换较小的图或裁剪后再试');
    }

    w = Math.round(w * 0.82);
    h = Math.round(h * 0.82);
  }

  throw new Error('单张图片体积仍超过 1MB，请换较小的图或裁剪后再试');
}

/**
 * 将图片压到不超过 {@link MAX_BYTES}（必要时缩放长边、转 JPEG）。
 * GIF 原样返回；读图失败时若原文件未超限则原样返回。
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }
  if (file.type === 'image/gif') {
    if (file.size > MAX_BYTES) {
      throw new Error('GIF 超过 1MB，无法上传（GIF 不做压缩）');
    }
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size <= MAX_BYTES) return file;
    throw new Error('无法读取该图片，请使用 JPG / PNG');
  }

  try {
    const iw = bitmap.width;
    const ih = bitmap.height;
    const maxDim = Math.max(iw, ih);
    const scale = Math.min(1, MAX_LONG_SIDE / maxDim);
    const w = Math.round(iw * scale);
    const h = Math.round(ih * scale);

    if (file.size <= MAX_BYTES && scale >= 1) {
      return file;
    }

    const blob = await bitmapToJpegUnderLimit(bitmap, w, h);
    const name = `${stripExtension(file.name)}.jpg`;
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

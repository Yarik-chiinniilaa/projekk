export const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function prepare(file) {
  if (!TYPES.includes(file.type)) throw new Error(`«${file.name}»: потрібен JPG, PNG або WebP`);
  let out = file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale < 1 || file.size > MAX_BYTES) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      if (blob && blob.size < file.size) out = new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    }
    bmp.close?.();
  } catch {
  }
  if (out.size > MAX_BYTES) throw new Error(`«${file.name}»: фото завелике (максимум 5 МБ)`);
  return out;
}

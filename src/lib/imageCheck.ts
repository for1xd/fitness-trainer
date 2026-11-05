/** Перевірка вибраного фото перед обробкою (без I/O). */

export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const IMAGE_MAX_SIDE_PX = 12_000;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export interface PickedImage {
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number;
  height?: number;
}

/** null — фото можна обробляти; інакше причина відмови. */
export function checkPickedImage(img: PickedImage): 'badType' | 'tooLarge' | null {
  // Браузер не завжди повідомляє тип — тоді вирішує перекодування (не-зображення не відкриється)
  if (img.mimeType && !ALLOWED.has(img.mimeType.toLowerCase())) return 'badType';
  if (img.fileSize && img.fileSize > IMAGE_MAX_BYTES) return 'tooLarge';
  if ((img.width ?? 0) > IMAGE_MAX_SIDE_PX || (img.height ?? 0) > IMAGE_MAX_SIDE_PX)
    return 'tooLarge';
  return null;
}

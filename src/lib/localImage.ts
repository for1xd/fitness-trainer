import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface StoredImage {
  /** Адреса для показу на цьому пристрої */
  uri: string;
  /** JPEG у base64 — для завантаження в Storage */
  base64: string;
}

/**
 * Веб: зберігаємо зменшене фото як data URI (blob-адреси з вибору файлу не живуть після перезавантаження).
 */
export async function storeImageLocally(
  uri: string,
  _name: string,
  width: number,
  height: number,
): Promise<StoredImage> {
  const MAX = 900;
  const scale = Math.min(1, MAX / Math.max(width || MAX, height || MAX));
  const ctx = ImageManipulator.manipulate(uri);
  if (scale < 1)
    ctx.resize(
      width >= height
        ? { width: Math.round(width * scale) }
        : { height: Math.round(height * scale) },
    );
  const image = await ctx.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!result.base64) throw new Error('image_encode_failed');
  return { uri: `data:image/jpeg;base64,${result.base64}`, base64: result.base64 };
}

import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { StoredImage } from './localImage';

/** Телефон: зменшене фото копіюється в документи застосунку (кеш система може очистити). */
export async function storeImageLocally(
  uri: string,
  name: string,
  width: number,
  height: number,
): Promise<StoredImage> {
  const MAX = 1280;
  const scale = Math.min(1, MAX / Math.max(width || MAX, height || MAX));
  const ctx = ImageManipulator.manipulate(uri);
  if (scale < 1)
    ctx.resize(
      width >= height
        ? { width: Math.round(width * scale) }
        : { height: Math.round(height * scale) },
    );
  const image = await ctx.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  if (!result.base64) throw new Error('image_encode_failed');
  const dest = new File(Paths.document, `${name}.jpg`);
  new File(result.uri).copy(dest);
  return { uri: dest.uri, base64: result.base64 };
}

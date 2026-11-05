import { checkPickedImage, IMAGE_MAX_BYTES } from './imageCheck';

describe('checkPickedImage', () => {
  it('приймає звичайне фото', () => {
    expect(
      checkPickedImage({ mimeType: 'image/jpeg', fileSize: 3_000_000, width: 4000, height: 3000 }),
    ).toBeNull();
    expect(checkPickedImage({ mimeType: 'image/HEIC' })).toBeNull();
    expect(checkPickedImage({})).toBeNull();
  });
  it('відхиляє інші типи файлів', () => {
    expect(checkPickedImage({ mimeType: 'image/svg+xml' })).toBe('badType');
    expect(checkPickedImage({ mimeType: 'text/html' })).toBe('badType');
  });
  it('відхиляє завеликі файли й розміри', () => {
    expect(checkPickedImage({ fileSize: IMAGE_MAX_BYTES + 1 })).toBe('tooLarge');
    expect(checkPickedImage({ width: 20000, height: 100 })).toBe('tooLarge');
  });
});

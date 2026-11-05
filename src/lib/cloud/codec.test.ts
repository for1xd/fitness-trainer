import { blobRefs, extractBlobs, hashString, restoreBlobs, splitChunks } from './codec';

describe('cloud codec', () => {
  const photo = 'data:image/jpeg;base64,' + 'A'.repeat(500);
  const state = JSON.stringify({
    state: { photos: [{ id: 'p1', localUri: photo }], note: 'Привіт' },
  });

  it('виносить фото і повертає їх назад без втрат', () => {
    const { json, blobs } = extractBlobs(state);
    expect(json).not.toContain('data:image');
    expect(blobs.size).toBe(1);
    expect(blobRefs(json)).toEqual(new Set(blobs.keys()));
    expect(restoreBlobs(json, blobs)).toBe(state);
  });

  it('хеш стабільний і різний для різних фото', () => {
    expect(hashString(photo)).toBe(hashString(photo));
    expect(hashString(photo)).not.toBe(hashString(photo + 'B'));
  });

  it('невідоме посилання стає порожнім рядком', () => {
    expect(restoreBlobs('{"a":"blobref:zz1"}', new Map())).toBe('{"a":""}');
  });

  it('ділить довгий текст на частини і склеює назад', () => {
    const text = 'ї'.repeat(250);
    const parts = splitChunks(text, 100);
    expect(parts).toHaveLength(3);
    expect(parts.join('')).toBe(text);
    expect(splitChunks('abc', 100)).toEqual(['abc']);
  });
});

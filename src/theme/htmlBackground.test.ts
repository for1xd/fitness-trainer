import { readFileSync } from 'fs';
import { join } from 'path';

import { palettes } from './tokens';

/** Фон сторінки до завантаження JS має збігатися з фоном теми — інакше видно «спалах». */
describe('фон HTML = фон теми', () => {
  const root = join(__dirname, '..', '..');
  it.each(['public/index.html', 'scripts/build-artifact.mjs'])('%s', (file) => {
    const text = readFileSync(join(root, file), 'utf8').toLowerCase();
    expect(text).toContain(palettes.light.bg.toLowerCase());
    expect(text).toContain(palettes.dark.bg.toLowerCase());
  });
});

// Після `expo export -p web`: попереднє завантаження шрифтів першого екрана, щоб вони
// вантажились паралельно зі скриптами, а не після їх виконання.
// node scripts/web-postexport.mjs [dist]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const FIRST_SCREEN = ['Unbounded_600SemiBold', 'Manrope_500Medium', 'Manrope_600SemiBold'];

export function fontPreloads(distDir, prefix = '/') {
  const dir = join(distDir, 'assets/assets/fonts');
  return readdirSync(dir)
    .filter((f) => FIRST_SCREEN.some((n) => f.startsWith(`${n}.`)))
    .map((f) => `<link rel="preload" href="${prefix}assets/assets/fonts/${f}" as="font" type="font/ttf" crossorigin>`)
    .join('');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const index = join(dist, 'index.html');
  const html = readFileSync(index, 'utf8').replace(/<link rel="preload"[^>]*as="font"[^>]*>/g, '');
  writeFileSync(index, html.replace('</head>', `${fontPreloads(dist)}</head>`));
  console.log('font preloads added to', index);
}

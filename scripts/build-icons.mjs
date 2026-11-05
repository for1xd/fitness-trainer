// Набір іконок лише з потрібних символів Material Community Icons → src/ui/icons/glyphs.json.
// Повна карта символів — ~180 КБ у бандлі, нам потрібно кілька десятків.
// І шрифт лише з цими символами → assets/fonts/MaterialCommunityIcons.ttf (pyftsubset з fonttools).
// Запуск: npm run icons:build. Ім'я іконки, якої немає в наборі, TypeScript позначить помилкою.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const all = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?)$/.test(f) && !f.endsWith('.test.ts')) files.push(p);
  }
})(join(ROOT, 'src'));

const used = new Set();
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (!/icon|Icon/.test(text)) continue;
  for (const m of text.matchAll(/['"]([a-z][a-z0-9-]*)['"]/g)) if (m[1] in all) used.add(m[1]);
}

// Зайві збіги (напр. 'null' — теж назва іконки) лише трохи збільшують набір, але нічого не ламають
const glyphs = Object.fromEntries([...used].sort().map((k) => [k, all[k]]));
writeFileSync(join(ROOT, 'src/ui/icons/glyphs.json'), JSON.stringify(glyphs, null, 2) + '\n');
console.log(`icons: ${Object.keys(glyphs).length} of ${Object.keys(all).length}`);

// Шрифт іконок: 1,3 МБ → кілька КБ
const unicodes = Object.values(glyphs)
  .map((c) => `U+${c.toString(16).toUpperCase()}`)
  .join(',');
execFileSync('pyftsubset', [
  require.resolve('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
  `--unicodes=${unicodes}`,
  `--output-file=${join(ROOT, 'assets/fonts/MaterialCommunityIcons.ttf')}`,
]);
console.log('icon font:', statSync(join(ROOT, 'assets/fonts/MaterialCommunityIcons.ttf')).size, 'bytes');

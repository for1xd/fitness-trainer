// Готує веб-збірку (dist/) до публікації як артефакт Claude: сторінка лежить не в корені сайту,
// тож абсолютні шляхи "/_expo/…" і "/assets/…" стають відносними до адреси сторінки під час запуску.
// Запуск: npm run build:artifact  →  artifact/
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontPreloads } from './web-postexport.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'artifact');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const BASE = 'window.__APP_BASE__+';
const files = [];
for (const file of walk(dist)) {
  // Шляхи на «_» сервіс артефактів резервує — тека _expo/ публікується як app/
  const rel = relative(dist, file).replace(/^_expo\//, 'app/');
  if (rel === 'index.html' || rel === 'metadata.json' || rel.endsWith('.css')) continue;
  const target = join(out, rel);
  mkdirSync(dirname(target), { recursive: true });
  if (rel.endsWith('.js')) {
    const js = readFileSync(file, 'utf8')
      .replaceAll('"/_expo/static/', `${BASE}"app/static/`)
      .replaceAll('"/assets/', `${BASE}"assets/`);
    writeFileSync(target, js);
  } else {
    cpSync(file, target);
  }
  files.push(rel);
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="\/([^"]+)"/g)].map((m) =>
  m[1].replace(/^_expo\//, 'app/'),
);
const css = readdirSync(join(dist, '_expo/static/css'))
  .map((f) => readFileSync(join(dist, '_expo/static/css', f), 'utf8'))
  .join('\n');

const page = `<title>Фітнес-тренер</title>
${fontPreloads(dist, '')}
<style>
:root { --bg: #E7EAE6; --ink: #14171A; --accent: #6F4FE0; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #101315; --ink: #EEF1EC; --accent: #9A7BF2; color-scheme: dark; } }
:root[data-theme="dark"] { --bg: #101315; --ink: #EEF1EC; --accent: #9A7BF2; color-scheme: dark; }
html, body { height: 100%; }
body { overflow: hidden; background: var(--bg); }
#root { display: flex; height: 100%; flex: 1; }
.boot { flex: 1; display: flex; align-items: center; justify-content: center; }
</style>
<style>${css}</style>
<div id="root"><div class="boot" role="img" aria-label="Фітнес-тренер"><svg width="64" height="64" viewBox="0 0 512 512" fill="none" stroke-linecap="round" aria-hidden="true"><path d="M256 120 A136 136 0 1 1 120 256" stroke="var(--accent)" stroke-width="60"/><path d="M256 78 V434" stroke="var(--ink)" stroke-width="60"/></svg></div></div>
<script>
(function () {
  window.__APP_BASE__ = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
  // Маршрутизатор застосунку працює з кореня сайту
  try { if (location.pathname !== '/') history.replaceState(null, '', '/'); } catch (e) {}
  ${JSON.stringify(scripts)}.forEach(function (src) {
    var s = document.createElement('script');
    s.src = window.__APP_BASE__ + src;
    s.async = false;
    document.body.appendChild(s);
  });
})();
</script>
`;
writeFileSync(join(out, 'index.html'), page);
writeFileSync(join(out, 'files.json'), JSON.stringify(files, null, 1));
console.log(`artifact/: index.html + ${files.length} файлів`);

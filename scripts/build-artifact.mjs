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
<style>
:root { --bg: #E9ECE8; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #191C1E; color-scheme: dark; } }
:root[data-theme="dark"] { --bg: #191C1E; color-scheme: dark; }
html, body { height: 100%; }
body { overflow: hidden; background: var(--bg); }
#root { display: flex; height: 100%; flex: 1; }
</style>
<style>${css}</style>
<div id="root"></div>
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

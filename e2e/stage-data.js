// Етап «дані»: збереження в особистому розділі бази артефакта (імітація window.claude).
// Перевіряє: вхід не потрібен; дані переживають перезавантаження і відкриваються на «іншому пристрої»
// того самого користувача; інший користувач бачить чистий застосунок; експорт → скидання → імпорт.
// node e2e/stage-data.js   (потрібна збірка dist/)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, '..', 'dist');
const OUT = path.join(__dirname, 'shots-data'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8106);
const BASE = 'http://localhost:8106';

/** Спільна «база артефакта» на боці Node: path → document */
const DB = new Map();
let exported = null;
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };

async function device(browser, uid, width = 390) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: 'dark', locale: 'uk-UA' });
  await ctx.exposeFunction('__db', (op, p, data) => {
    // Правило платформи: чужий розділ data/users/<id>/ не читається і не пишеться
    const m = /^data\/users\/([^/]+)\//.exec(p);
    if (m && m[1] !== uid) return op === 'get' ? null : 'invalid_argument';
    if (op === 'get') return DB.has(p) ? DB.get(p) : null;
    if (op === 'set') DB.set(p, JSON.parse(data));
    if (op === 'delete') DB.delete(p);
    return 'ok';
  });
  await ctx.exposeFunction('__saved', (text) => { exported = text; });
  await ctx.addInitScript((uid) => {
    const ref = (p) => ({
      get: async () => { const d = await window.__db('get', p); return { exists: d !== null, data: () => d ?? undefined }; },
      set: async (data) => { const r = await window.__db('set', p, JSON.stringify(data)); if (r !== 'ok') throw { code: r }; },
      delete: async () => { await window.__db('delete', p); },
    });
    const caps = {
      db: { doc: ref },
      user: { id: async () => uid, can: async () => true },
      downloads: { save: async ({ data }) => { await window.__saved(typeof data === 'string' ? data : await data.text()); return { status: 'saved' }; } },
    };
    window.claude = { use: async (n) => caps[n] ?? null };
  }, uid);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fail(`${uid} pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') console.log('  console:', m.text().slice(0, 160)); });
  return { ctx, page };
}

const vis = (page, t) => page.locator(`text=${JSON.stringify(t)} >> visible=true`).first();
const userDocs = (uid) => [...DB.keys()].filter((k) => k.startsWith(`data/users/${uid}/`));

async function onboard(page) {
  await vis(page, 'Чоловік').click(); await page.getByLabel('Вік').fill('30'); await vis(page, 'Далі').click();
  await page.getByLabel('Зріст').fill('180'); await page.getByLabel('Вага').fill('80'); await vis(page, 'Далі').click();
  await vis(page, 'Помірна активність').click(); await vis(page, 'Далі').click(); await vis(page, 'Тримати форму').click();
  await vis(page, 'Розрахувати норму').click(); await vis(page, 'Зберегти й почати').click();
  await vis(page, 'Зважування').waitFor();
}

(async () => {
  const browser = await chromium.launch();

  // 1. Перший запуск: одразу онбординг, без входу і без «сервер не підключено»
  const a = await device(browser, 'u1');
  await a.page.goto(BASE + '/');
  await vis(a.page, 'Чоловік').waitFor();
  await a.page.screenshot({ path: `${OUT}/1-first-run.png` });
  if (await a.page.locator('text=/Сервер|акаунта/').count()) fail('server / sign-in text still visible');
  await onboard(a.page);
  await vis(a.page, '+250 мл').click();
  await vis(a.page, 'Збережено').waitFor({ timeout: 5000 });
  await a.page.screenshot({ path: `${OUT}/2-saved.png` });
  await a.page.waitForTimeout(800);
  console.log('docs u1:', userDocs('u1').length);
  if (!userDocs('u1').some((k) => k.endsWith('/s_profile'))) fail('profile not in cloud');

  // 2. Перезавантаження з порожнім кешем: дані з бази
  await a.page.evaluate(() => localStorage.clear());
  await a.page.reload();
  await vis(a.page, 'Зважування').waitFor();
  if (!(await a.page.locator('text="0,25" >> visible=true').count())) fail('water lost after reload');
  console.log('  reload with empty cache: ok');

  // 3. Інший пристрій того самого користувача
  const b = await device(browser, 'u1', 1280);
  await b.page.goto(BASE + '/');
  await vis(b.page, 'Зважування').waitFor();
  if (!(await b.page.locator('text="0,25" >> visible=true').count())) fail('water missing on other device');
  await b.page.screenshot({ path: `${OUT}/3-other-device.png` });
  console.log('  other device same user: ok');

  // 4. Інший користувач — чистий застосунок
  const c = await device(browser, 'u2');
  await c.page.goto(BASE + '/');
  await vis(c.page, 'Чоловік').waitFor();
  console.log('  other user sees onboarding: ok');
  // Порожні стани нового користувача
  await onboard(c.page);
  for (const tab of ['nutrition', 'workouts', 'progress']) {
    await c.page.goto(BASE + '/' + tab);
    await c.page.waitForTimeout(900);
    await c.page.screenshot({ path: `${OUT}/empty-${tab}.png` });
  }

  // 5. Експорт → скидання → імпорт
  await a.page.goto(BASE + '/profile');
  await vis(a.page, 'Експортувати дані (JSON)').click();
  await vis(a.page, 'Файл експорту збережено.').waitFor();
  const env = JSON.parse(exported);
  if (env.app !== 'fitness-trainer' || !env.stores.profile?.profile) fail('bad export');
  fs.writeFileSync(path.join(OUT, 'export.json'), exported);
  await a.page.screenshot({ path: `${OUT}/4-profile-data.png`, fullPage: true });

  await vis(a.page, 'Скинути все').click();
  await vis(a.page, 'Видалити всі дані?').waitFor();
  await a.page.waitForTimeout(400);
  await a.page.screenshot({ path: `${OUT}/5-reset-confirm.png` });
  await vis(a.page, 'Видалити все').click();
  await vis(a.page, 'Чоловік').waitFor();
  await a.page.waitForTimeout(1200);
  const left = userDocs('u1').filter((k) => !/s_(auth|settings|onboarding_draft|outbox)$/.test(k));
  console.log('  after reset, data docs left:', left);
  if (left.some((k) => /s_(profile|water|nutrition)$/.test(k))) {
    const prof = DB.get('data/users/u1/s_profile');
    if (prof && JSON.parse(prof.t).state.profile) fail('profile survived reset');
  }

  // Імпорт можливий лише після онбордингу (Профіль) — проходимо його і відновлюємо файл
  await onboard(a.page);
  await a.page.goto(BASE + '/profile');
  const chooser = a.page.waitForEvent('filechooser');
  await vis(a.page, 'Імпортувати з файлу').click();
  await (await chooser).setFiles(path.join(OUT, 'export.json'));
  await vis(a.page, 'Замінити дані з файлу?').waitFor();
  await vis(a.page, 'Замінити').click();
  await vis(a.page, 'Дані імпортовано.').waitFor();
  if (process.env.DEBUG) {
    console.log('  local water:', await a.page.evaluate(() => localStorage.getItem('water')));
    console.log('  cloud water:', JSON.stringify(DB.get('data/users/u1/s_water')));
  }
  await a.page.goto(BASE + '/');
  await vis(a.page, 'Зважування').waitFor();
  if (!(await a.page.locator('text="0,25" >> visible=true').count())) fail('water not restored by import');
  console.log('  export → reset → import: ok');

  // Файл із невідомим полем відхиляється цілком
  const evil = JSON.parse(exported);
  evil.stores.water.hacked = '<img src=x onerror=alert(1)>';
  fs.writeFileSync(path.join(OUT, 'evil.json'), JSON.stringify(evil));
  await a.page.goto(BASE + '/profile');
  const chooser2 = a.page.waitForEvent('filechooser');
  await vis(a.page, 'Імпортувати з файлу').click();
  await (await chooser2).setFiles(path.join(OUT, 'evil.json'));
  await vis(a.page, 'Замінити').click();
  await vis(a.page, 'Файл не схожий на експорт цього застосунку.').waitFor();
  const water = JSON.parse(await a.page.evaluate(() => localStorage.getItem('water')));
  if ('hacked' in water.state) fail('unknown field imported');
  console.log('  import with unknown field rejected: ok');

  await browser.close(); server.close();
  console.log(process.exitCode ? 'FAILED' : 'all data checks passed');
})().catch((e) => { console.error(e); server.close(); process.exit(1); });

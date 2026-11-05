const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots5'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon' };
const DIST = require('path').join(__dirname, '..', 'dist');
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8103);

const seed = () => {
  const iso = (d) => d.toISOString().slice(0, 10);
  const day = (n) => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() - n); return iso(d); };
  const read = (k) => JSON.parse(localStorage.getItem(k));
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const profile = read('profile');
  profile.state.weights = Array.from({ length: 60 }, (_, i) => 60 - i).filter((n) => n % 2 === 0 || n < 10)
    .map((n) => ({ id: 'w' + n, date: day(n), weightKg: Math.round((84 - (60 - n) * 0.05 + Math.sin(n) * 0.6) * 10) / 10, updatedAt: '' }));
  write('profile', profile);
  const sets = (ex, w, reps, k) => Array.from({ length: k }, (_, i) => ({ id: ex + w + i + Math.random(), exerciseId: ex, position: 0, setIndex: i, weightKg: w, reps }));
  const workouts = [];
  for (let wk = 0; wk < 6; wk++) {
    workouts.push({ id: 'a' + wk, date: day(wk * 7 + 1), name: 'Верх тіла', updatedAt: '', sets: [...sets('barbell_bench_press', 60 + wk * 2.5, 8, 3), ...sets('barbell_bent_over_row', 50 + wk * 2.5, 10, 3), ...sets('lateral_raise', 8, 12, 3)] });
    workouts.push({ id: 'b' + wk, date: day(wk * 7 + 3), name: 'Низ тіла', updatedAt: '', sets: [...sets('barbell_back_squat', 80 + wk * 5, 6, 4), ...sets('romanian_deadlift', 60 + wk * 2.5, 10, 3), ...sets('standing_calf_raise', 40, 15, 3)] });
  }
  write('workouts', { state: { program: null, workouts, active: null }, version: 0 });
  write('strength', { state: { experience: 'intermediate', estimates: {}, history: [0, 1, 2, 3, 4, 5].flatMap((wk) => [
    { exerciseId: 'barbell_bench_press', oneRmKg: 80 + wk * 2, date: day(42 - wk * 7) },
    { exerciseId: 'barbell_back_squat', oneRmKg: 105 + wk * 4, date: day(42 - wk * 7) },
    { exerciseId: 'barbell_deadlift', oneRmKg: 130 + wk * 3, date: day(42 - wk * 7) },
  ]) }, version: 0 });
  write('progress', { state: { measurements: [
    { id: 'm1', date: day(40), waistCm: 88, chestCm: 102, bicepsCm: 35, updatedAt: '' },
    { id: 'm2', date: day(20), waistCm: 86.5, chestCm: 102.5, bicepsCm: 35.5, updatedAt: '' },
    { id: 'm3', date: day(2), waistCm: 85, chestCm: 103, bicepsCm: 36, updatedAt: '' },
  ], photos: [] }, version: 0 });
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const run = async (name, viewport, scheme) => {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, locale: 'uk-UA' });
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
    const vis = (t) => page.locator(`text=${JSON.stringify(t)} >> visible=true`).first();
    const click = (t) => vis(t).click(); const see = (t, timeout = 10000) => vis(t).waitFor({ timeout });
    const shot = (s) => page.screenshot({ path: `${OUT}/${name}-${s}.png`, fullPage: true });
    await page.goto('http://localhost:8103/');
    await click('Чоловік'); await page.getByLabel('Вік').fill('30'); await click('Далі');
    await page.getByLabel('Зріст').fill('180'); await page.getByLabel('Вага').fill('84'); await click('Далі');
    await click('Помірна активність'); await click('Далі'); await click('Схуднути');
    await click('Розрахувати норму'); await click('Зберегти й почати'); await see('Зважування');
    await page.evaluate(seed);
    await page.goto('http://localhost:8103/progress');
    await see('Тижневий звіт', 20000);
    await see('Тоннаж по тижнях');
    await shot('1-progress');
    for (let k = 1; k <= 3; k++) {
      await page.mouse.move(viewport.width * 0.6, viewport.height / 2);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/${name}-1${k}-scroll.png` });
    }
    await page.mouse.wheel(0, -5000);
    // Перемикачі
    await page.getByRole('radio', { name: '30 днів' }).click();
    await page.locator('text="Показати таблицею" >> visible=true').first().click();
    await see('Показати графік');
    await page.locator('text="Показати графік" >> visible=true').first().click();
    await page.getByLabel('Попередній тиждень').click();
    console.log(`  ${name}: progress dashboard ok`);
    // Заміри
    await click('Записати заміри');
    await page.getByLabel('Талія').fill('84.5');
    await click('Зберегти заміри');
    await see('Тижневий звіт');
    // Фото
    await click('Відкрити фото');
    const shotPage = await ctx.newPage(); await shotPage.setContent('<body style="margin:0"><div style="width:300px;height:400px;background:linear-gradient(#889,#445)"></div></body>');
    const img = path.join(__dirname, 'body.png'); await shotPage.screenshot({ path: img, clip: { x: 0, y: 0, width: 300, height: 400 } }); await shotPage.close();
    for (let i = 0; i < 2; i++) {
      const chooser = page.waitForEvent('filechooser');
      await click('Вибрати з галереї');
      await (await chooser).setFiles(img);
      await page.waitForTimeout(800);
    }
    await see('Порівняння');
    await shot('2-photos');
    console.log(`  ${name}: measurements + photos ok`);
    // Нагадування (веб — пояснення)
    await page.goto('http://localhost:8103/reminders');
    await page.getByText(/Нагадування працюють у застосунку на телефоні/).first().waitFor({ timeout: 20000 });
    await page.goto('http://localhost:8103/progress');
    await see('Тижневий звіт', 20000);
    await shot('3-progress-after');
    console.log(`  ${name}: reminders + persistence ok`);
    await ctx.close();
  };
  try {
    await run('phone', { width: 390, height: 844 }, 'light');
    await run('desktop', { width: 1366, height: 900 }, 'dark');
  } catch (e) { console.error('FAIL', e.message.split('\n').slice(0, 5).join('\n')); }
  console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
  await browser.close(); server.close();
})();

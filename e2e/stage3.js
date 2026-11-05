const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIST = require('path').join(__dirname, '..', 'dist'), OUT = path.join(__dirname, 'shots3');
fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8099);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const run = async (name, viewport, scheme) => {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, locale: 'uk-UA' });
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());
    page.on('console', m => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
    page.on('pageerror', e => errors.push(`${name} pageerror: ${e.message}`));
    const shot = (s) => page.screenshot({ path: `${OUT}/${name}-${s}.png`, fullPage: true });
    const vis = (text) => page.locator(`text=${JSON.stringify(text)} >> visible=true`).first();
    const click = (text) => vis(text).click();
    const see = (text, timeout = 10000) => vis(text).waitFor({ timeout });
    const step = (s) => console.log(`  ${name}: ${s}`);
    const tab = async (label) => { await page.getByRole('tab', { name: new RegExp(label) }).first().click().catch(() => click(label)); };

    await page.goto('http://localhost:8099/');
    await click('Чоловік'); await page.getByLabel('Вік').fill('30'); await click('Далі');
    await page.getByLabel('Зріст').fill('180'); await page.getByLabel('Вага').fill('82'); await click('Далі');
    await click('Помірна активність'); await click('Далі'); await click('Набрати масу');
    await click('Розрахувати норму'); await click('Зберегти й почати'); await see('Зважування');

    await tab('Тренування');
    await see('Програми ще немає');
    // Калібровка
    await click('Силові показники');
    await page.getByLabel('Жим лежачи, Вага').fill('80');
    await page.getByLabel('Жим лежачи, Повтори').fill('5');
    await page.getByText(/1ПМ ≈ 93,5 кг/).first().waitFor();
    await page.getByLabel('Присідання зі штангою, Вага').fill('100');
    await page.getByLabel('Присідання зі штангою, Повтори').fill('5');
    await shot('1-strength');
    await click('Зберегти показники');
    step('calibration ok');
    // Зал
    await click('Мій зал');
    await click('Невеликий зал');
    await see('Вибрано: 15');
    await click('Зберегти зал');
    step('gym ok');
    // Програма
    await click('Створити програму');
    await page.getByRole('radio', { name: '4', exact: true }).click();
    await see('Верх тіла');
    await shot('2-program-new');
    await click('Зберегти програму');
    await see('Програма');
    await shot('3-hub');
    step('program ok');

    // Живе тренування
    await click('Почати: Верх тіла');
    await see('Вправа 1 з 6');
    await see('Жим штанги лежачи');
    const placeholder = await page.getByLabel('Вага, підхід 1').getAttribute('placeholder');
    if (placeholder !== '70') throw new Error('bench placeholder ' + placeholder);
    await page.locator('[aria-label="Підхід 1 виконано"] >> visible=true').first().click();
    await see('Відпочинок');
    await page.getByLabel('Наскільки важко (RPE): 8').first().click();
    await shot('4-live');
    await click('Пропустити');
    for (const n of [2, 3]) await page.locator(`[aria-label="Підхід ${n} виконано"] >> visible=true`).first().click();
    await click('Пропустити');
    await click('Наступна');
    await see('Вправа 2 з 6');
    await click('Замінити вправу');
    await click('Тяга нижнього блока').catch(async () => {
      // якщо поточна вправа і є тяга нижнього блока — беремо першу альтернативу
      await page.locator('text=Чим замінити').waitFor();
    });
    await page.locator('[aria-label="Підхід 1 виконано"] >> visible=true').first().click();
    await click('Пропустити');
    await page.getByLabel('Завершити').first().click();
    await see('Як самопочуття?');
    await page.getByLabel('Нотатка').fill('Жим пішов легко');
    await click('Зберегти тренування');
    await page.getByText(/Тренування збережено: тоннаж/).waitFor();
    await shot('5-done');
    step('live workout ok');

    // Календар
    await page.goto('http://localhost:8099/calendar');
    await see('Календар', 20000);
    await shot('6-calendar');
    await click('Тиждень');
    await see('Виконано');
    step('calendar ok');

    // Каталог
    await page.goto('http://localhost:8099/exercises');
    await page.getByLabel('Пошук вправи').fill('гакк');
    await click('Гакк-присідання');
    await see('Типові помилки');
    await shot('7-exercise');
    step('catalog ok');

    await page.goto('http://localhost:8099/workouts');
    await see('Останні тренування', 20000);
    await see('Верх тіла');
    step('persisted');
    await ctx.close();
  };
  try {
    await run('phone', { width: 390, height: 844 }, 'light');
    await run('desktop', { width: 1280, height: 860 }, 'dark');
  } catch (e) { console.error('FAIL', e.message.split('\n').slice(0, 6).join('\n')); }
  console.log('console errors:', errors.length ? errors : 'none');
  await browser.close(); server.close();
})();

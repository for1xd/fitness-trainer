const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIST = require('path').join(__dirname, '..', 'dist'), OUT = path.join(__dirname, 'shots2');
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
    const click = (text) => page.getByText(text, { exact: true }).first().click();
    const see = (text, opts = {}) => page.getByText(text, { exact: true, ...opts }).first().waitFor({ timeout: 10000 });
    const step = (s) => console.log(`  ${name}: ${s}`);

    await page.goto('http://localhost:8099/');
    await click('Продовжити без акаунта');
    await click('Чоловік');
    await page.getByLabel('Вік').fill('30');
    await click('Далі');
    await page.getByLabel('Зріст').fill('180');
    await page.getByLabel('Вага').fill('82');
    await click('Далі'); await click('Помірна активність'); await click('Далі');
    await click('Схуднути'); await click('Розрахувати норму'); await click('Зберегти й почати');
    await see('Зважування');
    step('onboarding done');

    // Вода
    await page.getByLabel('Додати 250 мл води').click();
    await page.getByLabel('Додати 250 мл води').click();
    await page.getByLabel('Додати 500 мл води').click();
    await see('з 2,7 л');
    await page.getByRole('switch', { name: 'Сьогодні тренування' }).click();
    await see('з 3,2 л');
    await click('Скасувати останнє');
    step('water ok');

    // Пошук і порція
    await click('Додати їжу');
    await page.getByLabel('Пошук страви або продукту').fill('вареників з картоп');
    await click('Вареники з картоплею');
    await page.getByLabel('Скільки: шт. по 30 г').fill('10');
    await see('444'); // 300 г × 148 ккал/100 г
    await shot('1-portion');
    await click('Додати в щоденник');
    await see('Зважування');
    step('entry from today ok');
    await shot('2-today');

    // Щоденник
    await page.getByRole('tab', { name: /Харчування/ }).first().click().catch(() => click('Харчування'));
    await see('Вареники з картоплею');
    await see('300 г');

    // Рецепт
    await click('Мої рецепти');
    await click('Створити рецепт');
    await page.getByLabel('Назва рецепта').fill('Гречка з куркою');
    await page.getByLabel('Пошук інгредієнта').fill('гречка суха');
    await click('Гречка суха');
    await page.getByLabel('Пошук інгредієнта').fill('куряче філе сире');
    await click('Куряче філе сире');
    await page.getByLabel('Куряче філе сире, г').fill('200');
    await page.getByLabel('Порцій').fill('2');
    await see('На порцію, 150 г');
    await shot('3-recipe');
    await click('Зберегти рецепт');
    await click('Гречка з куркою');
    await click('Додати в щоденник');
    step('recipe ok');

    // Свій продукт
    await page.getByLabel('Додати: Перекус').first().click();
    await page.getByLabel('Пошук страви або продукту').fill('батончик фітнес');
    await click('Додати «батончик фітнес» як свій продукт');
    await page.getByLabel('Калорії').fill('380');
    await page.getByLabel('Білки').fill('20');
    await page.getByLabel('Жири').fill('12');
    await page.getByLabel('Вуглеводи').fill('48');
    await click('Зберегти продукт');
    await page.getByLabel('г', { exact: true }).fill('50').catch(() => {});
    await click('Додати в щоденник');
    await see('батончик фітнес');
    step('custom food ok');
    await shot('4-diary');

    // Редагування і видалення запису
    await click('Вареники з картоплею');
    await see('Видалити запис');
    await click('Видалити запис');
    await page.getByText('Вареники з картоплею', { exact: true }).waitFor({ state: 'detached', timeout: 10000 });
    step('delete ok');

    // Перезавантаження
    await page.reload();
    await see('Гречка з куркою', { timeout: 20000 }).catch(async () => {
      await page.getByRole('tab', { name: /Харчування/ }).first().click().catch(() => click('Харчування'));
      await see('Гречка з куркою');
    });
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

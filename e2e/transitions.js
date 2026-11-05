// Переходи: жодного кадру з сірим/чорним фоном стандартної теми навігації; кадри посеред анімацій.
// node e2e/transitions.js   (потрібна збірка dist/)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, '..', 'dist');
const OUT = path.join(__dirname, 'shots-motion'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8108);
const BASE = 'http://localhost:8108';
let failed = false;
const fail = (m) => { failed = true; console.error('FAIL:', m); };

// Слідкує щокадру: чи є видимий елемент із фоном стандартної теми (rgb 242,242,242 / rgb 1,1,1)
const watch = () => {
  window.__bad = [];
  const BAD = ['rgb(242, 242, 242)', 'rgb(1, 1, 1)'];
  const end = performance.now() + 700;
  const scan = () => {
    for (const el of document.querySelectorAll('div')) {
      const bg = getComputedStyle(el).backgroundColor;
      if (BAD.includes(bg)) {
        const r = el.getBoundingClientRect();
        if (r.width > 40 && r.height > 40) window.__bad.push(bg);
      }
    }
    if (performance.now() < end) requestAnimationFrame(scan);
  };
  requestAnimationFrame(scan);
};

(async () => {
  const browser = await chromium.launch();
  for (const scheme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    page.on('pageerror', (e) => fail(`${scheme} pageerror ${e.message}`));
    const vis = (t) => page.locator(`text=${JSON.stringify(t)} >> visible=true`).first();
    await page.goto(BASE + '/');
    await vis('Чоловік').click(); await page.getByLabel('Вік').fill('30'); await vis('Далі').click();
    await page.getByLabel('Зріст').fill('180'); await page.getByLabel('Вага').fill('80'); await vis('Далі').click();
    await vis('Помірна активність').click(); await vis('Далі').click(); await vis('Тримати форму').click();
    await vis('Розрахувати норму').click(); await vis('Зберегти й почати').click(); await vis('Зважування').waitFor();

    const check = async (label, action, shotAt) => {
      await page.evaluate(watch);
      await action();
      if (shotAt) { await page.waitForTimeout(shotAt); await page.screenshot({ path: `${OUT}/${scheme}-${label}.png` }); }
      await page.waitForTimeout(800);
      const bad = await page.evaluate(() => window.__bad);
      if (bad.length) fail(`${scheme} ${label}: ${bad.length} frames with default nav background ${bad[0]}`);
      else console.log(`  ${scheme} ${label}: clean`);
    };
    for (const tab of ['Харчування', 'Тренування', 'Прогрес', 'Профіль', 'Сьогодні'])
      await check(`tab-${tab}`, () => page.getByRole('tab', { name: new RegExp(tab) }).first().click(), tab === 'Харчування' ? 70 : 0);
    await check('open-add-food', () => vis('Додати їжу').click(), 120);
    await check('back', () => page.goBack(), 100);
    await page.getByRole('tab', { name: /Тренування/ }).first().click();
    await page.waitForTimeout(400);
    await check('open-catalog', () => vis('Каталог вправ').click(), 0);
    await page.close();
  }
  // Зменшений рух: вкладки міняються миттєво
  const r = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await r.goto(BASE + '/');
  await r.locator('text="Чоловік" >> visible=true').first().waitFor();
  console.log('  reduced motion: loads ok');
  await browser.close(); server.close();
  console.log(failed ? 'FAILED' : 'no grey frames');
  process.exitCode = failed ? 1 : 0;
})();

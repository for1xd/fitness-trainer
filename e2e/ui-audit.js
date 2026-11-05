// Візуальний аудит: усі вкладки на 375 / 390 / 1280 px, світла й темна теми, + кільце калорій на крайніх значеннях.
// node e2e/ui-audit.js <мітка>   (напр. before / after). Потрібна збірка dist/.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'run';
const DIST = path.join(__dirname, '..', 'dist');
const OUT = path.join(__dirname, 'shots-ui', LABEL); fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8105);
const BASE = 'http://localhost:8105';

const setEaten = (kcal) => {
  const today = new Date(); today.setHours(12);
  const d = today.toISOString().slice(0, 10);
  const n = JSON.parse(localStorage.getItem('nutrition')) || { state: { entries: [], userFoods: [], recipes: [] }, version: 0 };
  n.state.entries = kcal ? [{ id: 'e1', date: d, eatenAt: today.toISOString(), mealType: 'lunch', name: 'Тест', grams: 100,
    nutrients: { kcal, proteinG: Math.round(kcal * 0.05), fatG: Math.round(kcal * 0.03), carbsG: Math.round(kcal * 0.12) }, source: 'manual', updatedAt: '' }] : [];
  localStorage.setItem('nutrition', JSON.stringify(n));
};

(async () => {
  const browser = await chromium.launch();
  const issues = [];
  for (const scheme of ['dark', 'light']) {
    for (const width of [375, 390, 1280]) {
      const ctx = await browser.newContext({ viewport: { width, height: width > 800 ? 860 : 812 }, colorScheme: scheme, locale: 'uk-UA' });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => issues.push(`${scheme}/${width} pageerror ${e.message}`));
      const vis = (t) => page.locator(`text=${JSON.stringify(t)} >> visible=true`).first();
      const click = (t) => vis(t).click();
      await page.goto(BASE + '/');
      await click('Продовжити без акаунта');
      await click('Чоловік'); await page.getByLabel('Вік').fill('30'); await click('Далі');
      await page.getByLabel('Зріст').fill('180'); await page.getByLabel('Вага').fill('80'); await click('Далі');
      await click('Помірна активність'); await click('Далі'); await click('Тримати форму');
      await click('Розрахувати норму'); await click('Зберегти й почати'); await vis('Зважування').waitFor();
      await page.getByRole('tab', { name: /Тренування/ }).first().click();
      await click('Створити програму'); await click('Зберегти програму'); await vis('Програма').waitFor();
      await page.evaluate(setEaten, 990);
      for (const [tab, route] of [['today', '/'], ['nutrition', '/nutrition'], ['workouts', '/workouts'], ['progress', '/progress'], ['profile', '/profile']]) {
        await page.goto(BASE + route);
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${OUT}/${scheme}-${width}-${tab}.png` });
        // Текст, що виходить за межі свого батька або вікна
        const overflow = await page.evaluate(() => {
          const out = [];
          for (const el of document.querySelectorAll('div[dir="auto"]')) {
            const r = el.getBoundingClientRect();
            if (!r.width || !el.textContent.trim()) continue;
            if (r.right > window.innerWidth + 1 || el.scrollWidth > el.clientWidth + 2) out.push(el.textContent.trim().slice(0, 40));
          }
          return [...new Set(out)].slice(0, 6);
        });
        if (overflow.length) issues.push(`${scheme}/${width}/${tab} overflow: ${overflow.join(' | ')}`);
      }
      if (width === 390) {
        // Кільце калорій на крайніх значеннях (норма підтримки ≈ 2 760)
        for (const [name, eaten] of [['remain-full', 0], ['remain-999', 1761], ['zero', 2760], ['over-210', 2970], ['over-12500', 15260]]) {
          await page.evaluate(setEaten, eaten);
          await page.goto(BASE + '/');
          await page.waitForTimeout(700);
          const card = page.locator('text=/з\'їдено|залишилось|понад норму/i >> visible=true').first();
          const box = await card.boundingBox().catch(() => null);
          await page.screenshot({ path: `${OUT}/${scheme}-ring-${name}.png`, clip: { x: 0, y: Math.max(0, (box?.y ?? 200) - 120), width: 390, height: 260 } });
        }
      }
      await ctx.close();
    }
  }
  console.log(issues.length ? issues.join('\n') : 'no issues detected by script');
  await browser.close(); server.close();
})();

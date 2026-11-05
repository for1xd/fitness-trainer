// Таб-бар над home indicator: імітуємо безпечну зону iPhone (34 px знизу, 59 px зверху).
// Chromium не емулює env(safe-area-inset-*), тож після запуску задаємо padding елементу-зонду
// react-native-safe-area-context (він перечитує padding після переходу).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const DIST = path.join(__dirname, '..', 'dist');
const OUT = path.join(__dirname, 'shots-motion'); fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8131);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 15'], colorScheme: 'dark' });
  const page = await ctx.newPage();
  const vis = (t) => page.locator(`text=${JSON.stringify(t)} >> visible=true`).first();
  await page.goto('http://localhost:8131/');
  await vis('Чоловік').click(); await page.getByLabel('Вік').fill('30'); await vis('Далі').click();
  await page.getByLabel('Зріст').fill('180'); await page.getByLabel('Вага').fill('80'); await vis('Далі').click();
  await vis('Помірна активність').click(); await vis('Далі').click(); await vis('Тримати форму').click();
  await vis('Розрахувати норму').click(); await vis('Зберегти й почати').click(); await vis('Зважування').waitFor();
  await page.waitForTimeout(1800);
  // Зонд бібліотеки: div із transition по padding; зміна padding → бібліотека перечитує відступи
  await page.evaluate(() => {
    for (const d of document.querySelectorAll('div'))
      if (d.style.transitionProperty === 'padding') {
        d.style.paddingBottom = '34px';
        d.style.paddingTop = '59px';
      }
  });
  await page.waitForTimeout(600);
  const vp = page.viewportSize();
  const tab = await page.getByRole('tab', { name: /Сьогодні/ }).first().boundingBox();
  const gap = vp.height - (tab.y + tab.height);
  console.log(`viewport ${vp.width}×${vp.height}; tab bottom gap ${Math.round(gap)} px (needs ≥ 34 + 8)`);
  await page.screenshot({ path: `${OUT}/iphone-safe-area.png` });
  if (gap < 42) { console.log('FAIL: tab bar overlaps home indicator'); process.exitCode = 1; } else console.log('safe area ok');
  await browser.close(); server.close();
})();

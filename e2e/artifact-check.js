const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const A = require('path').join(__dirname, '..', 'artifact');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (!url.startsWith('/x/y/')) { res.writeHead(404); return res.end('not here: ' + url); }
  let rel = url.slice(5) || 'index.html';
  const p = path.join(A, rel);
  if (rel === 'index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + fs.readFileSync(p, 'utf8') + '</body></html>');
  }
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8098);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'uk-UA' });
  const bad = [];
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  page.on('pageerror', (e) => bad.push('pageerror ' + e.message));
  page.on('console', (m) => m.type() === 'error' && bad.push('console ' + m.text()));
  const vis = (t) => page.locator(`text=${JSON.stringify(t)} >> visible=true`).first();
  try {
    await page.goto('http://localhost:8098/x/y/index.html');
    await vis('Продовжити без акаунта').click({ timeout: 20000 });
    await vis('Чоловік').click(); await page.getByLabel('Вік').fill('30'); await vis('Далі').click();
    await page.getByLabel('Зріст').fill('180'); await page.getByLabel('Вага').fill('82'); await vis('Далі').click();
    await vis('Помірна активність').click(); await vis('Далі').click(); await vis('Схуднути').click();
    await vis('Розрахувати норму').click(); await vis('Зберегти й почати').click();
    await vis('Зважування').waitFor();
    await vis('Додати їжу').click();
    await page.getByLabel('Пошук страви або продукту').fill('борщ');
    await vis('Борщ пісний').click(); await vis('Додати в щоденник').click();
    await vis('Зважування').waitFor();
    await page.getByRole('tab', { name: /Тренування/ }).first().click();
    await vis('Програми ще немає').waitFor();
    await vis('Каталог вправ').click(); await vis('Гакк-присідання').click(); await vis('Типові помилки').waitFor();
    const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
    console.log('fonts loaded:', [...new Set(fonts)].join(', '));
    await page.screenshot({ path: __dirname + '/artifact-check.png' });
    console.log('OK, url now', page.url());
  } catch (e) { console.log('FAIL', e.message.split('\n')[0]); }
  console.log('problems:', bad.length ? bad.slice(0, 10) : 'none');
  await browser.close(); server.close();
})();

// Кадри анімації знака на першому запуску (світла й темна теми) + режим «зменшити рух».
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, '..', 'dist');
const OUT = path.join(__dirname, 'shots-brand'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8107);
(async () => {
  const browser = await chromium.launch();
  for (const scheme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.goto('http://localhost:8107/');
    const logo = page.locator('[role="heading"]').first();
    await logo.waitFor();
    const box = await logo.boundingBox();
    const clip = { x: 0, y: Math.max(0, box.y - 16), width: 390, height: box.height + 32 };
    for (const t of [0, 150, 350, 900]) {
      if (t) await page.waitForTimeout(t === 150 ? 150 : t === 350 ? 200 : 550);
      await page.screenshot({ path: `${OUT}/${scheme}-${t}.png`, clip });
    }
    await page.screenshot({ path: `${OUT}/${scheme}-full.png` });
    await page.close();
  }
  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  await reduced.goto('http://localhost:8107/');
  await reduced.locator('[role="heading"]').first().waitFor();
  await reduced.screenshot({ path: `${OUT}/reduced-0.png`, clip: { x: 0, y: 0, width: 390, height: 140 } });
  await browser.close(); server.close();
})();

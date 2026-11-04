// Перевірка шляху «артефакт Claude»: розпізнавання фото через можливість sample (підставний window.claude)
// і штрихкод без доступу до Open Food Facts. Потрібна збірка: npx expo export -p web
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, '..', 'dist');
const OUT = path.join(__dirname, 'shots-artifact'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(8104);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'uk-UA' });
  await ctx.addInitScript(() => {
    window.__sampleCalls = [];
    const sample = Object.freeze({
      limits: async () => ({ maxPromptBytes: 262144, images: { maxCount: 4, maxInputBytes: 20e6, mediaTypes: ['image/jpeg', 'image/png'] } }),
      json: async (input, opts) => {
        window.__sampleCalls.push({ hasDishList: input.includes('borshch-ukrainskyi-z-miasom'), images: (opts.images || []).map((b) => b.type + ':' + b.size) });
        await new Promise((r) => setTimeout(r, 300));
        return { is_food: true, dish_name_uk: 'Вареники зі сметаною', overall_confidence: 0.8, notes_uk: 'Сметани може бути більше.',
          items: [
            { name_uk: 'Вареники з картоплею', match_slug: 'varenyky-z-kartopleiu', grams: 250, kcal: 400, protein_g: 10, fat_g: 8, carbs_g: 66, confidence: 0.85 },
            { name_uk: 'Сметана', match_slug: null, grams: 40, kcal: 82, protein_g: 1.1, fat_g: 8, carbs_g: 1.3, confidence: 0.6 },
          ] };
      },
    });
    window.claude = { use: async (name) => (name === 'sample' ? sample : null) };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const vis = (t) => page.locator(`text=${JSON.stringify(t)} >> visible=true`).first();
  const click = (t) => vis(t).click();
  try {
    await page.goto('http://localhost:8104/');
    await click('Продовжити без акаунта');
    await click('Чоловік'); await page.getByLabel('Вік').fill('30'); await click('Далі');
    await page.getByLabel('Зріст').fill('180'); await page.getByLabel('Вага').fill('82'); await click('Далі');
    await click('Помірна активність'); await click('Далі'); await click('Схуднути');
    await click('Розрахувати норму'); await click('Зберегти й почати'); await vis('Зважування').waitFor();

    await click('Фото страви');
    await page.getByText(/фото розпізнає Claude через твій акаунт/).first().waitFor();
    const shotPage = await ctx.newPage(); await shotPage.setContent('<div style="width:500px;height:400px;background:#dcb"></div>');
    const img = path.join(__dirname, 'meal-a.png'); await shotPage.screenshot({ path: img, clip: { x: 0, y: 0, width: 500, height: 400 } }); await shotPage.close();
    const chooser = page.waitForEvent('filechooser');
    await click('Вибрати з галереї');
    await (await chooser).setFiles(img);
    await vis('Перевір результат').waitFor({ timeout: 20000 });
    await vis('Вареники з картоплею').waitFor();
    await page.screenshot({ path: `${OUT}/photo-review.png` });
    const calls = await page.evaluate(() => window.__sampleCalls);
    if (!calls.length || !calls[0].hasDishList || !calls[0].images[0]?.startsWith('image/jpeg:')) throw new Error('bad sample call ' + JSON.stringify(calls));
    await click('Додати в щоденник');
    await page.getByText(/З'їдено 452 з/).first().waitFor(); // 250 г × 148 + 82
    console.log('  artifact photo ok:', JSON.stringify(calls[0]));

    await click('Додати їжу'); await click('Штрихкод');
    await page.getByLabel('Цифри штрихкоду').fill('4006381333931'); await click('Знайти товар');
    await page.getByText(/база Open Food Facts недоступна/).first().waitFor();
    await page.screenshot({ path: `${OUT}/barcode-offline.png` });
    console.log('  artifact barcode offline notice ok');
  } catch (e) { console.error('FAIL', e.message.split('\n').slice(0, 4).join('\n')); }
  console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
  fs.rmSync(path.join(__dirname, 'meal-a.png'), { force: true });
  await browser.close(); server.close();
})();

const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots4'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon' };
const serve = (dir, port) => http.createServer((req, res) => {
  let p = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(dir, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(port);
const s1 = serve(require('path').join(__dirname, '..', 'dist'), 8101);
const USER = '11111111-2222-3333-4444-555555555555';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })}.sig`;
const user = { id: USER, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const ANALYSIS = { analysisId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', model: 'claude-opus-5-5', analysis: {
  isFood: true, dishName: 'Борщ зі сметаною', overallConfidence: 0.7, notes: 'Шматки м\'яса частково приховані.',
  items: [
    { name: 'Борщ', matchSlug: 'borshch-ukrainskyi-z-miasom', grams: 350, kcal: 180, proteinG: 9, fatG: 8, carbsG: 18, confidence: 0.82 },
    { name: 'Сметана 20%', matchSlug: null, grams: 30, kcal: 62, proteinG: 0.8, fatG: 6, carbsG: 1, confidence: 0.6 },
  ] } };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctxFor = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'uk-UA' });
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${name}: ${m.text()}`));
    const vis = (t) => page.locator(`text=${JSON.stringify(t)} >> visible=true`).first();
    return { ctx, page, vis, click: (t) => vis(t).click(), see: (t, timeout = 10000) => vis(t).waitFor({ timeout }), shot: (s) => page.screenshot({ path: `${OUT}/${name}-${s}.png`, fullPage: true }) };
  };
  const onboard = async ({ page, click, see }) => {
    await click('Чоловік'); await page.getByLabel('Вік').fill('30'); await click('Далі');
    await page.getByLabel('Зріст').fill('180'); await page.getByLabel('Вага').fill('82'); await click('Далі');
    await click('Помірна активність'); await click('Далі'); await click('Схуднути');
    await click('Розрахувати норму'); await click('Зберегти й почати'); await see('Зважування');
  };
  try {
    // ── A: без сервера — штрихкоди й пояснення для фото
    const A = await ctxFor('guest');
    await A.page.route('**/world.openfoodfacts.org/**', (route) => {
      const url = route.request().url();
      if (url.includes('4006381333931')) return route.fulfill({ json: { status: 1, product: { code: '4006381333931', product_name_uk: 'Кефір 2,5%', brands: 'Галичина', serving_quantity: 200, nutriments: { 'energy-kcal_100g': 50, proteins_100g: 2.8, fat_100g: 2.5, carbohydrates_100g: 4 } } } });
      return route.fulfill({ json: { status: 0 } });
    });
    await A.page.goto('http://localhost:8101/');
    await onboard(A);
    await A.click('Фото страви');
    await A.page.getByText(/працює у версії на claude.ai/).first().waitFor();
    await A.shot('1-photo-guest');
    await A.page.goBack();
    await A.click('Додати їжу'); await A.click('Штрихкод');
    await A.page.getByText(/Сканування камерою працює в застосунку/).first().waitFor();
    await A.page.getByLabel('Цифри штрихкоду').fill('4006381333932'); await A.click('Знайти товар');
    await A.page.getByText(/контрольна цифра не збігається/).first().waitFor();
    await A.page.getByLabel('Цифри штрихкоду').fill('4006381333931'); await A.click('Знайти товар');
    await A.see('Кефір 2,5% (Галичина)').catch(() => A.see('Кефір 2,5%'));
    await A.shot('2-barcode-found');
    await A.click('Додати в щоденник'); await A.see('Зважування');
    console.log('  guest: barcode found ok');
    await A.click('Додати їжу'); await A.click('Штрихкод');
    await A.page.getByLabel('Цифри штрихкоду').fill('96385074'); await A.click('Знайти товар');
    await A.page.getByText(/Товару з кодом 96385074 немає/).first().waitFor();
    await A.click('Додати свій продукт');
    await A.page.getByLabel('Назва').fill('Батончик вівсяний');
    await A.page.getByLabel('Калорії').fill('400'); await A.page.getByLabel('Білки').fill('8');
    await A.page.getByLabel('Жири').fill('15'); await A.page.getByLabel('Вуглеводи').fill('58');
    await A.click('Зберегти продукт'); await A.click('Додати в щоденник'); await A.see('Зважування');
    await A.click('Додати їжу'); await A.click('Штрихкод');
    await A.page.getByLabel('Цифри штрихкоду').fill('96385074'); await A.click('Знайти товар');
    await A.see('Батончик вівсяний');
    console.log('  guest: barcode not found → own product → found locally ok');
    await A.ctx.close();

    // Розпізнавання фото в артефакті перевіряє e2e/artifact-claude.js; екран входу прибрано.
  } catch (e) { console.error('FAIL', e.message.split('\n').slice(0, 5).join('\n')); }
  console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
  await browser.close(); s1.close();
})();

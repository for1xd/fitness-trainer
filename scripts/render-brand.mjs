// PNG з assets/brand/*.svg: іконки застосунку, favicon і аркуш перевірки розмірів.
// node scripts/render-brand.mjs [--sheet <png>]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = (f) => readFileSync(join(ROOT, 'assets/brand', f), 'utf8');
const dataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();

async function png(svg, size, out, bg = 'transparent') {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:${bg}"><img src="${dataUri(svg)}" width="${size}" height="${size}" style="display:block"></body></html>`,
  );
  writeFileSync(join(ROOT, out), await page.screenshot({ omitBackground: bg === 'transparent' }));
  console.log('wrote', out);
}

// Знак без фону в безпечній зоні адаптивної іконки Android (66 %)
const fg = (color) =>
  brand('mono-light.svg')
    .replace(/#EEEEE8/g, color)
    .replace('<g transform="translate(0 0) scale(1.0)"', '<g transform="translate(87 87) scale(0.66)"');
const fgColor = brand('mark.svg').replace('<g transform="translate(0 0) scale(1.0)"', '<g transform="translate(87 87) scale(0.66)"');

await png(brand('icon-square.svg'), 1024, 'assets/icon.png');
await png(fgColor, 1024, 'assets/android-icon-foreground.png');
await png(fg('#FFFFFF'), 1024, 'assets/android-icon-monochrome.png');
await png(brand('mark.svg'), 1024, 'assets/splash-icon.png');
await png(brand('icon-small.svg'), 48, 'assets/favicon.png');

const sheetOut = process.argv[process.argv.indexOf('--sheet') + 1];
if (process.argv.includes('--sheet') && sheetOut) {
  const sizes = [16, 32, 180, 512];
  const cell = (svg, s, bg) =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><div style="background:${bg};padding:12px;border-radius:12px"><img src="${dataUri(svg)}" width="${s}" height="${s}" style="display:block"></div><span>${s}px</span></div>`;
  const row = (label, svgFor, bg) =>
    `<h3>${label}</h3><div style="display:flex;gap:24px;align-items:flex-end">${sizes.map((s) => cell(svgFor(s), s, bg)).join('')}</div>`;
  const html = `<html><body style="margin:0;padding:24px;font:14px system-ui;background:#fff;color:#14171A">
    ${row('Іконка', (s) => brand(s <= 32 ? 'icon-small.svg' : 'icon.svg'), '#E7EAE6')}
    ${row('Моно світлий на графіті', () => brand('mono-light.svg'), '#1A1D21')}
    ${row('Моно темний на світлому', () => brand('mono-dark.svg'), '#E7EAE6')}
    <h3>Знак із назвою</h3>
    <div style="display:flex;flex-direction:column;gap:16px;align-items:flex-start">
      <img src="${dataUri(brand('lockup-dark.svg'))}" height="60">
      <div style="background:#E7EAE6;padding:12px;border-radius:12px"><img src="${dataUri(brand('lockup-light.svg'))}" height="60"></div>
      <img src="${dataUri(brand('lockup-dark.svg'))}" height="28">
    </div></body></html>`;
  await page.setViewportSize({ width: 1100, height: 1300 });
  await page.setContent(html);
  await page.waitForTimeout(200);
  writeFileSync(sheetOut, await page.screenshot({ fullPage: true }));
  console.log('sheet', sheetOut);
}
await browser.close();

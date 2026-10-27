/// <reference lib="dom" />
// Captures de référence du design, à partir de l'aperçu de développement.
//   npm run dev   (dans un autre terminal)
//   npm run design:screenshots
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const base = process.env.PREVIEW_URL ?? 'http://localhost:5173/preview.html';
const out = path.resolve(import.meta.dirname, '../docs/design');
mkdirSync(out, { recursive: true });

const viewports = [
  { name: '390x844', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
  { name: '1440x900', width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
];
const screens = [
  ['connexion', '/auth', ''],
  ['caves', '/cellars', ''],
  ['caves-vide', '/cellars', 'empty'],
  ['caves-erreur', '/cellars', 'error'],
  ['cave', '/cellars/c-1', ''],
  ['cave-chargement', '/cellars/c-1', 'loading'],
  ['bouteille', '/bottles/b-1', ''],
  ['compte', '/account', ''],
] as const;

const browser = await chromium.launch();
for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    deviceScaleFactor: vp.deviceScaleFactor,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  for (const [name, route, state] of screens) {
    const url = `${base}?route=${encodeURIComponent(route)}${state ? `&state=${state}` : ''}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(out, `${name}-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`${overflow ? '⚠️ débordement horizontal' : '✓'} ${path.relative(process.cwd(), file)}`);
  }
  await context.close();
}
await browser.close();

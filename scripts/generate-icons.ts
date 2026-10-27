// Génère toutes les icônes de l'application à partir de public/icon.svg (source unique).
//   npm run icons
// Produit : icônes PWA (192, 512, maskable), icône Apple (180), favicon PNG (32),
// et assets/brand/ (1024 px + Cavarum.icns pour macOS, planche de contrôle).
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const svg = readFileSync(path.join(root, 'public/icon.svg'), 'utf8');
const brand = path.join(root, 'assets/brand');
mkdirSync(brand, { recursive: true });

/** Icône « maskable » : fond plein bord à bord, motif réduit dans la zone de sécurité (80 %). */
function maskableHtml(size: number) {
  return `<body style="margin:0;width:${size}px;height:${size}px;background:#1a0f0a;display:grid;place-items:center">
    <div style="width:${size * 0.8}px;height:${size * 0.8}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`;
}

/** En dessous de 48 px, les traits fins (voûte, lignes d'étiquette) deviennent du bruit : on les retire. */
function svgForSize(size: number) {
  if (size >= 48) return svg;
  return svg.replace(/<g id="detail-[^"]+"[\s\S]*?<\/g>/g, '');
}

function plainHtml(size: number) {
  return `<body style="margin:0;width:${size}px;height:${size}px;background:transparent">${svgForSize(size).replace(
    '<svg ',
    `<svg width="${size}" height="${size}" `,
  )}</body>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(html: string, size: number, file: string, transparent = true) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html);
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  console.log(`✓ ${path.relative(root, file)}`);
}

await render(plainHtml(192), 192, path.join(root, 'public/icon-192.png'));
await render(plainHtml(512), 512, path.join(root, 'public/icon-512.png'));
await render(maskableHtml(512), 512, path.join(root, 'public/icon-maskable-512.png'), false);
await render(maskableHtml(180), 180, path.join(root, 'public/apple-touch-icon.png'), false);
await render(plainHtml(32), 32, path.join(root, 'public/favicon-32.png'));
await render(plainHtml(1024), 1024, path.join(brand, 'icon-1024.png'));

// Jeu macOS (.icns) pour une icône de bureau.
const iconset = path.join(brand, 'Cavarum.iconset');
rmSync(iconset, { recursive: true, force: true });
mkdirSync(iconset);
for (const size of [16, 32, 128, 256, 512]) {
  await render(plainHtml(size), size, path.join(iconset, `icon_${size}x${size}.png`));
  await render(plainHtml(size * 2), size * 2, path.join(iconset, `icon_${size}x${size}@2x.png`));
}
if (process.platform === 'darwin') {
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(brand, 'Cavarum.icns')]);
  console.log('✓ assets/brand/Cavarum.icns');
}
rmSync(iconset, { recursive: true, force: true });

// Planche de contrôle : lisibilité de 16 à 512 px sur fond clair et sombre.
const sizes = [512, 180, 64, 32, 16];
const sheet = (bg: string) =>
  `<div style="display:flex;gap:28px;align-items:flex-end;padding:28px;background:${bg}">${sizes
    .map((s) => `<div style="width:${s}px;height:${s}px">${svgForSize(s).replace('<svg ', '<svg width="100%" height="100%" ')}</div>`)
    .join('')}</div>`;
await page.setViewportSize({ width: 1000, height: 1200 });
await page.setContent(`<body style="margin:0">${sheet('#f2efe9')}${sheet('#202020')}</body>`);
await page.screenshot({ path: path.join(brand, 'planche-icone.png'), fullPage: true });
console.log('✓ assets/brand/planche-icone.png');

await browser.close();

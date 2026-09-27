// Génère les icônes et visuels (web, Android, iOS, stores) à partir des vraies cartes du jeu.
// Usage : npm run dev -w @ronda/app  (dans un autre terminal), puis  node app/scripts/icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.DEV_URL ?? 'http://localhost:5174';
const executablePath = process.env.CHROMIUM_PATH || undefined;

const browser = await chromium.launch({ executablePath });

async function render(art, width, height, out, scale = 1) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.goto(`${base}/icon.html?art=${art}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width, height } });
  await page.close();
  console.log('✓', out.replace(appDir + '/', ''));
}

const pub = join(appDir, 'public');
const assets = join(appDir, 'assets');
// Sources haute définition (stores, Capacitor).
await render('icon', 1024, 1024, join(assets, 'icon-only.png'));
await render('maskable', 1024, 1024, join(assets, 'icon-foreground.png'));
await render('splash', 2732, 2732, join(assets, 'splash.png'));
// Web / PWA.
await render('icon', 1024, 1024, join(pub, 'icons/icon-512.png'), 0.5);
await render('icon', 1024, 1024, join(pub, 'icons/icon-192.png'), 0.1875);
await render('maskable', 1024, 1024, join(pub, 'icons/icon-maskable-512.png'), 0.5);
await render('icon', 1024, 1024, join(pub, 'icons/apple-touch-icon.png'), 0.17578125);
await render('og', 1200, 630, join(pub, 'og-image.png'));

// Icône vectorielle pour les navigateurs.
const star = (cx, cy, o, i) =>
  Array.from({ length: 16 }, (_, k) => {
    const r = k % 2 ? i : o;
    const a = (Math.PI / 8) * k - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
writeFileSync(
  join(pub, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2a1670"/><circle cx="32" cy="33" r="27" fill="#7a4a00"/><circle cx="32" cy="32" r="27" fill="#f5b820"/><circle cx="32" cy="32" r="23.5" fill="none" stroke="#fffbe0" stroke-width="6" stroke-dasharray="6.7 8.1"/><circle cx="32" cy="32" r="18" fill="#d1241a" stroke="#7a4a00" stroke-width="1.2"/><polygon points="${star(32, 32, 11, 6.6)}" fill="#ffd54a" stroke="#7a4a00" stroke-width="0.8"/></svg>\n`,
);
console.log('✓ public/favicon.svg');
await browser.close();

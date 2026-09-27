// Test de bout en bout : le serveur construit sert la version web, deux navigateurs jouent.
// Prérequis : `npm run build -w @ronda/app && npm run build -w @ronda/server` et un Chromium
// (`npx playwright install chromium`, ou CHROMIUM_PATH=/chemin/vers/chrome).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.E2E_PORT ?? 8765);
const base = `http://127.0.0.1:${port}`;
const dataDir = mkdtempSync(join(tmpdir(), 'ronda-e2e-'));
const errors = [];

const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', join(root, 'server/dist/server.js')], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, STATIC_DIR: join(root, 'app/dist'), BOT_FILL_MS: '1500', ANIMATION_SCALE: '0.3' },
  stdio: ['ignore', 'inherit', 'inherit'],
});

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/health`)).ok) return;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('le serveur ne démarre pas');
}

const settings = (name, extra = {}) => ({
  state: {
    lang: 'fr',
    name,
    avatar: 1,
    onboarded: true,
    music: false,
    sound: false,
    confirmPlay: false,
    speed: 'fast',
    offline: { mode: '2v2', level: 'easy', target: 21, chain: true },
    localStats: { played: 0, won: 0 },
    cardBack: 'back-zellige',
    table: 'table-riad',
    gamesSinceInterstitial: 0,
    vibration: false,
    serverUrl: '',
    ...extra,
  },
  version: 1,
});

async function newPage(browser, initialSettings) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('WebSocket') && !m.text().includes('Failed to load resource')) {
      errors.push(`console: ${m.text()}`);
    }
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`HTTP ${r.status()} : ${r.url()}`);
  });
  if (initialSettings) {
    await page.addInitScript((s) => localStorage.setItem('ronda:settings', JSON.stringify(s)), initialSettings);
  }
  return page;
}

async function step(name, fn) {
  const t0 = Date.now();
  await fn();
  console.log(`✓ ${name} (${Date.now() - t0} ms)`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  await step('hors ligne : une partie démarre et le joueur joue une carte', async () => {
    const page = await newPage(browser, settings('Solo'));
    await page.goto(base);
    await page.locator('.mode-card.offline').click();
    await page.locator('.btn-gold.btn-lg').click();
    await page.waitForSelector('.game');
    await page.waitForSelector('.turn-hint.mine', { timeout: 20_000 });
    const before = await page.locator('.hand .pcard').count();
    await page.locator('.hand .pcard').first().click();
    await page.waitForFunction((n) => document.querySelectorAll('.hand .pcard').length < n, before, { timeout: 10_000 });
    await page.context().close();
  });

  await step('amis : table créée, nouveau joueur invité par lien, partie lancée pour les deux', async () => {
    const host = await newPage(browser, settings('Hote'));
    await host.goto(base);
    await host.getByText('Jouer avec des amis', { exact: true }).click();
    await host.getByRole('button', { name: 'Créer la table' }).click();
    const code = (await host.locator('.room-code .code').textContent()).trim();

    const guest = await newPage(browser, null);
    await guest.goto(`${base}/join/${code}`);
    await guest.getByText('Jouer dans le navigateur').click();
    await guest.locator('input.input').fill('Invite');
    await guest.getByRole('button', { name: /C’est parti/ }).click();
    await guest.waitForSelector('.room-code .code');
    await host.waitForFunction(() => document.body.innerText.includes('Invite'));

    await host.getByRole('button', { name: 'Lancer la partie' }).click();
    await host.waitForSelector('.game');
    await guest.waitForSelector('.game');
    // Chacun voit l'autre à la table.
    await host.waitForFunction(() => document.body.innerText.includes('Invite'));
    await guest.waitForFunction(() => document.body.innerText.includes('Hote'));
    await host.context().close();
    await guest.context().close();
  });

  await step('en ligne : file d’attente complétée par des bots signalés', async () => {
    const page = await newPage(browser, settings('Solitaire'));
    await page.goto(base);
    await page.getByText('Jouer en ligne', { exact: true }).click();
    await page.locator('.city-card').first().click();
    await page.waitForSelector('.game', { timeout: 15_000 });
    await page.waitForSelector('.bot-tag');
    await page.context().close();
  });

  if (errors.length) throw new Error(`erreurs dans la page :\n${errors.join('\n')}`);
  console.log('Tous les parcours sont passés.');
} catch (err) {
  console.error('✗', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  rmSync(dataDir, { recursive: true, force: true });
}

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { WebSocketServer } from 'ws';
import type { ServerConfig } from './config';
import { Hub } from './hub';
import { lanUrls } from './network';
import { partyPage } from './party';
import { openStore, type Store } from './store';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

export interface GameServer {
  http: Server;
  hub: Hub;
  store: Store;
  /** Démarre l'écoute (port de la configuration par défaut) ; échoue si le port est pris. */
  listen(port?: number): Promise<number>;
  close(): Promise<void>;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function readBody(req: IncomingMessage, limit = 64 * 1024): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

/** Page d'invitation partagée sur WhatsApp : ouvre l'appli, les stores ou la version web. */
function invitePage(config: ServerConfig, code: string): string {
  const safe = escapeHtml(code);
  const appLink = `${config.appScheme}://join/${safe}`;
  const webLink = `/?join=${safe}`;
  const stores = [
    config.playStoreUrl ? `<a class="btn ghost" href="${escapeHtml(config.playStoreUrl)}">Google Play</a>` : '',
    config.appStoreUrl ? `<a class="btn ghost" href="${escapeHtml(config.appStoreUrl)}">App Store</a>` : '',
  ].join('');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Rejoins ma table de Ronda ! Code ${safe}</title>
<meta property="og:title" content="Rejoins ma table de Ronda ! 🃏" />
<meta property="og:description" content="Code de la table : ${safe}. Ronda Dyalna — le jeu de cartes marocain en ligne." />
<meta property="og:image" content="/og-image.png" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif;
    background: radial-gradient(circle at 50% 30%, #146b52, #06261d); color: #fdf6e3; }
  .card { width: min(92vw, 420px); padding: 28px 22px; border-radius: 22px; text-align: center;
    background: rgba(0,0,0,.25); border: 1px solid rgba(232,184,74,.5); }
  h1 { margin: 0 0 6px; font-size: 26px; } p { opacity: .85; }
  .code { font-size: 40px; letter-spacing: 8px; font-weight: 800; color: #f2c75c; margin: 14px 0 20px; }
  .btn { display: block; margin: 10px 0; padding: 14px; border-radius: 14px; background: #e8b84a; color: #2a1a05;
    font-weight: 700; text-decoration: none; }
  .ghost { background: transparent; color: #fdf6e3; border: 1px solid rgba(253,246,227,.4); }
</style>
</head>
<body>
<main class="card">
  <h1>Ronda Dyalna 🃏</h1>
  <p>On t'attend à la table !</p>
  <div class="code">${safe}</div>
  <a class="btn" href="${appLink}">Ouvrir dans l'application</a>
  <a class="btn ghost" href="${webLink}">Jouer dans le navigateur</a>
  ${stores}
</main>
</body>
</html>`;
}

export function createGameServer(config: ServerConfig, store: Store = openStore(config.dataDir)): GameServer {
  const hub = new Hub(config, store);
  const staticRoot = config.staticDir && existsSync(config.staticDir) ? resolve(config.staticDir) : '';

  function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
    if (!staticRoot) return false;
    const target = normalize(join(staticRoot, decodeURIComponent(pathname)));
    if (target !== staticRoot && !target.startsWith(staticRoot + sep)) return false;
    let file = target;
    if (!existsSync(file) || statSync(file).isDirectory()) {
      const wantsHtml = (req.headers.accept ?? '').includes('text/html');
      if (!wantsHtml || extname(pathname)) return false;
      file = join(staticRoot, 'index.html');
      if (!existsSync(file)) return false;
    }
    const ext = extname(file);
    const immutable = pathname.startsWith('/assets/');
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    createReadStream(file).pipe(res);
    return true;
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    if (path === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }
    if (path === '/api/status') {
      return json(res, 200, config.localParty ? { ...hub.status(), lan: lanUrls(currentPort()) } : hub.status());
    }
    if (path === '/soiree' && config.localParty) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(partyPage(lanUrls(currentPort()), `http://localhost:${currentPort()}`));
      return;
    }
    if (path === '/api/leaderboard') return json(res, 200, hub.leaderboard());
    if (path === '/webhooks/revenuecat' && req.method === 'POST') {
      const auth = req.headers.authorization ?? '';
      if (!config.revenueCatSecret || (auth !== config.revenueCatSecret && auth !== `Bearer ${config.revenueCatSecret}`)) {
        return json(res, 401, { error: 'unauthorized' });
      }
      try {
        const body = JSON.parse(await readBody(req)) as { event?: Record<string, unknown> };
        const e = body.event ?? {};
        const type = String(e.type ?? '');
        if (['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE'].includes(type)) {
          const err = hub.grantPurchase(String(e.app_user_id ?? ''), String(e.product_id ?? ''), String(e.transaction_id ?? e.id ?? ''));
          if (err) return json(res, 400, { error: err });
        }
        return json(res, 200, { ok: true });
      } catch {
        return json(res, 400, { error: 'bad_request' });
      }
    }
    const join = /^\/join\/([A-Za-z0-9]{4,8})\/?$/.exec(path);
    if (join) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
      res.end(invitePage(config, join[1].toUpperCase()));
      return;
    }
    if (path === '/.well-known/assetlinks.json' && process.env.ANDROID_CERT_SHA256) {
      return json(res, 200, [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: process.env.ANDROID_PACKAGE ?? 'com.rondadyalna.app',
            sha256_cert_fingerprints: process.env.ANDROID_CERT_SHA256.split(','),
          },
        },
      ]);
    }
    if (path === '/.well-known/apple-app-site-association' && process.env.IOS_APP_ID) {
      return json(res, 200, { applinks: { details: [{ appIDs: [process.env.IOS_APP_ID], components: [{ '/': '/join/*' }] }] } });
    }
    if (req.method === 'GET' && serveStatic(req, res, path)) return;
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }

  const currentPort = () => (http.address() as AddressInfo | null)?.port ?? config.port;

  const http = createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('[http]', err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
  http.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }
    const forwarded = config.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '';
    const ip = forwarded || req.socket.remoteAddress || '';
    wss.handleUpgrade(req, socket, head, (ws) => hub.attach(ws, ip));
  });

  const heartbeat = setInterval(() => hub.heartbeat(), 30_000);
  heartbeat.unref();

  return {
    http,
    hub,
    store,
    listen: (port = config.port) =>
      new Promise((resolveListen, rejectListen) => {
        const onError = (err: Error) => {
          http.off('listening', onListening);
          rejectListen(err);
        };
        const onListening = () => {
          http.off('error', onError);
          resolveListen((http.address() as AddressInfo).port);
        };
        http.once('error', onError);
        http.once('listening', onListening);
        http.listen(port, config.host);
      }),
    close: () =>
      new Promise((resolveClose) => {
        clearInterval(heartbeat);
        hub.close();
        wss.close();
        store.close();
        http.close(() => resolveClose());
        http.closeAllConnections();
      }),
  };
}

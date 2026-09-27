import { spawn } from 'node:child_process';
import { loadConfig } from './config';
import { lanUrls } from './network';
import { createGameServer } from './server';

const config = loadConfig();
const server = createGameServer(config);

/** Soirée entre amis : si le port est déjà pris par un autre programme, on essaie les suivants. */
async function listen(): Promise<number> {
  const attempts = config.localParty ? 10 : 1;
  for (let i = 0; ; i++) {
    try {
      return await server.listen(config.port + i);
    } catch (err) {
      const busy = (err as NodeJS.ErrnoException).code === 'EADDRINUSE';
      if (!busy || i + 1 >= attempts) {
        if (busy) console.error(`[ronda] le port ${config.port} est déjà utilisé : un autre serveur Ronda est peut-être ouvert ?`);
        throw err;
      }
    }
  }
}

/** Ouvre une adresse dans le navigateur par défaut (sans jamais faire échouer le serveur). */
function openBrowser(url: string): void {
  const [cmd, args] =
    process.platform === 'win32' ? ['explorer.exe', [url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => undefined);
    child.unref();
  } catch {
    /* pas de navigateur : l'adresse est affichée dans la fenêtre */
  }
}

const port = await listen();
if (config.localParty) {
  const urls = lanUrls(port);
  const line = '='.repeat(62);
  console.log(`\n${line}\n  RONDA DYALNA : la soirée est prête !\n${line}`);
  if (urls.length) {
    console.log('\n  Sur les téléphones (connectés au MÊME Wi-Fi), ouvrez :\n');
    console.log(`        ${urls[0]}\n`);
    if (urls.length > 1) console.log(`  (si ça ne marche pas, essayez : ${urls.slice(1).join('  ou  ')})\n`);
    console.log('  Une page avec un QR code à scanner s’ouvre sur cet ordinateur.');
  } else {
    console.log('\n  Aucun Wi-Fi détecté : connectez cet ordinateur au Wi-Fi puis relancez.');
    console.log(`  Pour jouer seul ici : http://localhost:${port}`);
  }
  console.log('  Laissez cette fenêtre ouverte pendant la partie. Pour arrêter : fermez-la.\n');
  if (process.env.OPEN_BROWSER !== '0') openBrowser(`http://localhost:${port}/soiree`);
} else {
  console.log(`[ronda] serveur prêt sur http://${config.host}:${port} (WebSocket : /ws)`);
  if (config.staticDir) console.log(`[ronda] application web servie depuis ${config.staticDir}`);
}

let stopping = false;
async function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`[ronda] arrêt (${signal}), sauvegarde des profils…`);
  await server.close();
  process.exit(0);
}
process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));
// Windows : fermeture de la fenêtre du serveur.
process.on('SIGHUP', () => void stop('SIGHUP'));

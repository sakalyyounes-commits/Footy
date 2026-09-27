import { loadConfig } from './config';
import { createGameServer } from './server';

const config = loadConfig();
const server = createGameServer(config);
const port = await server.listen();
console.log(`[ronda] serveur prêt sur http://${config.host}:${port} (WebSocket : /ws)`);
if (config.staticDir) console.log(`[ronda] application web servie depuis ${config.staticDir}`);

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

import { chooseCard, type BotLevel, type Card, type PlayerView } from '@ronda/core';

let worker: Worker | null = null;
let workerFailed = false;
let seq = 0;
const pending = new Map<number, (card: Card) => void>();

function getWorker(): Worker | null {
  if (worker || workerFailed) return worker;
  try {
    worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; card: Card }>) => {
      pending.get(e.data.id)?.(e.data.card);
      pending.delete(e.data.id);
    };
    worker.onerror = () => {
      workerFailed = true;
      worker?.terminate();
      worker = null;
    };
  } catch {
    workerFailed = true;
    worker = null;
  }
  return worker;
}

/** Choix d'un bot, calculé hors du fil principal quand c'est possible. */
export function computeBotCard(view: PlayerView, level: BotLevel): Promise<Card> {
  const w = getWorker();
  if (!w) return Promise.resolve(chooseCard(view, level, { samples: 50 }));
  return new Promise((resolve) => {
    const id = ++seq;
    let done = false;
    const finish = (card: Card) => {
      if (done) return;
      done = true;
      resolve(card);
    };
    pending.set(id, finish);
    w.postMessage({ id, view, level });
    // Filet de sécurité : si le worker ne répond pas, on calcule ici.
    setTimeout(() => {
      if (!done) {
        pending.delete(id);
        finish(chooseCard(view, 'medium'));
      }
    }, 4_000);
  });
}

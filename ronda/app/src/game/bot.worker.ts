/// <reference lib="webworker" />
import { chooseCard, createRng, randomSeed, type BotLevel, type PlayerView } from '@ronda/core';

// Le bot expert réfléchit dans un Web Worker pour ne jamais saccader les animations.
self.onmessage = (e: MessageEvent<{ id: number; view: PlayerView; level: BotLevel }>) => {
  const { id, view, level } = e.data;
  const card = chooseCard(view, level, { rng: createRng(randomSeed()), samples: 80 });
  (self as unknown as Worker).postMessage({ id, card });
};

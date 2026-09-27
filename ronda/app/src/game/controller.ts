import { stepDuration, teamOf, type Card, type GameEvent, type PlayerView } from '@ronda/core';
import { sfx } from '../audio/audio';
import { t } from '../i18n';
import { vibrate } from '../platform/native';
import { useSettings } from '../store/settings';
import type { Banner, Bubble, Floater, GameDisplay } from './types';

export interface DisplayStep {
  event: GameEvent;
  view: PlayerView;
}

const BANNER_MS: Record<Banner['kind'], number> = {
  darba: 1_300,
  missa: 1_200,
  lastDeal: 1_100,
  announce: 2_300,
  sweep: 1_200,
};

/**
 * Base commune des parties locales et en ligne : les étapes du moteur sont jouées une par une,
 * au rythme des animations, avec les sons, vibrations et bandeaux qui vont avec.
 */
export abstract class GameController {
  protected d: GameDisplay;
  private listeners = new Set<() => void>();
  private queue: DisplayStep[] = [];
  private pumping = false;
  protected disposed = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private nextId = 1;

  constructor(initial: GameDisplay) {
    this.d = initial;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = (): GameDisplay => this.d;

  get display(): GameDisplay {
    return this.d;
  }

  protected update(patch: Partial<GameDisplay>): void {
    if (this.disposed) return;
    this.d = { ...this.d, ...patch };
    for (const l of this.listeners) l();
  }

  protected after(ms: number, fn: () => void): void {
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(id);
  }

  protected wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.after(ms, resolve));
  }

  protected id(): number {
    return this.nextId++;
  }

  protected get isPumping(): boolean {
    return this.pumping;
  }

  protected enqueue(steps: DisplayStep[]): void {
    if (!steps.length) return;
    this.queue.push(...steps);
    if (!this.pumping) void this.pump();
  }

  protected clearQueue(): void {
    this.queue = [];
  }

  private speed(): number {
    return useSettings.getState().speed === 'fast' ? 0.6 : 1;
  }

  private async pump(): Promise<void> {
    this.pumping = true;
    this.update({ busy: true });
    while (this.queue.length && !this.disposed) {
      const step = this.queue.shift()!;
      this.present(step);
      const ms = stepDuration(step.event) * this.speed();
      if (ms > 0) await this.wait(ms);
    }
    this.pumping = false;
    if (this.disposed) return;
    this.update({ busy: false });
    this.onIdle();
  }

  protected showBanner(banner: Banner): void {
    this.update({ banner });
    this.after(BANNER_MS[banner.kind] * this.speed(), () => {
      if (this.d.banner?.id === banner.id) this.update({ banner: null });
    });
  }

  protected addFloater(f: Omit<Floater, 'id'>): void {
    const floater = { ...f, id: this.id() };
    this.update({ floaters: [...this.d.floaters, floater] });
    this.after(1_500, () => this.update({ floaters: this.d.floaters.filter((x) => x.id !== floater.id) }));
  }

  protected addBubble(b: Omit<Bubble, 'id'>): void {
    const bubble = { ...b, id: this.id() };
    this.update({ bubbles: [...this.d.bubbles.filter((x) => x.seat !== b.seat), bubble] });
    this.after(b.announce ? 1_800 : 2_600, () => this.update({ bubbles: this.d.bubbles.filter((x) => x.id !== bubble.id) }));
  }

  /** Applique une étape à l'affichage et déclenche ses effets. */
  protected present(step: DisplayStep): void {
    const e = step.event;
    const me = this.d.me;
    const myTeam = teamOf(me);
    const patch: Partial<GameDisplay> = { view: step.view, lastEvent: e };
    switch (e.type) {
      case 'roundStart':
        patch.summary = null;
        patch.lastPlay = null;
        break;
      case 'deal':
        sfx('deal');
        if (e.last && e.dealNo > 1) this.showBanner({ id: this.id(), kind: 'lastDeal' });
        break;
      case 'announce': {
        const tringa = e.kinds.includes('tringa');
        const count = e.kinds.length;
        this.addBubble({
          seat: e.seat,
          text: tringa ? t('game.tringa') : count > 1 ? `${t('game.ronda')} ×${count}` : t('game.ronda'),
          announce: true,
        });
        sfx('bell');
        break;
      }
      case 'announceResult':
        if (e.entries.length) this.showBanner({ id: this.id(), kind: 'announce', entries: e.entries, winners: e.winners, points: e.points });
        break;
      case 'play':
        patch.lastPlay = { seat: e.seat, card: e.card };
        if (e.seat === me) patch.pendingPlay = null;
        sfx('card');
        if (e.seat === me) vibrate('light');
        break;
      case 'capture':
      case 'collect':
        sfx('capture');
        break;
      case 'darba': {
        const points = step.view.rules.darbaPoints[e.level - 1];
        this.showBanner({ id: this.id(), kind: 'darba', seat: e.seat, level: e.level, points });
        sfx(e.level === 1 ? 'darba' : 'escalate');
        vibrate(teamOf(e.seat) === myTeam ? 'success' : 'heavy');
        break;
      }
      case 'missa':
        this.showBanner({ id: this.id(), kind: 'missa', seat: e.seat, points: step.view.rules.missaPoints });
        sfx('missa');
        vibrate('medium');
        break;
      case 'points':
        this.addFloater({ seat: e.seat, team: e.team, points: e.points, reason: e.reason });
        if (e.team === myTeam) sfx('coin');
        break;
      case 'sweep':
        this.showBanner({ id: this.id(), kind: 'sweep', seat: e.seat, count: e.cards.length });
        sfx('capture');
        break;
      case 'roundEnd':
        patch.summary = { round: step.view.round, counts: e.counts, points: e.points, scores: e.scores };
        break;
      case 'gameOver': {
        const won = e.winner === myTeam;
        patch.summary = null;
        patch.result = {
          winner: e.winner,
          scores: e.scores,
          won,
          coins: this.d.result?.coins ?? null,
          xp: this.d.result?.xp ?? null,
          levelUp: this.d.result?.levelUp ?? null,
          forfeit: false,
        };
        sfx(won ? 'win' : 'lose');
        vibrate(won ? 'success' : 'warning');
        break;
      }
      case 'turn':
        if (e.seat === me) {
          sfx('turn');
          vibrate('light');
        }
        break;
    }
    this.update(patch);
  }

  /** Appelé quand toutes les animations sont jouées. */
  protected abstract onIdle(): void;

  /** Le joueur local joue une carte ; renvoie false si ce n'est pas possible maintenant. */
  abstract play(card: Card): boolean;
  abstract emote(id: string): void;
  /** Quitter la partie (abandon en ligne, sauvegarde hors ligne). */
  abstract leave(): void;

  canPlay(): boolean {
    const { view, busy, pendingPlay, result } = this.d;
    return !busy && !pendingPlay && !result && view.phase === 'play' && view.turn === this.d.me && view.hand.length > 0;
  }

  dispose(): void {
    this.disposed = true;
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    this.listeners.clear();
  }
}

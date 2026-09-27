import {
  applyPlay,
  BOT_PERSONAS,
  makeRules,
  modePlayers,
  newGame,
  nextRound,
  PHRASES,
  teamOf,
  viewFor,
  type BotLevel,
  type Card,
  type GameState,
  type Mode,
  type Step,
} from '@ronda/core';
import { t } from '../i18n';
import { useSettings, type OfflineSetup } from '../store/settings';
import { computeBotCard } from './botClient';
import { GameController, type DisplayStep } from './controller';
import type { SeatDisplay } from './types';

const SAVE_KEY = 'ronda:offline-save';
const ME = 0;

const BOT_LEVEL_RANGE: Record<BotLevel, [number, number]> = { easy: [1, 4], medium: [5, 12], hard: [14, 30] };

interface SavedGame {
  setup: OfflineSetup;
  seats: SeatDisplay[];
  state: GameState;
}

export function loadSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedGame;
    if (!saved.state || saved.state.phase === 'gameOver') return null;
    return saved;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* rien */
  }
}

function makeSeats(mode: Mode, level: BotLevel): SeatDisplay[] {
  const { name, avatar } = useSettings.getState();
  const players = modePlayers(mode);
  const personas = BOT_PERSONAS.filter((p) => p.avatar !== avatar).sort(() => Math.random() - 0.5);
  const [lo, hi] = BOT_LEVEL_RANGE[level];
  return Array.from({ length: players }, (_, seat) =>
    seat === ME
      ? { seat, name: name || t('common.you'), avatar, level: 1, frame: 'frame-none', vip: false, bot: null, connected: true, auto: false, isMe: true }
      : {
          seat,
          name: personas[seat].name,
          avatar: personas[seat].avatar,
          level: lo + Math.floor(Math.random() * (hi - lo + 1)),
          frame: 'frame-none',
          vip: false,
          bot: level,
          connected: true,
          auto: false,
          isMe: false,
        },
  );
}

function toDisplay(steps: Step[]): DisplayStep[] {
  return steps.map((st) => ({ event: st.event, view: viewFor(st.state, ME) }));
}

/** Partie hors ligne contre des bots : tout se passe sur le téléphone, sans Internet. */
export class LocalController extends GameController {
  private state: GameState;
  readonly setup: OfflineSetup;
  private thinking = false;
  private finished = false;

  constructor(setup: OfflineSetup, saved?: SavedGame) {
    const players = modePlayers(setup.mode);
    const rules = makeRules(players, { target: setup.target, darbaChain: setup.chain });
    const seats = saved?.seats ?? makeSeats(setup.mode, setup.level);
    let state: GameState;
    let steps: Step[] = [];
    if (saved) {
      state = saved.state;
    } else {
      const tr = newGame(rules, { dealer: Math.floor(Math.random() * players) });
      state = tr.state;
      steps = tr.steps;
    }
    const { cardBack, table } = useSettings.getState();
    super({
      kind: 'local',
      mode: setup.mode,
      me: ME,
      // Nouvelle partie : on part de la table vide pour voir la distribution.
      view: viewFor(steps[0]?.state ?? state, ME),
      seats,
      lastEvent: null,
      lastPlay: null,
      deadline: null,
      turnMs: 0,
      banner: null,
      floaters: [],
      bubbles: [],
      summary: null,
      result: null,
      busy: false,
      pendingPlay: null,
      netStatus: 'ok',
      stake: 0,
      tableId: null,
      cardBack,
      table,
    });
    this.setup = setup;
    this.state = state;
    if (saved) {
      if (state.phase === 'roundEnd') this.after(300, () => this.continueRound());
      else this.after(300, () => this.onIdle());
    } else {
      this.enqueue(toDisplay(steps));
    }
  }

  private save(): void {
    try {
      if (this.state.phase === 'gameOver') clearSavedGame();
      else localStorage.setItem(SAVE_KEY, JSON.stringify({ setup: this.setup, seats: this.d.seats, state: this.state } satisfies SavedGame));
    } catch {
      /* stockage plein : tant pis pour la sauvegarde */
    }
  }

  protected onIdle(): void {
    const s = this.state;
    if (s.phase === 'gameOver') {
      this.finish();
      return;
    }
    if (s.phase === 'roundEnd') {
      // Le récapitulatif reste affiché ; la manche suivante démarre au toucher ou après 7 s.
      const round = s.round;
      this.after(7_000, () => {
        if (this.state.phase === 'roundEnd' && this.state.round === round) this.continueRound();
      });
      return;
    }
    if (s.turn !== ME && !this.thinking) void this.botMove();
  }

  private async botMove(): Promise<void> {
    const s = this.state;
    const seat = s.turn;
    const level = this.d.seats[seat].bot ?? 'medium';
    this.thinking = true;
    const started = Date.now();
    const card = await computeBotCard(viewFor(s, seat), level);
    const think = 450 + Math.random() * 650;
    const elapsed = Date.now() - started;
    if (elapsed < think) await this.wait(think - elapsed);
    this.thinking = false;
    if (this.disposed || this.state !== s) return;
    const tr = applyPlay(s, seat, card);
    this.state = tr.state;
    this.save();
    this.maybeBotEmote(tr.steps);
    this.enqueue(toDisplay(tr.steps));
  }

  /** Les bots réagissent de temps en temps, comme de vrais joueurs. */
  private maybeBotEmote(steps: Step[]): void {
    for (const { event } of steps) {
      if (event.type !== 'darba' || Math.random() > 0.45) continue;
      const actor = event.seat;
      const victim = event.victim;
      const pickPhrase = (options: string[]) => options[Math.floor(Math.random() * options.length)];
      if (actor !== ME && Math.random() < 0.6) {
        const phrase = pickPhrase(['hak', 'hhh', 'zwina', 'yallah']);
        this.after(900, () => this.addBubble({ seat: actor, text: t(`phrase.${phrase}` as 'phrase.hak') }));
      } else if (victim !== ME) {
        const phrase = pickPhrase(['ma3lich', 'tbarkellah', 'm3allem']);
        this.after(900, () => this.addBubble({ seat: victim, text: t(`phrase.${phrase}` as 'phrase.hak') }));
      }
    }
  }

  play(card: Card): boolean {
    if (!this.canPlay() || this.state.turn !== ME) return false;
    let tr;
    try {
      tr = applyPlay(this.state, ME, card);
    } catch {
      return false;
    }
    this.state = tr.state;
    this.save();
    this.enqueue(toDisplay(tr.steps));
    return true;
  }

  continueRound(): void {
    if (this.state.phase !== 'roundEnd' || this.isPumping) return;
    const tr = nextRound(this.state);
    this.state = tr.state;
    this.save();
    this.update({ summary: null });
    this.enqueue(toDisplay(tr.steps));
  }

  emote(id: string): void {
    if (!PHRASES.includes(id) && !/\p{Extended_Pictographic}/u.test(id)) return;
    const text = PHRASES.includes(id) ? t(`phrase.${id}` as 'phrase.salam') : id;
    this.addBubble({ seat: ME, text });
    // Un bot répond parfois.
    if (Math.random() < 0.5) {
      const others = this.d.seats.filter((s) => !s.isMe);
      const who = others[Math.floor(Math.random() * others.length)];
      const reply = ['salam', 'yallah', 'hhh', 'bslama', 'tbarkellah'][Math.floor(Math.random() * 5)];
      this.after(1_200 + Math.random() * 800, () => this.addBubble({ seat: who.seat, text: t(`phrase.${reply}` as 'phrase.salam') }));
    }
  }

  leave(): void {
    this.save();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    clearSavedGame();
    const won = this.state.winner === teamOf(ME);
    const { localStats, set } = useSettings.getState();
    set({ localStats: { played: localStats.played + 1, won: localStats.won + (won ? 1 : 0) } });
  }
}

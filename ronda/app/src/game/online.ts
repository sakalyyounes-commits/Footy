import { teamOf, type Card, type MatchInfo, type PlayerView, type SeatInfo, type ServerMessage } from '@ronda/core';
import { connection } from '../net/connection';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { t } from '../i18n';
import { toast } from '../store/toast';
import { GameController } from './controller';
import type { SeatDisplay } from './types';

function seatDisplay(info: SeatInfo, me: number): SeatDisplay {
  return {
    seat: info.seat,
    name: info.player?.name ?? t('common.bot'),
    avatar: info.player?.avatar ?? 0,
    level: info.player?.level ?? 1,
    frame: info.player?.frame ?? 'frame-none',
    vip: info.player?.vip ?? false,
    bot: info.bot,
    connected: info.connected,
    auto: info.auto,
    isMe: info.seat === me,
  };
}

/** Partie en ligne : le serveur décide, le téléphone anime ce qu'il reçoit. */
export class OnlineController extends GameController {
  private info: MatchInfo;
  private unsubscribe: Array<() => void> = [];
  /** Échéance (heure serveur) à afficher quand les animations en cours seront finies. */
  private pendingDeadline: number | null = null;
  private endMsg: Extract<ServerMessage, { t: 'match.end' }> | null = null;

  constructor(info: MatchInfo, view: PlayerView, deadline: number | null) {
    const profile = useSession.getState().profile;
    const settings = useSettings.getState();
    super({
      kind: 'online',
      mode: info.mode,
      me: info.seat,
      view,
      seats: info.seats.map((s) => seatDisplay(s, info.seat)),
      lastEvent: null,
      lastPlay: null,
      deadline: null,
      turnMs: info.turnMs,
      banner: null,
      draw: null,
      floaters: [],
      bubbles: [],
      summary: null,
      result: null,
      busy: false,
      pendingPlay: null,
      netStatus: 'ok',
      stake: info.stake,
      tableId: info.tableId,
      cardBack: profile?.equipped.cardBack ?? settings.cardBack,
      table: profile?.equipped.table ?? settings.table,
    });
    this.info = info;
    this.pendingDeadline = deadline;
    this.unsubscribe.push(connection.on((msg) => this.handle(msg)));
    this.unsubscribe.push(
      connection.onStatus((status) => this.update({ netStatus: status === 'online' ? 'ok' : 'reconnecting' })),
    );
    if (deadline) this.update({ deadline: this.toLocal(deadline) });
  }

  get matchId(): string {
    return this.info.matchId;
  }

  private toLocal(serverTime: number | null): number | null {
    return serverTime === null ? null : serverTime - connection.clockOffset;
  }

  private handle(msg: ServerMessage): void {
    switch (msg.t) {
      case 'match.steps':
        this.pendingDeadline = msg.deadline;
        this.update({ deadline: null });
        this.enqueue(msg.steps.map((s) => ({ event: s.event, view: s.view })));
        break;
      case 'match.sync':
        if (msg.match.matchId !== this.info.matchId) return;
        this.info = msg.match;
        this.clearQueue();
        this.update({
          view: msg.view,
          seats: msg.match.seats.map((s) => seatDisplay(s, msg.match.seat)),
          pendingPlay: null,
          deadline: this.toLocal(msg.deadline),
          banner: null,
          draw: null,
        });
        break;
      case 'match.seat':
        this.update({ seats: this.d.seats.map((s) => (s.seat === msg.info.seat ? seatDisplay(msg.info, this.d.me) : s)) });
        break;
      case 'match.emote': {
        const text = msg.id.length <= 4 ? msg.id : t(`phrase.${msg.id}` as 'phrase.salam');
        this.addBubble({ seat: msg.seat, text });
        break;
      }
      case 'match.end':
        this.endMsg = msg;
        if (!this.isPumping) this.showEnd();
        break;
      case 'error':
        if (msg.code === 'illegal_move' || msg.code === 'not_in_match') this.update({ pendingPlay: null });
        break;
    }
  }

  protected onIdle(): void {
    this.update({ deadline: this.toLocal(this.pendingDeadline) });
    if (this.endMsg) this.showEnd();
  }

  private showEnd(): void {
    const msg = this.endMsg;
    if (!msg) return;
    const r = msg.result;
    const won = r.winnerTeam !== null && r.winnerTeam === teamOf(this.d.me) && !r.forfeit;
    this.update({
      summary: null,
      deadline: null,
      result: {
        winner: r.winnerTeam,
        scores: r.scores,
        won,
        coins: r.coins,
        xp: r.xp,
        levelUp: r.levelUp,
        forfeit: r.forfeit,
        rematch: r.rematch ?? null,
      },
    });
  }

  play(card: Card): boolean {
    if (!this.canPlay()) return false;
    const sent = connection.send({ t: 'play', card, move: this.d.view.moveCount });
    if (!sent) {
      toast(t('err.offline'), 'error');
      return false;
    }
    this.update({ pendingPlay: card, deadline: null });
    return true;
  }

  emote(id: string): void {
    connection.send({ t: 'emote', id });
  }

  resumeControl(): void {
    connection.send({ t: 'match.resume' });
  }

  leave(): void {
    if (!this.d.result) connection.send({ t: 'match.leave' });
  }

  override dispose(): void {
    for (const u of this.unsubscribe) u();
    this.unsubscribe = [];
    super.dispose();
  }
}

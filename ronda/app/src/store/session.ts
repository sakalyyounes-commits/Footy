import { create } from 'zustand';
import type { LeaderboardEntry, Mode, Profile, RoomState, ServerMessage } from '@ronda/core';
import { sfx } from '../audio/audio';
import type { GameController } from '../game/controller';
import { t, type TranslationKey } from '../i18n';
import { connection, type ConnStatus } from '../net/connection';
import { useNav } from './nav';
import { useSettings } from './settings';
import { toast } from './toast';

const PROFILE_CACHE = 'ronda:profile';

function cachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

interface SessionState {
  status: ConnStatus;
  /** Profil en ligne (dernier connu, même hors connexion). */
  profile: Profile | null;
  online: number;
  queue: { mode: Mode; tableId: string; since: number } | null;
  room: RoomState | null;
  game: GameController | null;
  leaderboard: LeaderboardEntry[] | null;
  setGame: (game: GameController | null) => void;
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'idle',
  profile: cachedProfile(),
  online: 0,
  queue: null,
  room: null,
  game: null,
  leaderboard: null,
  setGame: (game) => {
    const previous = get().game;
    if (previous && previous !== game) previous.dispose();
    set({ game });
  },
}));

function setProfile(profile: Profile): void {
  useSession.setState({ profile });
  try {
    localStorage.setItem(PROFILE_CACHE, JSON.stringify(profile));
  } catch {
    /* rien */
  }
}

const ERROR_KEYS: Record<string, TranslationKey> = {
  not_enough_coins: 'err.not_enough_coins',
  level_too_low: 'err.level_too_low',
  room_not_found: 'err.room_not_found',
  room_full: 'err.room_full',
  busy: 'err.busy',
  already_claimed: 'err.already_claimed',
  not_available: 'err.not_available',
  bad_name: 'err.bad_name',
  bad_code: 'err.bad_code',
  rate_limited: 'err.rate_limited',
  not_host: 'err.not_host',
  bad_version: 'err.bad_version',
  unknown_item: 'err.unknown_item',
};

let started = false;

/** Relie les messages du serveur à l'état de l'application (appelé une fois au démarrage). */
export function initSession(): void {
  if (started) return;
  started = true;
  connection.onStatus((status) => useSession.setState({ status }));
  connection.on(onMessage);
  connection.start();
}

async function openOnlineGame(msg: Extract<ServerMessage, { t: 'match.start' | 'match.sync' }>): Promise<void> {
  const { OnlineController } = await import('../game/online');
  const session = useSession.getState();
  const current = session.game as { matchId?: string } | null;
  if (msg.t === 'match.sync' && current?.matchId === msg.match.matchId) return;
  session.setGame(new OnlineController(msg.match, msg.view, msg.deadline));
  useSession.setState({ queue: null, room: null });
  useNav.getState().reset({ name: 'game' });
}

function onMessage(msg: ServerMessage): void {
  switch (msg.t) {
    case 'welcome': {
      setProfile(msg.profile);
      useSession.setState({ online: msg.online });
      // Le pseudo choisi sur le téléphone fait foi.
      const { name, avatar } = useSettings.getState();
      if ((name && name !== msg.profile.name) || avatar !== msg.profile.avatar) {
        connection.send({ t: 'profile.update', name: name || undefined, avatar });
      }
      break;
    }
    case 'profile':
      setProfile(msg.profile);
      break;
    case 'reward':
      setProfile(msg.profile);
      if (msg.coins > 0) {
        sfx('coin');
        toast(`+${msg.coins} ${t('common.coins')} 🪙`, 'success');
      } else if (msg.kind === 'referral') {
        toast(t('profile.referral_ok'), 'success');
      }
      break;
    case 'online':
      useSession.setState({ online: msg.count });
      break;
    case 'queue.status':
      useSession.setState({ queue: { mode: msg.mode, tableId: msg.tableId, since: msg.since } });
      break;
    case 'queue.left':
      useSession.setState({ queue: null });
      break;
    case 'room': {
      useSession.setState({ room: msg.room });
      const nav = useNav.getState();
      const top = nav.stack[nav.stack.length - 1];
      if (top.name !== 'room') nav.push({ name: 'room' });
      break;
    }
    case 'room.closed': {
      useSession.setState({ room: null });
      const nav = useNav.getState();
      if (nav.stack[nav.stack.length - 1].name === 'room') nav.pop();
      break;
    }
    case 'match.start':
    case 'match.sync':
      void openOnlineGame(msg);
      break;
    case 'match.end':
      if (msg.profile) setProfile(msg.profile);
      break;
    case 'leaderboard':
      useSession.setState({ leaderboard: msg.entries });
      break;
    case 'error': {
      if (msg.code === 'illegal_move' || msg.code === 'not_in_match') break;
      const key = ERROR_KEYS[msg.code] ?? 'err.generic';
      toast(t(key), 'error');
      break;
    }
  }
}

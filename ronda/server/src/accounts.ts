import { createHash, randomBytes, randomInt } from 'node:crypto';
import {
  AVATAR_COUNT,
  DEFAULT_EQUIPPED,
  levelForXp,
  sanitizeName,
  STARTING_COINS,
  type Profile,
  type PublicProfile,
} from '@ronda/core';
import type { Store } from './store';

/** Alphabet sans caractères ambigus (pas de 0/O, 1/I/L). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function todayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function isVip(p: Profile, now: number): boolean {
  return p.vipUntil !== null && p.vipUntil > now;
}

export function publicProfile(p: Profile, now = Date.now()): PublicProfile {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    level: levelForXp(p.xp),
    frame: p.equipped.frame,
    vip: isVip(p, now),
  };
}

/** Recalcule les champs dérivés avant envoi au client. */
export function freshProfile(p: Profile, now = Date.now()): Profile {
  return { ...p, level: levelForXp(p.xp), vip: isVip(p, now), frame: p.equipped.frame };
}

function uniqueCode(length: number, taken: (code: string) => boolean): string {
  for (;;) {
    const code = randomCode(length);
    if (!taken(code)) return code;
  }
}

export function createProfile(
  store: Store,
  opts: { name?: unknown; avatar?: unknown; now?: number } = {},
): { profile: Profile; token: string } {
  const now = opts.now ?? Date.now();
  const id = randomBytes(9).toString('base64url');
  const avatar =
    Number.isInteger(opts.avatar) && (opts.avatar as number) >= 0 && (opts.avatar as number) < AVATAR_COUNT
      ? (opts.avatar as number)
      : randomInt(AVATAR_COUNT);
  const transferCode = uniqueCode(10, (c) => store.profileIdForTransferCode(c) !== undefined);
  const referralCode = uniqueCode(6, (c) => store.profileIdForReferral(c) !== undefined);
  const profile: Profile = {
    id,
    name: sanitizeName(opts.name) ?? `Joueur ${randomInt(1000, 10000)}`,
    avatar,
    level: 1,
    frame: DEFAULT_EQUIPPED.frame,
    vip: false,
    coins: STARTING_COINS,
    xp: 0,
    stats: {
      played: 0,
      won: 0,
      played1v1: 0,
      won1v1: 0,
      played2v2: 0,
      won2v2: 0,
      darbas: 0,
      missas: 0,
      rondas: 0,
      tringas: 0,
      streak: 0,
      bestStreak: 0,
      coinsWon: 0,
    },
    daily: { streak: 0, lastClaim: null },
    freeCoinsAt: now,
    ads: { date: todayKey(now), count: 0 },
    rescueDate: null,
    owned: Object.values(DEFAULT_EQUIPPED),
    equipped: { ...DEFAULT_EQUIPPED },
    noAds: false,
    vipUntil: null,
    transferCode,
    referralCode,
    referredBy: null,
    createdAt: now,
  };
  const token = newToken();
  store.saveProfile(profile);
  store.addToken(hashToken(token), id);
  store.setTransferCode(transferCode, id);
  store.setReferralCode(referralCode, id);
  return { profile, token };
}

export function profileForToken(store: Store, token: unknown): Profile | undefined {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return undefined;
  const id = store.profileIdForToken(hashToken(token));
  return id ? store.getProfile(id) : undefined;
}

/** Connexion sur un nouvel appareil grâce au code de transfert : délivre un nouveau jeton. */
export function restoreWithCode(store: Store, code: unknown): { profile: Profile; token: string } | undefined {
  if (typeof code !== 'string') return undefined;
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const id = store.profileIdForTransferCode(normalized);
  const profile = id ? store.getProfile(id) : undefined;
  if (!profile) return undefined;
  const token = newToken();
  store.addToken(hashToken(token), profile.id);
  return { profile, token };
}

import {
  ADS_PER_DAY,
  AD_REWARD,
  dailyReward,
  DAILY_REWARDS,
  findIapProduct,
  findShopItem,
  FREE_COINS,
  FREE_COINS_INTERVAL_MS,
  levelForXp,
  levelUpReward,
  REFERRAL_COINS,
  RESCUE_COINS,
  RESCUE_THRESHOLD,
  VIP_DAILY_COINS,
  type ErrorCode,
  type Profile,
  type RewardKind,
} from '@ronda/core';
import { isVip, todayKey } from './accounts';
import type { Store } from './store';

export type WalletResult = { ok: true; coins: number; kind: RewardKind | null } | { ok: false; code: ErrorCode };

const DAY_MS = 24 * 60 * 60 * 1000;

function fail(code: ErrorCode): WalletResult {
  return { ok: false, code };
}

/** Toutes les opérations sur les pièces passent par ici : le serveur fait foi. */
export class Wallet {
  constructor(private readonly store: Store) {}

  claimDaily(p: Profile, now: number): WalletResult {
    const today = todayKey(now);
    if (p.daily.lastClaim === today) return fail('already_claimed');
    const yesterday = todayKey(now - DAY_MS);
    const streak = p.daily.lastClaim === yesterday ? (p.daily.streak % DAILY_REWARDS.length) + 1 : 1;
    let coins = dailyReward(streak);
    if (isVip(p, now)) coins += VIP_DAILY_COINS;
    p.daily = { streak, lastClaim: today };
    p.coins += coins;
    this.store.saveProfile(p);
    return { ok: true, coins, kind: 'daily' };
  }

  claimFree(p: Profile, now: number): WalletResult {
    if (now < p.freeCoinsAt) return fail('not_available');
    p.coins += FREE_COINS;
    p.freeCoinsAt = now + FREE_COINS_INTERVAL_MS;
    this.store.saveProfile(p);
    return { ok: true, coins: FREE_COINS, kind: 'free' };
  }

  /** Récompense d'une vidéo regardée (plafonnée par jour). */
  claimAd(p: Profile, now: number): WalletResult {
    const today = todayKey(now);
    if (p.ads.date !== today) p.ads = { date: today, count: 0 };
    if (p.ads.count >= ADS_PER_DAY) return fail('not_available');
    p.ads.count += 1;
    p.coins += AD_REWARD;
    this.store.saveProfile(p);
    return { ok: true, coins: AD_REWARD, kind: 'ad' };
  }

  claimRescue(p: Profile, now: number): WalletResult {
    const today = todayKey(now);
    if (p.coins >= RESCUE_THRESHOLD || p.rescueDate === today) return fail('not_available');
    p.rescueDate = today;
    p.coins += RESCUE_COINS;
    this.store.saveProfile(p);
    return { ok: true, coins: RESCUE_COINS, kind: 'rescue' };
  }

  buy(p: Profile, itemId: string): WalletResult {
    const item = findShopItem(itemId);
    if (!item || item.exclusive) return fail('unknown_item');
    if (p.owned.includes(item.id)) return fail('already_claimed');
    if (levelForXp(p.xp) < (item.minLevel ?? 1)) return fail('level_too_low');
    if (p.coins < item.price) return fail('not_enough_coins');
    p.coins -= item.price;
    p.owned.push(item.id);
    p.equipped[item.category] = item.id;
    this.store.saveProfile(p);
    return { ok: true, coins: -item.price, kind: null };
  }

  equip(p: Profile, itemId: string): WalletResult {
    const item = findShopItem(itemId);
    if (!item) return fail('unknown_item');
    if (!p.owned.includes(item.id) && !(item.price === 0 && !item.exclusive)) return fail('not_available');
    p.equipped[item.category] = item.id;
    this.store.saveProfile(p);
    return { ok: true, coins: 0, kind: null };
  }

  /** Parrainage : une seule fois, pendant la première semaine du compte. */
  referral(p: Profile, code: string, now: number): { ok: true; sponsor: Profile } | { ok: false; code: ErrorCode } {
    if (p.referredBy || now - p.createdAt > 7 * DAY_MS) return { ok: false, code: 'not_available' };
    const sponsorId = this.store.profileIdForReferral(code.toUpperCase().trim());
    const sponsor = sponsorId ? this.store.getProfile(sponsorId) : undefined;
    if (!sponsor || sponsor.id === p.id) return { ok: false, code: 'bad_code' };
    p.referredBy = sponsor.id;
    p.coins += REFERRAL_COINS;
    sponsor.coins += REFERRAL_COINS;
    this.store.saveProfile(p);
    this.store.saveProfile(sponsor);
    return { ok: true, sponsor };
  }

  canAfford(p: Profile, amount: number): boolean {
    return p.coins >= amount;
  }

  debit(p: Profile, amount: number): void {
    p.coins -= amount;
    this.store.saveProfile(p);
  }

  /** Ajoute l'expérience d'une partie et renvoie le nouveau niveau s'il a changé. */
  addXp(p: Profile, xp: number): number | null {
    const before = levelForXp(p.xp);
    p.xp += xp;
    const after = levelForXp(p.xp);
    if (after === before) return null;
    for (let level = before + 1; level <= after; level++) p.coins += levelUpReward(level);
    return after;
  }

  /** Crédite un achat validé par le store (idempotent grâce à l'identifiant de transaction). */
  grantPurchase(p: Profile, productId: string, transactionId: string, now: number): WalletResult {
    const product = findIapProduct(productId);
    if (!product) return fail('unknown_item');
    if (this.store.hasPurchase(transactionId)) return fail('already_claimed');
    this.store.addPurchase(transactionId, p.id);
    p.coins += product.coins;
    for (const id of product.unlocks ?? []) if (!p.owned.includes(id)) p.owned.push(id);
    if (product.noAds) p.noAds = true;
    if (product.vipDays) p.vipUntil = Math.max(p.vipUntil ?? now, now) + product.vipDays * DAY_MS;
    this.store.saveProfile(p);
    return { ok: true, coins: product.coins, kind: 'purchase' };
  }
}

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Profile } from '@ronda/core';

interface StoreData {
  version: 1;
  profiles: Record<string, Profile>;
  /** Empreinte SHA-256 du jeton de session -> identifiant du joueur. */
  tokens: Record<string, string>;
  /** Code de transfert de compte -> identifiant du joueur. */
  transfer: Record<string, string>;
  /** Code de parrainage -> identifiant du joueur. */
  referral: Record<string, string>;
  /** Transactions d'achat déjà créditées (idempotence des webhooks). */
  purchases: Record<string, string>;
}

function emptyData(): StoreData {
  return { version: 1, profiles: {}, tokens: {}, transfer: {}, referral: {}, purchases: {} };
}

/**
 * Stockage des profils : en mémoire, sauvegardé dans un fichier JSON (écriture atomique,
 * regroupée toutes les secondes). Suffisant pour un serveur unique ; pour plusieurs instances,
 * remplacer cette classe par une base (PostgreSQL, Redis…) en gardant les mêmes méthodes.
 */
export class Store {
  private data: StoreData;
  private readonly file: string | null;
  private timer: NodeJS.Timeout | null = null;

  constructor(dataDir: string) {
    this.file = dataDir ? join(dataDir, 'profiles.json') : null;
    this.data = emptyData();
    if (this.file) {
      mkdirSync(dataDir, { recursive: true });
      if (existsSync(this.file)) {
        const raw = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<StoreData>;
        this.data = { ...emptyData(), ...raw, version: 1 };
      }
    }
  }

  getProfile(id: string): Profile | undefined {
    return this.data.profiles[id];
  }

  saveProfile(profile: Profile): void {
    this.data.profiles[profile.id] = profile;
    this.markDirty();
  }

  allProfiles(): Profile[] {
    return Object.values(this.data.profiles);
  }

  profileCount(): number {
    return Object.keys(this.data.profiles).length;
  }

  profileIdForToken(tokenHash: string): string | undefined {
    return this.data.tokens[tokenHash];
  }

  addToken(tokenHash: string, profileId: string): void {
    this.data.tokens[tokenHash] = profileId;
    this.markDirty();
  }

  profileIdForTransferCode(code: string): string | undefined {
    return this.data.transfer[code];
  }

  setTransferCode(code: string, profileId: string): void {
    this.data.transfer[code] = profileId;
    this.markDirty();
  }

  profileIdForReferral(code: string): string | undefined {
    return this.data.referral[code];
  }

  setReferralCode(code: string, profileId: string): void {
    this.data.referral[code] = profileId;
    this.markDirty();
  }

  hasPurchase(transactionId: string): boolean {
    return transactionId in this.data.purchases;
  }

  addPurchase(transactionId: string, profileId: string): void {
    this.data.purchases[transactionId] = profileId;
    this.markDirty();
  }

  /** Écrit immédiatement le fichier (arrêt du serveur). */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.file) return;
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.file);
  }

  private markDirty(): void {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        this.flush();
      } catch (err) {
        console.error('[store] échec de la sauvegarde', err);
      }
    }, 1_000);
    this.timer.unref();
  }
}

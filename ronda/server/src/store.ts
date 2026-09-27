import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Profile } from '@ronda/core';

/** Stockage des comptes : le reste du serveur ne dépend que de cette interface. */
export interface Store {
  getProfile(id: string): Profile | undefined;
  saveProfile(profile: Profile): void;
  /** Meilleurs joueurs (au moins une partie jouée), par XP puis victoires. */
  topProfiles(limit: number): Profile[];
  profileCount(): number;
  profileIdForToken(tokenHash: string): string | undefined;
  addToken(tokenHash: string, profileId: string): void;
  profileIdForTransferCode(code: string): string | undefined;
  setTransferCode(code: string, profileId: string): void;
  profileIdForReferral(code: string): string | undefined;
  setReferralCode(code: string, profileId: string): void;
  hasPurchase(transactionId: string): boolean;
  addPurchase(transactionId: string, profileId: string): void;
  /** Écrit immédiatement ce qui est en attente (arrêt du serveur). */
  flush(): void;
  close(): void;
}

interface JsonData {
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

function emptyData(): JsonData {
  return { version: 1, profiles: {}, tokens: {}, transfer: {}, referral: {}, purchases: {} };
}

function byRank(a: Profile, b: Profile): number {
  return b.xp - a.xp || b.stats.won - a.stats.won;
}

/**
 * Stockage en mémoire, éventuellement sauvegardé dans un fichier JSON (écriture atomique,
 * regroupée toutes les secondes). Parfait pour les tests et le développement.
 */
export class JsonStore implements Store {
  private data: JsonData;
  private readonly file: string | null;
  private timer: NodeJS.Timeout | null = null;

  constructor(dataDir: string) {
    this.file = dataDir ? join(dataDir, 'profiles.json') : null;
    this.data = emptyData();
    if (this.file) {
      mkdirSync(dataDir, { recursive: true });
      if (existsSync(this.file)) this.data = readJsonData(this.file);
    }
  }

  getProfile(id: string): Profile | undefined {
    return this.data.profiles[id];
  }

  saveProfile(profile: Profile): void {
    this.data.profiles[profile.id] = profile;
    this.markDirty();
  }

  topProfiles(limit: number): Profile[] {
    return Object.values(this.data.profiles)
      .filter((p) => p.stats.played > 0)
      .sort(byRank)
      .slice(0, limit);
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

  close(): void {
    this.flush();
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

function readJsonData(file: string): JsonData {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<JsonData>;
  return { ...emptyData(), ...raw, version: 1 };
}

// -------------------------------------------------------------------------------------------
// SQLite (module intégré à Node) : stockage de production, sans dépendance à compiler.
// -------------------------------------------------------------------------------------------

interface SqliteStatement {
  run(...params: unknown[]): unknown;
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

/** Nombre maximal de profils gardés en mémoire (les autres sont relus à la demande). */
const CACHE_LIMIT = 50_000;

/**
 * Stockage SQLite : chaque profil est une ligne (JSON + colonnes indexées pour le classement).
 * Les écritures sont regroupées dans une transaction par seconde ; un profil tout neuf est écrit
 * immédiatement. Supporte sans problème des centaines de milliers de joueurs sur un serveur.
 */
export class SqliteStore implements Store {
  private readonly db: SqliteDatabase;
  private readonly cache = new Map<string, Profile>();
  private readonly dirty = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private readonly q: Record<string, SqliteStatement>;

  constructor(file: string) {
    const require = createRequire(import.meta.url);
    const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => SqliteDatabase };
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        xp INTEGER NOT NULL DEFAULT 0,
        won INTEGER NOT NULL DEFAULT 0,
        played INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS profiles_rank ON profiles (xp DESC, won DESC) WHERE played > 0;
      CREATE TABLE IF NOT EXISTS tokens (hash TEXT PRIMARY KEY, profile_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS transfer_codes (code TEXT PRIMARY KEY, profile_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS referral_codes (code TEXT PRIMARY KEY, profile_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS purchases (tx TEXT PRIMARY KEY, profile_id TEXT NOT NULL, at INTEGER NOT NULL);
    `);
    this.q = {
      getProfile: this.db.prepare('SELECT data FROM profiles WHERE id = ?'),
      upsertProfile: this.db.prepare(
        `INSERT INTO profiles (id, xp, won, played, data) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET xp = excluded.xp, won = excluded.won, played = excluded.played, data = excluded.data`,
      ),
      top: this.db.prepare('SELECT data FROM profiles WHERE played > 0 ORDER BY xp DESC, won DESC LIMIT ?'),
      count: this.db.prepare('SELECT COUNT(*) AS n FROM profiles'),
      getToken: this.db.prepare('SELECT profile_id FROM tokens WHERE hash = ?'),
      addToken: this.db.prepare('INSERT OR REPLACE INTO tokens (hash, profile_id) VALUES (?, ?)'),
      getTransfer: this.db.prepare('SELECT profile_id FROM transfer_codes WHERE code = ?'),
      setTransfer: this.db.prepare('INSERT OR REPLACE INTO transfer_codes (code, profile_id) VALUES (?, ?)'),
      getReferral: this.db.prepare('SELECT profile_id FROM referral_codes WHERE code = ?'),
      setReferral: this.db.prepare('INSERT OR REPLACE INTO referral_codes (code, profile_id) VALUES (?, ?)'),
      getPurchase: this.db.prepare('SELECT 1 AS ok FROM purchases WHERE tx = ?'),
      addPurchase: this.db.prepare('INSERT OR IGNORE INTO purchases (tx, profile_id, at) VALUES (?, ?, ?)'),
    };
  }

  /** Reprend les données d'un ancien fichier profiles.json si la base est vide. */
  importJson(file: string): number {
    if (!existsSync(file) || this.profileCount() > 0) return 0;
    const data = readJsonData(file);
    this.db.exec('BEGIN');
    try {
      for (const p of Object.values(data.profiles)) this.writeProfile(p);
      for (const [hash, id] of Object.entries(data.tokens)) this.q.addToken.run(hash, id);
      for (const [code, id] of Object.entries(data.transfer)) this.q.setTransfer.run(code, id);
      for (const [code, id] of Object.entries(data.referral)) this.q.setReferral.run(code, id);
      for (const [tx, id] of Object.entries(data.purchases)) this.q.addPurchase.run(tx, id, Date.now());
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return Object.keys(data.profiles).length;
  }

  getProfile(id: string): Profile | undefined {
    const cached = this.cache.get(id);
    if (cached) {
      // Rafraîchit la position dans le cache (le plus récent à la fin).
      this.cache.delete(id);
      this.cache.set(id, cached);
      return cached;
    }
    const row = this.q.getProfile.get(id);
    if (!row) return undefined;
    const profile = JSON.parse(String(row.data)) as Profile;
    this.remember(profile);
    return profile;
  }

  saveProfile(profile: Profile): void {
    const known = this.cache.has(profile.id) || this.q.getProfile.get(profile.id) !== undefined;
    this.remember(profile);
    if (!known) {
      // Nouveau compte : écrit tout de suite pour ne jamais perdre le lien jeton -> profil.
      this.writeProfile(profile);
      return;
    }
    this.dirty.add(profile.id);
    this.schedule();
  }

  topProfiles(limit: number): Profile[] {
    this.flush();
    return this.q.top.all(limit).map((row) => {
      const p = JSON.parse(String(row.data)) as Profile;
      return this.cache.get(p.id) ?? p;
    });
  }

  profileCount(): number {
    return Number(this.q.count.get()?.n ?? 0);
  }

  profileIdForToken(tokenHash: string): string | undefined {
    return this.q.getToken.get(tokenHash)?.profile_id as string | undefined;
  }

  addToken(tokenHash: string, profileId: string): void {
    this.q.addToken.run(tokenHash, profileId);
  }

  profileIdForTransferCode(code: string): string | undefined {
    return this.q.getTransfer.get(code)?.profile_id as string | undefined;
  }

  setTransferCode(code: string, profileId: string): void {
    this.q.setTransfer.run(code, profileId);
  }

  profileIdForReferral(code: string): string | undefined {
    return this.q.getReferral.get(code)?.profile_id as string | undefined;
  }

  setReferralCode(code: string, profileId: string): void {
    this.q.setReferral.run(code, profileId);
  }

  hasPurchase(transactionId: string): boolean {
    return this.q.getPurchase.get(transactionId) !== undefined;
  }

  addPurchase(transactionId: string, profileId: string): void {
    this.q.addPurchase.run(transactionId, profileId, Date.now());
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty.size) return;
    this.db.exec('BEGIN');
    try {
      for (const id of this.dirty) {
        const p = this.cache.get(id);
        if (p) this.writeProfile(p);
      }
      this.db.exec('COMMIT');
      this.dirty.clear();
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  close(): void {
    this.flush();
    this.db.close();
  }

  private writeProfile(p: Profile): void {
    this.q.upsertProfile.run(p.id, p.xp, p.stats.won, p.stats.played, JSON.stringify(p));
  }

  private remember(profile: Profile): void {
    this.cache.delete(profile.id);
    this.cache.set(profile.id, profile);
    if (this.cache.size <= CACHE_LIMIT) return;
    for (const id of this.cache.keys()) {
      if (this.cache.size <= CACHE_LIMIT) break;
      if (!this.dirty.has(id)) this.cache.delete(id);
    }
  }

  private schedule(): void {
    if (this.timer) return;
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

/**
 * Ouvre le stockage : en mémoire sans dossier de données, SQLite sinon (ou JSON si STORE=json).
 * Un ancien fichier profiles.json est importé automatiquement dans une base neuve.
 */
export function openStore(dataDir: string, kind = process.env.STORE ?? 'sqlite'): Store {
  if (!dataDir || kind === 'json') return new JsonStore(dataDir);
  mkdirSync(dataDir, { recursive: true });
  let store: SqliteStore;
  try {
    store = new SqliteStore(join(dataDir, 'ronda.db'));
  } catch (err) {
    // Node.js trop ancien (SQLite intégré depuis la version 22.5) : simple fichier JSON.
    console.warn('[store] SQLite indisponible, profils enregistrés dans profiles.json :', (err as Error).message);
    return new JsonStore(dataDir);
  }
  const imported = store.importJson(join(dataDir, 'profiles.json'));
  if (imported) console.log(`[store] ${imported} profils importés depuis profiles.json`);
  return store;
}

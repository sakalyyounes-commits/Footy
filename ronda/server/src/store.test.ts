import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProfile, hashToken, profileForToken } from './accounts';
import { JsonStore, openStore, SqliteStore, type Store } from './store';

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ronda-store-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const kinds: [string, (dir: string) => Store][] = [
  ['JSON', (dir) => new JsonStore(dir)],
  ['SQLite', (dir) => new SqliteStore(join(dir, 'ronda.db'))],
];

describe.each(kinds)('stockage %s', (_name, open) => {
  it('crée, relit et retrouve un compte par jeton, code de transfert et code de parrainage', () => {
    const dir = tempDir();
    const store = open(dir);
    const { profile, token } = createProfile(store, { name: 'Younes', avatar: 3 });
    expect(store.getProfile(profile.id)?.name).toBe('Younes');
    expect(profileForToken(store, token)?.id).toBe(profile.id);
    expect(store.profileIdForTransferCode(profile.transferCode)).toBe(profile.id);
    expect(store.profileIdForReferral(profile.referralCode)).toBe(profile.id);
    expect(store.profileCount()).toBe(1);
    store.close();
  });

  it('conserve les données après redémarrage', () => {
    const dir = tempDir();
    const store = open(dir);
    const { profile, token } = createProfile(store, { name: 'Salma' });
    profile.coins = 12_345;
    profile.xp = 999;
    store.saveProfile(profile);
    store.addPurchase('tx-1', profile.id);
    store.close();

    const again = open(dir);
    expect(again.getProfile(profile.id)?.coins).toBe(12_345);
    expect(again.profileIdForToken(hashToken(token))).toBe(profile.id);
    expect(again.hasPurchase('tx-1')).toBe(true);
    expect(again.hasPurchase('tx-2')).toBe(false);
    again.close();
  });

  it('classe les joueurs par XP puis victoires, sans ceux qui n’ont jamais joué', () => {
    const store = open(tempDir());
    const make = (name: string, xp: number, won: number, played: number) => {
      const { profile } = createProfile(store, { name });
      profile.xp = xp;
      profile.stats.won = won;
      profile.stats.played = played;
      store.saveProfile(profile);
      return profile;
    };
    make('Nouveau', 0, 0, 0);
    make('Moyen', 500, 10, 30);
    make('Champion', 900, 40, 60);
    make('Egal', 500, 12, 25);
    expect(store.topProfiles(10).map((p) => p.name)).toEqual(['Champion', 'Egal', 'Moyen']);
    expect(store.topProfiles(1)).toHaveLength(1);
    store.close();
  });
});

describe('migration', () => {
  it('importe un ancien profiles.json dans une base SQLite neuve', () => {
    const dir = tempDir();
    const legacy = new JsonStore(dir);
    const { profile, token } = createProfile(legacy, { name: 'Ancien' });
    legacy.close();
    const store = openStore(dir, 'sqlite');
    expect(store.getProfile(profile.id)?.name).toBe('Ancien');
    expect(profileForToken(store, token)?.id).toBe(profile.id);
    store.close();
  });

  it('ignore un fichier JSON quand la base contient déjà des comptes', () => {
    const dir = tempDir();
    const store = openStore(dir, 'sqlite');
    createProfile(store, { name: 'Actuel' });
    store.close();
    writeFileSync(join(dir, 'profiles.json'), JSON.stringify({ version: 1, profiles: { x: { id: 'x' } } }));
    const again = openStore(dir, 'sqlite');
    expect(again.profileCount()).toBe(1);
    again.close();
  });
});

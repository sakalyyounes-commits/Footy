import { describe, expect, it } from 'vitest';
import { parseBackup, serializeBackup } from './backup';
import { createInitialData } from './defaults';
import { withDefaults } from './store';

describe('données et sauvegardes', () => {
  it('complète les réglages manquants sans écraser les données', () => {
    const defaults = createInitialData();
    const old = {
      settings: { currency: 'EUR', goals: { steps: 12000 } },
      water: [{ id: 'w', date: '2026-09-26', ts: 1, ml: 250 }],
      prayerLog: { '2026-09-26': { fajr: { status: 'ontime' } } },
    };
    const merged = withDefaults(defaults, old);
    expect(merged.settings.currency).toBe('EUR');
    expect(merged.settings.goals.steps).toBe(12000);
    expect(merged.settings.goals.sleepHours).toBe(defaults.settings.goals.sleepHours);
    expect(merged.settings.prayer.method).toBe('morocco');
    expect(merged.water).toHaveLength(1);
    expect(merged.prayerLog['2026-09-26'].fajr?.status).toBe('ontime');
    expect(merged.categories.length).toBeGreaterThan(10);
  });

  it('remplace les valeurs corrompues par les valeurs par défaut', () => {
    const merged = withDefaults(createInitialData(), { profile: 'oups', water: 'pas une liste' });
    expect(merged.profile.sex).toBe('male');
    expect(merged.water).toEqual([]);
  });

  it('exporte puis réimporte une sauvegarde à l’identique', () => {
    const data = createInitialData();
    data.profile.name = 'Younes';
    data.transactions.push({ id: 't', date: '2026-09-26', type: 'expense', amount: 42, categoryId: 'courses', ts: 1 });
    const restored = parseBackup(serializeBackup(data));
    expect(restored.profile.name).toBe('Younes');
    expect(restored.transactions).toEqual(data.transactions);
  });

  it('refuse les fichiers qui ne sont pas des sauvegardes Hayati', () => {
    expect(() => parseBackup('pas du json')).toThrow(/JSON/);
    expect(() => parseBackup(JSON.stringify({ app: 'autre', data: {} }))).toThrow(/pas une sauvegarde/);
    expect(() => parseBackup(JSON.stringify({ app: 'hayati', version: 999, data: {} }))).toThrow(/plus récente/);
  });
});

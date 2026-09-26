import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { daysUntilRamadan, fastSuggestionsFor, formatHijri, isRamadan, toHijri } from './hijri';
import { bestStreak, currentStreak } from './streaks';

describe('calendrier hégirien', () => {
  it('convertit les dates (Umm al-Qura)', () => {
    expect(toHijri('2026-02-18')).toEqual({ day: 1, month: 9, year: 1447 });
    expect(toHijri('2026-06-16')).toEqual({ day: 1, month: 1, year: 1448 });
    expect(formatHijri(toHijri('2026-09-26'))).toBe('15 Rabi‘ ath-thani 1448');
  });

  it('applique le décalage local (ex. Maroc : Ramadan 1447 a commencé le 19 février)', () => {
    expect(toHijri('2026-02-19', -1)).toEqual({ day: 1, month: 9, year: 1447 });
    expect(isRamadan('2026-02-18', -1)).toBe(false);
    expect(isRamadan('2026-03-01')).toBe(true);
  });

  it('propose les jeûnes recommandés', () => {
    expect(fastSuggestionsFor('2026-09-28').map((s) => s.label)).toContain('Lundi');
    expect(fastSuggestionsFor('2026-09-24').map((s) => s.label)).toEqual(expect.arrayContaining(['Jeudi', 'Jours blancs']));
    expect(fastSuggestionsFor('2026-03-01')[0].label).toBe('Ramadan');
    expect(fastSuggestionsFor('2026-03-20')[0].label).toBe('Aïd al-Fitr');
  });

  it('compte les jours avant Ramadan', () => {
    const n = daysUntilRamadan('2026-09-26');
    expect(n).not.toBeNull();
    expect(isRamadan(addDays('2026-09-26', n!))).toBe(true);
    expect(isRamadan(addDays('2026-09-26', n! - 1))).toBe(false);
    expect(daysUntilRamadan('2026-03-01')).toBeNull();
  });
});

describe('séries', () => {
  const done = new Set(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-24', '2026-09-25']);
  const isDone = (d: string) => done.has(d);

  it('compte la série en cours sans pénaliser la journée pas encore finie', () => {
    expect(currentStreak(isDone, '2026-09-26')).toBe(2);
    expect(currentStreak(isDone, '2026-09-25')).toBe(2);
    expect(currentStreak(isDone, '2026-09-23')).toBe(3);
  });

  it('ignore les jours non planifiés', () => {
    const skip23 = (d: string) => d !== '2026-09-23';
    expect(currentStreak(isDone, '2026-09-25', skip23)).toBe(5);
  });

  it('trouve la meilleure série', () => {
    const days = ['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
    expect(bestStreak(days, isDone)).toBe(3);
  });
});

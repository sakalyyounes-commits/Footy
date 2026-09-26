import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  lastNDays,
  lastNMonths,
  minutesToTime,
  rangeDays,
  startOfWeek,
  timeToMinutes,
  weekdayIndex,
} from './dates';

describe('dates', () => {
  it('ajoute des jours en changeant de mois et d’année', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-09-26', 0)).toBe('2026-09-26');
  });

  it('calcule les écarts en jours', () => {
    expect(diffDays('2026-10-01', '2026-09-26')).toBe(5);
    expect(diffDays('2026-09-26', '2026-10-01')).toBe(-5);
    expect(diffDays('2027-01-01', '2026-01-01')).toBe(365);
  });

  it('commence la semaine le lundi', () => {
    expect(weekdayIndex('2026-09-26')).toBe(5); // samedi
    expect(weekdayIndex('2026-09-27')).toBe(6); // dimanche
    expect(startOfWeek('2026-09-26')).toBe('2026-09-21');
    expect(startOfWeek('2026-09-21')).toBe('2026-09-21');
  });

  it('génère des plages de jours et de mois', () => {
    expect(rangeDays('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(lastNDays(3, '2026-01-01')).toEqual(['2025-12-30', '2025-12-31', '2026-01-01']);
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(lastNMonths(3, '2026-02')).toEqual(['2025-12', '2026-01', '2026-02']);
    expect(daysInMonth('2024-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('convertit les heures', () => {
    expect(timeToMinutes('06:30')).toBe(390);
    expect(minutesToTime(390)).toBe('06:30');
    expect(minutesToTime(-30)).toBe('23:30');
    expect(minutesToTime(1470)).toBe('00:30');
  });
});

describe('dates autour des changements d’heure', () => {
  beforeAll(() => {
    vi.stubEnv('TZ', 'Europe/Paris');
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('ne saute ni ne double aucun jour', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2);
    expect(rangeDays('2026-10-24', '2026-10-27')).toHaveLength(4);
  });
});

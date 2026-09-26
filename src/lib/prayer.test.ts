import { describe, expect, it } from 'vitest';
import type { PrayerSettings, TimeKey } from '../store/types';
import { compassLabel, getDayTimes, getNextPrayer, qiblaBearing, suggestStatus, TIME_KEYS } from './prayer';

const casablanca: PrayerSettings = {
  cityId: 'casablanca',
  label: 'Casablanca',
  lat: 33.5731,
  lng: -7.5898,
  method: 'morocco',
  asr: 'standard',
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  hijriOffset: 0,
};

const rabat: PrayerSettings = { ...casablanca, cityId: 'rabat', label: 'Rabat', lat: 34.0209, lng: -6.8416 };

/** Heure « HH:MM » à Casablanca, quel que soit le fuseau de la machine de test. */
const hhmm = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Casablanca' }).format(d);

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Horaires officiels publiés (ministère des Habous) pour contrôle. */
const OFFICIAL: Array<{ settings: PrayerSettings; date: string; times: Record<TimeKey, string> }> = [
  {
    settings: casablanca,
    date: '2026-09-24',
    times: { fajr: '05:52', sunrise: '07:17', dhuhr: '13:28', asr: '16:49', maghrib: '19:29', isha: '20:43' },
  },
  {
    settings: rabat,
    date: '2026-09-26',
    times: { fajr: '05:49', sunrise: '07:15', dhuhr: '13:24', asr: '16:44', maghrib: '19:23', isha: '20:37' },
  },
];

describe('horaires de prière (méthode Maroc)', () => {
  for (const ref of OFFICIAL) {
    it(`reproduit les horaires officiels de ${ref.settings.label} le ${ref.date} à ±1 min`, () => {
      const times = getDayTimes(ref.settings, ref.date);
      for (const key of TIME_KEYS) {
        const diff = Math.abs(minutes(hhmm(times[key])) - minutes(ref.times[key]));
        expect(diff, `${key} : ${hhmm(times[key])} au lieu de ${ref.times[key]}`).toBeLessThanOrEqual(1);
      }
    });
  }

  it('applique les ajustements manuels', () => {
    const base = getDayTimes(casablanca, '2026-09-24');
    const adjusted = getDayTimes({ ...casablanca, adjustments: { ...casablanca.adjustments, isha: 10 } }, '2026-09-24');
    expect(minutes(hhmm(adjusted.isha)) - minutes(hhmm(base.isha))).toBe(10);
  });

  it('calcule Asr plus tard avec le madhhab hanafite', () => {
    const standard = getDayTimes(casablanca, '2026-09-24');
    const hanafi = getDayTimes({ ...casablanca, asr: 'hanafi' }, '2026-09-24');
    expect(hanafi.asr.getTime()).toBeGreaterThan(standard.asr.getTime());
  });

  it('place le dernier tiers de la nuit entre Icha et Fajr', () => {
    const t = getDayTimes(casablanca, '2026-09-24');
    const nextFajr = getDayTimes(casablanca, '2026-09-25').fajr;
    expect(t.lastThird.getTime()).toBeGreaterThan(t.isha.getTime());
    expect(t.lastThird.getTime()).toBeLessThan(nextFajr.getTime());
  });
});

describe('prochaine prière et statut', () => {
  // 24/09/2026 : Casablanca est en UTC+1.
  const at = (hhmmLocal: string) => new Date(`2026-09-24T${hhmmLocal}:00+01:00`);

  it('trouve la prochaine prière dans la journée', () => {
    const next = getNextPrayer(casablanca, at('12:00'));
    expect(next.key).toBe('dhuhr');
    expect(next.current).toBeNull();
  });

  it('bascule sur le Fajr du lendemain après Icha', () => {
    const now = at('22:30');
    const next = getNextPrayer(casablanca, now);
    expect(next.key).toBe('fajr');
    expect(next.time.getTime()).toBeGreaterThan(now.getTime());
    expect(next.current).toBe('isha');
  });

  it('propose « en retard » après la fin du temps de la prière', () => {
    expect(suggestStatus(casablanca, '2026-09-24', 'fajr', at('06:30'))).toBe('ontime');
    expect(suggestStatus(casablanca, '2026-09-24', 'fajr', at('08:00'))).toBe('late');
    expect(suggestStatus(casablanca, '2026-09-24', 'isha', at('23:59'))).toBe('ontime');
  });
});

describe('qibla', () => {
  it('donne la direction de La Mecque', () => {
    expect(qiblaBearing(33.5731, -7.5898)).toBeCloseTo(93.7, 0);
    expect(qiblaBearing(48.8566, 2.3522)).toBeCloseTo(119.2, 0);
    expect(compassLabel(93.7)).toBe('Est');
    expect(compassLabel(119)).toBe('Sud-Est');
    expect(compassLabel(359)).toBe('Nord');
  });
});

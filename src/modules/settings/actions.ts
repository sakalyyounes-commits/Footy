import { update } from '../../store/store';
import type { Goals, PrayerSettings, Profile, Settings } from '../../store/types';

export function updateProfile(patch: Partial<Profile>): void {
  update((s) => ({ profile: { ...s.profile, ...patch } }));
}

export function updateSettings(patch: Partial<Settings>): void {
  update((s) => ({ settings: { ...s.settings, ...patch } }));
}

export function updateGoals(patch: Partial<Goals>): void {
  update((s) => ({ settings: { ...s.settings, goals: { ...s.settings.goals, ...patch } } }));
}

export function updatePrayerSettings(patch: Partial<PrayerSettings>): void {
  update((s) => ({ settings: { ...s.settings, prayer: { ...s.settings.prayer, ...patch } } }));
}

/** Position actuelle via le GPS du navigateur. */
export function locate(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: Math.round(pos.coords.latitude * 1e4) / 1e4, lng: Math.round(pos.coords.longitude * 1e4) / 1e4 }),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? 'Accès à la position refusé.' : 'Position introuvable, réessayez.')),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 3_600_000 },
    );
  });
}

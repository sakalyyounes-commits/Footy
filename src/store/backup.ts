import { createInitialData } from './defaults';
import { DATA_VERSION, migrate, update, useStore } from './store';
import type { AppData } from './types';

interface BackupFile {
  app: 'hayati';
  version: number;
  exportedAt: string;
  data: AppData;
}

export function serializeBackup(data: AppData): string {
  const file: BackupFile = { app: 'hayati', version: DATA_VERSION, exportedAt: new Date().toISOString(), data };
  return JSON.stringify(file, null, 1);
}

/** Lit un fichier de sauvegarde ; lève une erreur lisible si le fichier n'est pas valide. */
export function parseBackup(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier n’est pas une sauvegarde Hayati valide (JSON illisible).');
  }
  const file = parsed as Partial<BackupFile>;
  if (!file || file.app !== 'hayati' || typeof file.data !== 'object' || file.data === null) {
    throw new Error('Ce fichier n’est pas une sauvegarde Hayati.');
  }
  if (typeof file.version === 'number' && file.version > DATA_VERSION) {
    throw new Error('Cette sauvegarde vient d’une version plus récente de l’application. Mettez l’application à jour.');
  }
  return migrate(file.data, file.version ?? 1);
}

export function restoreBackup(data: AppData): void {
  useStore.setState({ ...data, meta: { ...data.meta, onboarded: true } }, true);
}

export function markBackupDone(): void {
  update((s) => ({ meta: { ...s.meta, lastBackupAt: Date.now() } }));
}

export function resetAllData(): void {
  useStore.setState(createInitialData(), true);
}

/** Indique si l'utilisateur a déjà saisi des données (pour les rappels de sauvegarde). */
export function hasUserData(s: AppData): boolean {
  return (
    s.transactions.length > 0 ||
    s.water.length > 0 ||
    s.meals.length > 0 ||
    s.workouts.length > 0 ||
    Object.keys(s.prayerLog).length > 0 ||
    s.habits.length > 0 ||
    Object.keys(s.journal).length > 0
  );
}

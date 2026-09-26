import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createInitialData } from './defaults';
import type { AppData } from './types';

export const STORAGE_KEY = 'hayati:data';
export const DATA_VERSION = 1;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Complète récursivement `value` avec les valeurs par défaut manquantes. Permet d'ajouter
 * de nouveaux réglages dans une future version sans casser les données existantes.
 */
export function withDefaults<T>(defaults: T, value: unknown): T {
  if (isPlainObject(defaults)) {
    if (!isPlainObject(value)) return defaults;
    const out: Record<string, unknown> = { ...value };
    for (const [key, dv] of Object.entries(defaults)) out[key] = withDefaults(dv, value[key]);
    return out as T;
  }
  if (Array.isArray(defaults)) return (Array.isArray(value) ? value : defaults) as T;
  return (value === undefined ? defaults : value) as T;
}

/** Migrations entre versions du format de données (aucune pour l'instant). */
export function migrate(persisted: unknown, _fromVersion: number): AppData {
  return withDefaults(createInitialData(), persisted);
}

type StorageErrorListener = (error: unknown) => void;
const storageErrorListeners = new Set<StorageErrorListener>();

export function onStorageError(listener: StorageErrorListener): () => void {
  storageErrorListeners.add(listener);
  return () => storageErrorListeners.delete(listener);
}

const safeLocalStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      storageErrorListeners.forEach((l) => l(error));
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
};

/** Toutes les données de l'application, sauvegardées automatiquement dans le navigateur. */
export const useStore = create<AppData>()(
  persist(() => createInitialData(), {
    name: STORAGE_KEY,
    version: DATA_VERSION,
    storage: createJSONStorage(() => safeLocalStorage),
    migrate: (persisted, version) => migrate(persisted, version),
    merge: (persisted, current) => withDefaults(current, persisted),
  }),
);

/** Met à jour l'état global à partir de l'état courant. */
export function update(fn: (s: AppData) => Partial<AppData>): void {
  useStore.setState(fn);
}

export const getData = (): AppData => useStore.getState();

// Synchronise les onglets ouverts en même temps.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) void useStore.persist.rehydrate();
  });
}

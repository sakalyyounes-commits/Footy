import { toastUndo } from '../components/ui/toast';
import { getData, update } from './store';
import type { AppData } from './types';

type WithId = { id: string };

/** Clés de l'état qui sont des listes d'éléments identifiés. */
export type ListKey = {
  [K in keyof AppData]: AppData[K] extends Array<WithId> ? K : never;
}[keyof AppData];

type ItemOf<K extends ListKey> = AppData[K] extends Array<infer T> ? T : never;

function getList(s: AppData, key: ListKey): WithId[] {
  return s[key] as unknown as WithId[];
}

/** Ajoute ou remplace un élément (par id). */
export function upsertItem<K extends ListKey>(key: K, item: ItemOf<K>): void {
  update((s) => {
    const list = getList(s, key);
    const i = list.findIndex((x) => x.id === (item as WithId).id);
    const next = i >= 0 ? list.map((x, j) => (j === i ? (item as WithId) : x)) : [...list, item as WithId];
    return { [key]: next } as Partial<AppData>;
  });
}

/** Supprime un élément avec possibilité d'annuler via une notification. */
export function removeItem<K extends ListKey>(key: K, id: string, message = 'Élément supprimé'): void {
  const list = getList(getData(), key);
  const index = list.findIndex((x) => x.id === id);
  if (index < 0) return;
  const item = list[index];
  update((s) => ({ [key]: getList(s, key).filter((x) => x.id !== id) }) as Partial<AppData>);
  toastUndo(message, () =>
    update((s) => {
      const next = [...getList(s, key)];
      next.splice(Math.min(index, next.length), 0, item);
      return { [key]: next } as Partial<AppData>;
    }),
  );
}

import { todayISO, type ISODate } from '../../lib/dates';
import { uid, vibrate } from '../../lib/misc';
import { removeItem } from '../../store/helpers';
import { update } from '../../store/store';

export function addWater(ml: number, date: ISODate = todayISO()): void {
  if (!(ml > 0)) return;
  vibrate(8);
  update((s) => ({ water: [...s.water, { id: uid(), date, ts: Date.now(), ml: Math.round(ml) }] }));
}

export function removeWater(id: string): void {
  removeItem('water', id, 'Verre supprimé');
}

export function setWaterQuickAdd(values: number[]): void {
  update((s) => ({ settings: { ...s.settings, waterQuickAdd: values } }));
}

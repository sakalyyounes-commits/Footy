import { toastUndo } from '../../components/ui/toast';
import type { ISODate } from '../../lib/dates';
import { vibrate } from '../../lib/misc';
import { upsertItem } from '../../store/helpers';
import { getData, update } from '../../store/store';
import type { Habit } from '../../store/types';

export function saveHabit(habit: Habit): void {
  upsertItem('habits', habit);
}

/** Supprime une habitude et son historique (annulable). */
export function deleteHabit(id: string): void {
  const s = getData();
  const index = s.habits.findIndex((h) => h.id === id);
  if (index < 0) return;
  const habit = s.habits[index];
  const log = s.habitLogs[id];
  update((st) => {
    const habitLogs = { ...st.habitLogs };
    delete habitLogs[id];
    return { habits: st.habits.filter((h) => h.id !== id), habitLogs };
  });
  toastUndo('Habitude supprimée', () =>
    update((st) => {
      const habits = [...st.habits];
      habits.splice(Math.min(index, habits.length), 0, habit);
      return { habits, habitLogs: log ? { ...st.habitLogs, [id]: log } : st.habitLogs };
    }),
  );
}

export function setHabitArchived(id: string, archived: boolean): void {
  update((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, archived } : h)) }));
}

/** Coche l'habitude : +1 jusqu'à l'objectif, puis retour à 0. */
export function tapHabit(habit: Habit, date: ISODate): void {
  update((s) => {
    const log = { ...(s.habitLogs[habit.id] ?? {}) };
    const current = log[date] ?? 0;
    const next = current >= habit.target ? 0 : current + 1;
    if (next === 0) delete log[date];
    else log[date] = next;
    if (next === habit.target) vibrate([15, 30, 15]);
    else vibrate(8);
    return { habitLogs: { ...s.habitLogs, [habit.id]: log } };
  });
}

export const HABIT_SUGGESTIONS: Array<Pick<Habit, 'name' | 'emoji' | 'target'>> = [
  { name: 'Lire 20 minutes', emoji: '📖', target: 1 },
  { name: 'Marcher 30 minutes', emoji: '🚶', target: 1 },
  { name: 'Pas de sucre ajouté', emoji: '🍬', target: 1 },
  { name: 'Pas d’écran au lit', emoji: '📵', target: 1 },
  { name: 'Étirements du matin', emoji: '🤸', target: 1 },
  { name: 'Se coucher avant 23 h', emoji: '🌙', target: 1 },
  { name: 'Appeler un proche (silat ar-rahim)', emoji: '📞', target: 1 },
  { name: 'Apprendre quelque chose de nouveau', emoji: '🎓', target: 1 },
  { name: 'Fruits & légumes (5 portions)', emoji: '🥗', target: 5 },
  { name: 'Ranger / 10 minutes de ménage', emoji: '🧹', target: 1 },
];

export const HABIT_EMOJIS = [
  '📖', '🚶', '🏃', '💪', '🧘', '🤸', '🍬', '🥗', '🍎', '💧', '📵', '🌙', '☀️', '📞', '🎓', '✍️',
  '🧹', '💰', '🤲', '📿', '🕌', '❤️', '🦷', '🧴', '🚭', '🎯', '🎸', '🌱', '🐈', '⏰',
];

export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const WEEKDAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

import { toast } from '../../components/ui/toast';
import { daysInMonth, todayISO, type MonthKey } from '../../lib/dates';
import { recurringDueDate } from '../../lib/finance';
import { uid } from '../../lib/misc';
import { removeItem, upsertItem } from '../../store/helpers';
import { getData, update } from '../../store/store';
import type { FinanceCategory, RecurringItem, SavingsGoal, Transaction } from '../../store/types';

export function saveTransaction(tx: Transaction): void {
  upsertItem('transactions', tx);
}

export function removeTransaction(id: string): void {
  removeItem('transactions', id, 'Transaction supprimée');
}

export function saveCategory(cat: FinanceCategory): void {
  upsertItem('categories', cat);
}

/** Supprime une catégorie, ou l'archive si des transactions l'utilisent encore. */
export function deleteCategory(id: string): void {
  const used = getData().transactions.some((t) => t.categoryId === id);
  if (used) {
    update((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, archived: true } : c)) }));
    toast('Catégorie archivée (elle reste visible dans l’historique)');
  } else {
    removeItem('categories', id, 'Catégorie supprimée');
  }
}

export function setBudget(categoryId: string, budget: number | null): void {
  update((s) => ({ categories: s.categories.map((c) => (c.id === categoryId ? { ...c, budget: budget && budget > 0 ? budget : null } : c)) }));
}

export function saveRecurring(item: RecurringItem): void {
  upsertItem('recurring', item);
}

export function removeRecurring(id: string): void {
  removeItem('recurring', id, 'Charge fixe supprimée');
}

/** Crée la transaction correspondant à une charge fixe pour le mois donné. */
export function payRecurring(item: RecurringItem, month: MonthKey): void {
  const today = todayISO();
  const date = month === today.slice(0, 7) ? today : recurringDueDate(item, month, daysInMonth(month));
  saveTransaction({
    id: uid(),
    date,
    type: item.type,
    amount: item.amount,
    categoryId: item.categoryId,
    note: item.name,
    recurringId: item.id,
    ts: Date.now(),
  });
  toast(`${item.name} marqué comme ${item.type === 'income' ? 'reçu' : 'payé'}`);
}

export function saveSavingsGoal(goal: SavingsGoal): void {
  upsertItem('savings', goal);
}

export function removeSavingsGoal(id: string): void {
  removeItem('savings', id, 'Objectif supprimé');
}

export function adjustSavings(id: string, delta: number): void {
  update((s) => ({ savings: s.savings.map((g) => (g.id === id ? { ...g, saved: Math.max(0, Math.round((g.saved + delta) * 100) / 100) } : g)) }));
}

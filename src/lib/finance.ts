import type { FinanceCategory, RecurringItem, Transaction } from '../store/types';
import { monthKey, type MonthKey } from './dates';

export interface Totals {
  income: number;
  expense: number;
  balance: number;
  /** Part des revenus non dépensée (null sans revenus). */
  savingsRate: number | null;
}

export function monthTransactions(txs: Transaction[], key: MonthKey): Transaction[] {
  return txs.filter((t) => monthKey(t.date) === key);
}

export function totals(txs: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  const balance = income - expense;
  return { income, expense, balance, savingsRate: income > 0 ? balance / income : null };
}

/** Dépenses par catégorie, triées de la plus grosse à la plus petite. */
export function spendingByCategory(txs: Transaction[]): Array<{ categoryId: string; amount: number }> {
  const map = new Map<string, number>();
  for (const t of txs) if (t.type === 'expense') map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  return [...map.entries()].map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount);
}

export type BudgetState = 'ok' | 'warning' | 'over';

/** État d'un budget : alerte à 80 %, dépassé au-delà de 100 %. */
export function budgetState(spent: number, budget: number): BudgetState {
  if (spent > budget) return 'over';
  if (spent >= budget * 0.8) return 'warning';
  return 'ok';
}

/** Transaction qui règle une charge fixe pour un mois donné, si elle existe. */
export function recurringPayment(item: RecurringItem, txs: Transaction[], key: MonthKey): Transaction | undefined {
  return txs.find((t) => t.recurringId === item.id && monthKey(t.date) === key);
}

/** Jour d'échéance d'une charge fixe dans un mois (plafonné au dernier jour du mois). */
export function recurringDueDate(item: RecurringItem, key: MonthKey, daysInMonth: number): string {
  const day = Math.min(item.dayOfMonth, daysInMonth);
  return `${key}-${String(day).padStart(2, '0')}`;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export CSV (séparateur « ; », compatible Excel en français). */
export function transactionsToCSV(txs: Transaction[], categories: FinanceCategory[]): string {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const header = ['Date', 'Type', 'Catégorie', 'Montant', 'Note'];
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts)
    .map((t) => [
      t.date,
      t.type === 'income' ? 'Revenu' : 'Dépense',
      catName.get(t.categoryId) ?? t.categoryId,
      (t.type === 'income' ? t.amount : -t.amount).toFixed(2).replace('.', ','),
      t.note ?? '',
    ]);
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
}

export interface ZakatResult {
  net: number;
  nisab: number;
  due: number;
  eligible: boolean;
}

/** Zakat al-mal : 2,5 % de l'actif net si celui-ci atteint le nisab (85 g d'or ou 595 g d'argent). */
export function computeZakat(input: {
  cash: number;
  gold: number;
  silver: number;
  investments: number;
  receivables: number;
  debts: number;
  goldPricePerGram: number;
  silverPricePerGram: number;
  nisabBase: 'gold' | 'silver';
}): ZakatResult {
  const net = input.cash + input.gold + input.silver + input.investments + input.receivables - input.debts;
  const nisab = input.nisabBase === 'gold' ? 85 * input.goldPricePerGram : 595 * input.silverPricePerGram;
  const eligible = nisab > 0 && net >= nisab;
  return { net, nisab, due: eligible ? net * 0.025 : 0, eligible };
}

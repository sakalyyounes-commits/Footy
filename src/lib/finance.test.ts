import { describe, expect, it } from 'vitest';
import type { FinanceCategory, RecurringItem, Transaction } from '../store/types';
import {
  budgetState,
  computeZakat,
  monthTransactions,
  recurringDueDate,
  recurringPayment,
  spendingByCategory,
  totals,
  transactionsToCSV,
} from './finance';

const tx = (id: string, date: string, type: 'expense' | 'income', amount: number, categoryId: string, extra: Partial<Transaction> = {}): Transaction => ({
  id,
  date,
  type,
  amount,
  categoryId,
  ts: 0,
  ...extra,
});

const txs: Transaction[] = [
  tx('1', '2026-09-01', 'income', 10000, 'salaire'),
  tx('2', '2026-09-02', 'expense', 3500, 'logement', { recurringId: 'loyer' }),
  tx('3', '2026-09-05', 'expense', 800, 'courses', { note: 'Marjane; promo "rentrée"' }),
  tx('4', '2026-09-12', 'expense', 450.5, 'courses'),
  tx('5', '2026-08-30', 'expense', 999, 'courses'),
];

describe('finances', () => {
  it('filtre par mois et totalise', () => {
    const sept = monthTransactions(txs, '2026-09');
    expect(sept).toHaveLength(4);
    const t = totals(sept);
    expect(t.income).toBe(10000);
    expect(t.expense).toBe(4750.5);
    expect(t.balance).toBe(5249.5);
    expect(t.savingsRate).toBeCloseTo(0.52495);
    expect(totals([]).savingsRate).toBeNull();
  });

  it('classe les dépenses par catégorie', () => {
    expect(spendingByCategory(monthTransactions(txs, '2026-09'))).toEqual([
      { categoryId: 'logement', amount: 3500 },
      { categoryId: 'courses', amount: 1250.5 },
    ]);
  });

  it('signale les budgets proches ou dépassés', () => {
    expect(budgetState(500, 1000)).toBe('ok');
    expect(budgetState(800, 1000)).toBe('warning');
    expect(budgetState(1000, 1000)).toBe('warning');
    expect(budgetState(1001, 1000)).toBe('over');
  });

  it('retrouve le paiement d’une charge fixe', () => {
    const loyer: RecurringItem = { id: 'loyer', name: 'Loyer', type: 'expense', amount: 3500, categoryId: 'logement', dayOfMonth: 31, active: true };
    expect(recurringPayment(loyer, txs, '2026-09')?.id).toBe('2');
    expect(recurringPayment(loyer, txs, '2026-10')).toBeUndefined();
    expect(recurringDueDate(loyer, '2026-02', 28)).toBe('2026-02-28');
    expect(recurringDueDate({ ...loyer, dayOfMonth: 5 }, '2026-02', 28)).toBe('2026-02-05');
  });

  it('exporte un CSV lisible par Excel', () => {
    const cats: FinanceCategory[] = [
      { id: 'courses', name: 'Courses', type: 'expense', emoji: '🛒', budget: null },
      { id: 'salaire', name: 'Salaire', type: 'income', emoji: '💼', budget: null },
    ];
    const csv = transactionsToCSV([txs[0], txs[2]], cats);
    const lines = csv.replace('﻿', '').split('\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0]).toBe('Date;Type;Catégorie;Montant;Note');
    expect(lines[1]).toBe('2026-09-01;Revenu;Salaire;10000,00;');
    expect(lines[2]).toBe('2026-09-05;Dépense;Courses;-800,00;"Marjane; promo ""rentrée"""');
  });

  it('calcule la zakat au-dessus du nisab', () => {
    const base = { cash: 0, gold: 0, silver: 0, investments: 0, receivables: 0, debts: 0, goldPricePerGram: 1000, silverPricePerGram: 10, nisabBase: 'gold' as const };
    const rich = computeZakat({ ...base, cash: 100_000, debts: 10_000 });
    expect(rich.nisab).toBe(85_000);
    expect(rich.net).toBe(90_000);
    expect(rich.eligible).toBe(true);
    expect(rich.due).toBe(2250);
    const below = computeZakat({ ...base, cash: 50_000 });
    expect(below.eligible).toBe(false);
    expect(below.due).toBe(0);
    const silver = computeZakat({ ...base, cash: 50_000, nisabBase: 'silver' });
    expect(silver.nisab).toBe(5950);
    expect(silver.due).toBe(1250);
    expect(computeZakat({ ...base, cash: 50_000, goldPricePerGram: 0 }).eligible).toBe(false);
  });
});

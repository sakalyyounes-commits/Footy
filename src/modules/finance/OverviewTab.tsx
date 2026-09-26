import { CircleAlert, Minus, Plus, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { GroupedBarChart } from '../../components/charts/GroupedBarChart';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/layout';
import { Meter, Stat } from '../../components/ui/progress';
import { daysInMonth, formatMonth, formatMonthShort, lastNMonths, todayISO, type MonthKey } from '../../lib/dates';
import { budgetState, monthTransactions, recurringDueDate, recurringPayment, spendingByCategory, totals } from '../../lib/finance';
import { formatCompact, formatMoney, formatPercent } from '../../lib/format';
import { useStore } from '../../store/store';
import type { TxType } from '../../store/types';
import { payRecurring } from './actions';

export function BudgetBadge({ spent, budget }: { spent: number; budget: number }) {
  const state = budgetState(spent, budget);
  if (state === 'ok') return null;
  return state === 'over' ? (
    <span className="badge critical">
      <CircleAlert size={12} /> Dépassé
    </span>
  ) : (
    <span className="badge warning">
      <TriangleAlert size={12} /> Bientôt atteint
    </span>
  );
}

export function OverviewTab({ month, onAdd }: { month: MonthKey; onAdd: (type: TxType) => void }) {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const recurring = useStore((s) => s.recurring);
  const currency = useStore((s) => s.settings.currency);
  const money = (n: number) => formatMoney(n, currency);

  const monthTx = useMemo(() => monthTransactions(transactions, month), [transactions, month]);
  const t = totals(monthTx);
  const byCategory = spendingByCategory(monthTx);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const budgetTotal = categories.filter((c) => c.type === 'expense' && c.budget).reduce((a, c) => a + (c.budget ?? 0), 0);
  const budgetedSpent = byCategory.filter((b) => catMap.get(b.categoryId)?.budget).reduce((a, b) => a + b.amount, 0);
  const topAmount = byCategory[0]?.amount ?? 0;

  const today = todayISO();
  const isCurrentMonth = month === today.slice(0, 7);
  const dayOfMonth = isCurrentMonth ? Number(today.slice(8)) : daysInMonth(month);
  const dailyAvg = dayOfMonth ? t.expense / dayOfMonth : 0;

  const due = recurring
    .filter((r) => r.active && !recurringPayment(r, transactions, month))
    .sort((a, b) => a.dayOfMonth - b.dayOfMonth);

  const months = lastNMonths(6, month);
  const trend = months.map((m) => {
    const tt = totals(monthTransactions(transactions, m));
    return { key: m, label: formatMonthShort(m), fullLabel: formatMonth(m), values: [tt.income, tt.expense] };
  });
  const hasTrend = trend.some((d) => d.values[0] || d.values[1]);

  return (
    <div className="stack-lg">
      <div className="stats cols-4">
        <Stat label="Revenus" value={money(t.income)} />
        <Stat label="Dépenses" value={money(t.expense)} sub={`≈ ${money(Math.round(dailyAvg))} / jour`} />
        <Stat label="Solde du mois" value={<span className={t.balance < 0 ? 'critical-text' : undefined}>{formatMoney(t.balance, currency, { signed: true })}</span>} />
        <Stat label="Taux d’épargne" value={t.savingsRate === null ? '—' : formatPercent(Math.max(t.savingsRate, -9.99))} sub="des revenus" />
      </div>

      <div className="row">
        <button type="button" className="btn btn-primary grow" onClick={() => onAdd('expense')}>
          <Minus size={18} /> Dépense
        </button>
        <button type="button" className="btn btn-secondary grow" onClick={() => onAdd('income')}>
          <Plus size={18} /> Revenu
        </button>
      </div>

      <div className="grid cols-2">
        <Card title="Où va mon argent" subtitle={formatMonth(month)} accent="finance">
          {byCategory.length === 0 ? (
            <EmptyState emoji="🧾" title="Aucune dépense ce mois-ci" text="Ajoutez vos dépenses pour voir leur répartition." />
          ) : (
            <div className="stack">
              {budgetTotal > 0 && (
                <div className="stack-xs">
                  <div className="row between small">
                    <span className="bold">Budget global</span>
                    <span className="muted">
                      {money(budgetedSpent)} / {money(budgetTotal)}
                    </span>
                  </div>
                  <Meter value={budgetedSpent} max={budgetTotal} state={budgetState(budgetedSpent, budgetTotal)} label="Budget global consommé" />
                </div>
              )}
              {byCategory.slice(0, 8).map((b) => {
                const cat = catMap.get(b.categoryId);
                return (
                  <div key={b.categoryId} className="stack-xs">
                    <div className="row between small">
                      <span className="truncate grow">
                        <span aria-hidden>{cat?.emoji ?? '📦'}</span> {cat?.name ?? 'Catégorie supprimée'}
                      </span>
                      <strong className="nowrap">{money(b.amount)}</strong>
                    </div>
                    <Meter value={b.amount} max={topAmount} thin label={`${cat?.name ?? ''} : ${money(b.amount)}`} />
                    <div className="row wrap xsmall muted" style={{ gap: '2px 6px' }}>
                      <span className="nowrap">{formatPercent(b.amount / t.expense)} des dépenses</span>
                      {cat?.budget ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="nowrap">budget {money(cat.budget)}</span>
                          <BudgetBadge spent={b.amount} budget={cat.budget} />
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Charges fixes à venir" subtitle={due.length ? `${due.length} restante${due.length > 1 ? 's' : ''} ce mois` : 'Tout est réglé ✓'} accent="finance">
          {recurring.length === 0 ? (
            <p className="muted small">Loyer, abonnements, salaire… Ajoutez-les dans l’onglet « Charges fixes » pour les suivre chaque mois.</p>
          ) : due.length === 0 ? (
            <p className="muted small">Toutes les charges fixes de {formatMonth(month).toLowerCase()} sont enregistrées.</p>
          ) : (
            <div className="list">
              {due.slice(0, 6).map((r) => {
                const cat = catMap.get(r.categoryId);
                const dueDate = recurringDueDate(r, month, daysInMonth(month));
                const late = isCurrentMonth && dueDate < today;
                return (
                  <div key={r.id} className="list-item">
                    <span className="emoji-chip" aria-hidden>
                      {cat?.emoji ?? '📦'}
                    </span>
                    <div className="grow">
                      <div className="item-title">{r.name}</div>
                      <div className={late ? 'item-meta critical-text' : 'item-meta'}>
                        {money(r.amount)} · le {r.dayOfMonth}
                        {late ? ' · en retard' : ''}
                      </div>
                    </div>
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => payRecurring(r, month)}>
                      {r.type === 'income' ? 'Reçu' : 'Payé'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card title="6 derniers mois" subtitle="Revenus et dépenses">
        {hasTrend ? (
          <GroupedBarChart
            title="Revenus et dépenses sur 6 mois"
            series={[
              { name: 'Revenus', color: 'var(--series-1)' },
              { name: 'Dépenses', color: 'var(--series-2)' },
            ]}
            data={trend}
            formatValue={money}
            formatTick={formatCompact}
          />
        ) : (
          <p className="muted small">Le graphique apparaîtra avec vos premières transactions.</p>
        )}
      </Card>
    </div>
  );
}

import { Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/layout';
import { formatRelativeDay, todayISO, type MonthKey } from '../../lib/dates';
import { monthTransactions, transactionsToCSV } from '../../lib/finance';
import { formatMoney } from '../../lib/format';
import { downloadFile, groupBy, normalize } from '../../lib/misc';
import { useStore } from '../../store/store';
import type { Transaction } from '../../store/types';

type Filter = 'all' | 'expense' | 'income';

export function TransactionsTab({ month, onEdit }: { month: MonthKey; onEdit: (tx: Transaction) => void }) {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const today = todayISO();
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const groups = useMemo(() => {
    const q = normalize(query);
    const list = monthTransactions(transactions, month)
      .filter((t) => filter === 'all' || t.type === filter)
      .filter((t) => !q || normalize(`${t.note ?? ''} ${catMap.get(t.categoryId)?.name ?? ''}`).includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
    return Object.entries(groupBy(list, (t) => t.date));
  }, [transactions, month, filter, query, catMap]);

  const exportCsv = () => {
    downloadFile(`hayati-transactions-${month}.csv`, transactionsToCSV(monthTransactions(transactions, month), categories), 'text/csv;charset=utf-8');
  };

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <div className="input-wrap">
          <input
            className="input"
            type="search"
            placeholder="Rechercher une note ou une catégorie"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher une transaction"
            style={{ paddingLeft: 40 }}
          />
          <Search size={18} className="subtle" style={{ position: 'absolute', left: 12, top: 14 }} aria-hidden />
        </div>
        <div className="row between wrap">
          <div className="chips accent-finance" role="radiogroup" aria-label="Filtre">
            {(
              [
                ['all', 'Tout'],
                ['expense', 'Dépenses'],
                ['income', 'Revenus'],
              ] as const
            ).map(([v, label]) => (
              <button key={v} type="button" className="chip" role="radio" aria-checked={filter === v} onClick={() => setFilter(v)}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      <Card>
        {groups.length === 0 ? (
          <EmptyState emoji="💸" title="Aucune transaction" text="Rien à afficher pour ce mois et ce filtre." />
        ) : (
          groups.map(([date, items]) => {
            const net = items.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);
            return (
              <div key={date}>
                <div className="list-group-title">
                  <span>{formatRelativeDay(date, today)}</span>
                  <span className="num">{formatMoney(net, currency, { signed: true })}</span>
                </div>
                <div className="list">
                  {items.map((t) => {
                    const cat = catMap.get(t.categoryId);
                    return (
                      <button key={t.id} type="button" className="list-item" onClick={() => onEdit(t)}>
                        <span className="emoji-chip" aria-hidden>
                          {cat?.emoji ?? '📦'}
                        </span>
                        <div className="grow">
                          <div className="item-title">{t.note || cat?.name || 'Transaction'}</div>
                          <div className="item-meta">
                            {cat?.name ?? 'Catégorie supprimée'}
                            {t.recurringId ? ' · charge fixe' : ''}
                          </div>
                        </div>
                        <span className={t.type === 'income' ? 'bold good-text nowrap' : 'bold nowrap'}>
                          {formatMoney(t.type === 'income' ? t.amount : -t.amount, currency, { signed: true })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

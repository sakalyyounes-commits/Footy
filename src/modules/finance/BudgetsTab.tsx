import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Segmented } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { Meter } from '../../components/ui/progress';
import { Sheet } from '../../components/ui/Sheet';
import { FINANCE_EMOJIS } from '../../data/categories';
import { formatMonth, type MonthKey } from '../../lib/dates';
import { budgetState, monthTransactions, spendingByCategory } from '../../lib/finance';
import { currencySymbol, formatMoney } from '../../lib/format';
import { uid } from '../../lib/misc';
import { useStore } from '../../store/store';
import type { FinanceCategory, TxType } from '../../store/types';
import { deleteCategory, saveCategory, setBudget } from './actions';
import { BudgetBadge } from './OverviewTab';

function CategoryForm({ category, onDone }: { category: FinanceCategory | null; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [emoji, setEmoji] = useState(category?.emoji ?? '📦');
  const [type, setType] = useState<TxType>(category?.type ?? 'expense');

  return (
    <div className="stack">
      <Segmented
        ariaLabel="Type de catégorie"
        value={type}
        onChange={setType}
        options={[
          { value: 'expense', label: 'Dépense' },
          { value: 'income', label: 'Revenu' },
        ]}
      />
      <Field label="Nom">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Café & thé" data-autofocus />}</Field>
      <div className="field">
        <span className="field-label">Icône</span>
        <div className="chips">
          {FINANCE_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="chip"
              aria-pressed={emoji === e}
              aria-label={`Icône ${e}`}
              onClick={() => setEmoji(e)}
              style={{ fontSize: 18, padding: '0 10px' }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="sheet-actions">
        {category && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              deleteCategory(category.id);
              onDone();
            }}
          >
            <Trash2 size={16} /> Supprimer
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary grow"
          disabled={!name.trim()}
          onClick={() => {
            saveCategory({ id: category?.id ?? uid(), name: name.trim(), emoji, type, budget: category?.budget ?? null, archived: false });
            onDone();
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

export function BudgetsTab({ month }: { month: MonthKey }) {
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const currency = useStore((s) => s.settings.currency);
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [open, setOpen] = useState(false);

  const spent = useMemo(() => new Map(spendingByCategory(monthTransactions(transactions, month)).map((b) => [b.categoryId, b.amount])), [transactions, month]);
  const expenseCats = categories.filter((c) => c.type === 'expense' && !c.archived);
  const incomeCats = categories.filter((c) => c.type === 'income' && !c.archived);
  const totalBudget = expenseCats.reduce((a, c) => a + (c.budget ?? 0), 0);

  const openCategory = (c: FinanceCategory | null) => {
    setEditing(c);
    setOpen(true);
  };

  return (
    <div className="stack-lg">
      <Card
        title="Budgets mensuels"
        subtitle={totalBudget ? `Total : ${formatMoney(totalBudget, currency)} · ${formatMonth(month)}` : 'Fixez un plafond par catégorie'}
        accent="finance"
        action={
          <button type="button" className="btn btn-soft btn-sm" onClick={() => openCategory(null)}>
            <Plus size={16} /> Catégorie
          </button>
        }
      >
        <div className="list">
          {expenseCats.map((c) => {
            const s = spent.get(c.id) ?? 0;
            return (
              <div key={c.id} className="list-item" style={{ flexWrap: 'wrap' }}>
                <span className="emoji-chip" aria-hidden>
                  {c.emoji}
                </span>
                <div className="grow" style={{ minWidth: 140 }}>
                  <div className="item-title row" style={{ gap: 6 }}>
                    <span className="truncate">{c.name}</span>
                    {c.budget ? <BudgetBadge spent={s} budget={c.budget} /> : null}
                  </div>
                  <div className="item-meta">
                    {formatMoney(s, currency)} dépensés{c.budget ? ` · reste ${formatMoney(Math.max(0, c.budget - s), currency)}` : ''}
                  </div>
                </div>
                <div style={{ width: 132 }}>
                  <NumberInput
                    value={c.budget}
                    onChange={(v) => setBudget(c.id, v)}
                    suffix={currencySymbol(currency)}
                    placeholder="Budget"
                    min={0}
                    ariaLabel={`Budget ${c.name}`}
                  />
                </div>
                <button type="button" className="icon-btn sm" onClick={() => openCategory(c)} aria-label={`Modifier ${c.name}`}>
                  <Pencil size={16} />
                </button>
                {c.budget ? (
                  <div style={{ flexBasis: '100%' }}>
                    <Meter value={s} max={c.budget} state={budgetState(s, c.budget)} thin label={`Budget ${c.name}`} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Catégories de revenus" accent="finance">
        <div className="chips">
          {incomeCats.map((c) => (
            <button key={c.id} type="button" className="chip" onClick={() => openCategory(c)}>
              <span aria-hidden>{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'} accent="finance">
        <CategoryForm category={editing} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  );
}

import { Plus, Repeat } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Segmented, Switch } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { EmptyState } from '../../components/ui/layout';
import { Sheet } from '../../components/ui/Sheet';
import { formatMonth, formatShort, type MonthKey } from '../../lib/dates';
import { recurringPayment } from '../../lib/finance';
import { currencySymbol, formatMoney } from '../../lib/format';
import { uid } from '../../lib/misc';
import { useStore } from '../../store/store';
import type { RecurringItem, TxType } from '../../store/types';
import { payRecurring, removeRecurring, removeTransaction, saveRecurring } from './actions';

function RecurringForm({ item, onDone }: { item: RecurringItem | null; onDone: () => void }) {
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState<TxType>(item?.type ?? 'expense');
  const [amount, setAmount] = useState<number | null>(item?.amount ?? null);
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? '');
  const [day, setDay] = useState<number | null>(item?.dayOfMonth ?? 1);
  const [active, setActive] = useState(item?.active ?? true);
  const cats = categories.filter((c) => c.type === type && !c.archived);
  const valid = name.trim() && amount && amount > 0 && cats.some((c) => c.id === categoryId) && day;

  return (
    <div className="stack">
      <Segmented
        ariaLabel="Type"
        value={type}
        onChange={(t) => {
          setType(t);
          setCategoryId('');
        }}
        options={[
          { value: 'expense', label: 'Charge' },
          { value: 'income', label: 'Revenu fixe' },
        ]}
      />
      <Field label="Nom">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Loyer, Internet, Salaire" data-autofocus />}</Field>
      <div className="form-row">
        <Field label="Montant">{(id) => <NumberInput id={id} value={amount} onChange={setAmount} suffix={currencySymbol(currency)} min={0} />}</Field>
        <Field label="Jour du mois">{(id) => <NumberInput id={id} value={day} onChange={setDay} decimals={false} min={1} max={31} />}</Field>
      </div>
      <Field label="Catégorie">
        {(id) => (
          <select id={id} className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="" disabled>
              Choisir…
            </option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Switch checked={active} onChange={setActive} label="Active" description="Désactivez-la sans la supprimer (ex. abonnement en pause)" />
      <div className="sheet-actions">
        {item && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              removeRecurring(item.id);
              onDone();
            }}
          >
            Supprimer
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary grow"
          disabled={!valid}
          onClick={() => {
            if (!valid || !amount || !day) return;
            saveRecurring({ id: item?.id ?? uid(), name: name.trim(), type, amount, categoryId, dayOfMonth: day, active });
            onDone();
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

export function RecurringTab({ month }: { month: MonthKey }) {
  const recurring = useStore((s) => s.recurring);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const [editing, setEditing] = useState<RecurringItem | null>(null);
  const [open, setOpen] = useState(false);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const sorted = [...recurring].sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  const monthlyOut = recurring.filter((r) => r.active && r.type === 'expense').reduce((a, r) => a + r.amount, 0);
  const monthlyIn = recurring.filter((r) => r.active && r.type === 'income').reduce((a, r) => a + r.amount, 0);

  const openItem = (r: RecurringItem | null) => {
    setEditing(r);
    setOpen(true);
  };

  return (
    <div className="stack-lg">
      <Card
        title="Charges & revenus fixes"
        subtitle={`Charges : ${formatMoney(monthlyOut, currency)} / mois · Revenus : ${formatMoney(monthlyIn, currency)} / mois`}
        icon={<Repeat size={18} />}
        accent="finance"
        action={
          <button type="button" className="btn btn-soft btn-sm" onClick={() => openItem(null)}>
            <Plus size={16} /> Ajouter
          </button>
        }
      >
        {sorted.length === 0 ? (
          <EmptyState
            emoji="🔁"
            title="Aucune charge fixe"
            text="Loyer, factures, abonnements, crédit, salaire… Un toucher suffit ensuite chaque mois pour les enregistrer."
          />
        ) : (
          <div className="list">
            {sorted.map((r) => {
              const paid = recurringPayment(r, transactions, month);
              const cat = catMap.get(r.categoryId);
              return (
                <div key={r.id} className="list-item" style={{ opacity: r.active ? 1 : 0.55 }}>
                  <span className="emoji-chip" aria-hidden>
                    {cat?.emoji ?? '📦'}
                  </span>
                  <button type="button" className="plain-btn grow" onClick={() => openItem(r)}>
                    <div className="item-title">{r.name}</div>
                    <div className="item-meta">
                      {formatMoney(r.amount, currency)} · le {r.dayOfMonth} du mois{r.active ? '' : ' · en pause'}
                    </div>
                  </button>
                  {r.active &&
                    (paid ? (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeTransaction(paid.id)} title="Annuler le paiement">
                        ✓ {formatShort(paid.date)}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-soft btn-sm" onClick={() => payRecurring(r, month)}>
                        {r.type === 'income' ? 'Reçu' : 'Payé'}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        )}
        {sorted.length > 0 && <p className="xsmall muted" style={{ marginTop: 8 }}>Statut pour {formatMonth(month).toLowerCase()}. Touchez un élément pour le modifier.</p>}
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier' : 'Nouvelle charge fixe'} accent="finance">
        <RecurringForm item={editing} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  );
}

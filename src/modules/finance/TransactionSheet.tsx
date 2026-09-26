import { useState } from 'react';
import { Segmented } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { Sheet } from '../../components/ui/Sheet';
import { toast } from '../../components/ui/toast';
import { isISODate, todayISO } from '../../lib/dates';
import { currencySymbol, formatMoney } from '../../lib/format';
import { uid } from '../../lib/misc';
import { useStore } from '../../store/store';
import type { Transaction, TxType } from '../../store/types';
import { removeTransaction, saveTransaction } from './actions';

interface Props {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  defaultType?: TxType;
}

export function TransactionSheet({ open, onClose, transaction, defaultType = 'expense' }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={transaction ? 'Modifier' : 'Nouvelle transaction'} accent="finance">
      <TransactionForm transaction={transaction ?? null} defaultType={defaultType} onDone={onClose} />
    </Sheet>
  );
}

function TransactionForm({ transaction, defaultType, onDone }: { transaction: Transaction | null; defaultType: TxType; onDone: () => void }) {
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const [type, setType] = useState<TxType>(transaction?.type ?? defaultType);
  const [amount, setAmount] = useState<number | null>(transaction?.amount ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.categoryId ?? null);
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [note, setNote] = useState(transaction?.note ?? '');

  const available = categories.filter((c) => c.type === type && (!c.archived || c.id === categoryId));
  const category = available.find((c) => c.id === categoryId) ?? null;
  const valid = !!amount && amount > 0 && !!category;

  const submit = () => {
    if (!valid || !amount || !category) return;
    saveTransaction({
      id: transaction?.id ?? uid(),
      date,
      type,
      amount,
      categoryId: category.id,
      note: note.trim() || undefined,
      recurringId: transaction?.recurringId,
      ts: transaction?.ts ?? Date.now(),
    });
    toast(`${type === 'expense' ? 'Dépense' : 'Revenu'} de ${formatMoney(amount, currency)} enregistré`);
    onDone();
  };

  return (
    <div className="stack">
      <Segmented
        ariaLabel="Type"
        value={type}
        onChange={(t) => {
          setType(t);
          setCategoryId(null);
        }}
        options={[
          { value: 'expense', label: 'Dépense' },
          { value: 'income', label: 'Revenu' },
        ]}
      />
      <NumberInput
        value={amount}
        onChange={setAmount}
        className="input-amount"
        suffix={currencySymbol(currency)}
        placeholder="0"
        min={0}
        autoFocus
        ariaLabel="Montant"
      />
      <div className="chip-grid accent-finance" role="radiogroup" aria-label="Catégorie">
        {available.map((c) => (
          <button key={c.id} type="button" className="tile-btn" role="radio" aria-checked={c.id === categoryId} onClick={() => setCategoryId(c.id)}>
            <span className="tile-emoji" aria-hidden>
              {c.emoji}
            </span>
            {c.name}
          </button>
        ))}
      </div>
      <div className="form-row">
        <Field label="Date">
          {(id) => <input id={id} type="date" className="input" value={date} onChange={(e) => isISODate(e.target.value) && setDate(e.target.value)} />}
        </Field>
        <Field label="Note">{(id) => <input id={id} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. Marjane" />}</Field>
      </div>
      <div className="sheet-actions">
        {transaction && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              removeTransaction(transaction.id);
              onDone();
            }}
          >
            Supprimer
          </button>
        )}
        <button type="button" className="btn btn-primary btn-lg grow" disabled={!valid} onClick={submit}>
          {transaction ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
      {!category && amount ? <p className="field-hint center">Choisissez une catégorie.</p> : null}
    </div>
  );
}

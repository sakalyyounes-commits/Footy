import { PiggyBank, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Segmented } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { EmptyState } from '../../components/ui/layout';
import { Meter } from '../../components/ui/progress';
import { Sheet } from '../../components/ui/Sheet';
import { FINANCE_EMOJIS } from '../../data/categories';
import { diffDays, formatFull, isISODate, todayISO } from '../../lib/dates';
import { currencySymbol, formatMoney, formatPercent } from '../../lib/format';
import { uid } from '../../lib/misc';
import { useStore } from '../../store/store';
import type { SavingsGoal } from '../../store/types';
import { adjustSavings, removeSavingsGoal, saveSavingsGoal } from './actions';

function GoalForm({ goal, onDone }: { goal: SavingsGoal | null; onDone: () => void }) {
  const currency = useStore((s) => s.settings.currency);
  const [name, setName] = useState(goal?.name ?? '');
  const [emoji, setEmoji] = useState(goal?.emoji ?? '🏦');
  const [target, setTarget] = useState<number | null>(goal?.target ?? null);
  const [saved, setSaved] = useState<number | null>(goal?.saved ?? 0);
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');

  return (
    <div className="stack">
      <Field label="Objectif">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Fonds d’urgence, Omra, voiture" data-autofocus />}</Field>
      <div className="chips">
        {FINANCE_EMOJIS.slice(0, 24).map((e) => (
          <button key={e} type="button" className="chip" aria-pressed={emoji === e} aria-label={`Icône ${e}`} onClick={() => setEmoji(e)} style={{ fontSize: 18, padding: '0 10px' }}>
            {e}
          </button>
        ))}
      </div>
      <div className="form-row">
        <Field label="Montant visé">{(id) => <NumberInput id={id} value={target} onChange={setTarget} suffix={currencySymbol(currency)} min={0} />}</Field>
        <Field label="Déjà épargné">{(id) => <NumberInput id={id} value={saved} onChange={setSaved} suffix={currencySymbol(currency)} min={0} />}</Field>
      </div>
      <Field label="Échéance (optionnel)">
        {(id) => <input id={id} type="date" className="input" value={deadline} min={todayISO()} onChange={(e) => setDeadline(e.target.value)} />}
      </Field>
      <div className="sheet-actions">
        {goal && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              removeSavingsGoal(goal.id);
              onDone();
            }}
          >
            Supprimer
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary grow"
          disabled={!name.trim() || !target}
          onClick={() => {
            if (!target) return;
            saveSavingsGoal({
              id: goal?.id ?? uid(),
              name: name.trim(),
              emoji,
              target,
              saved: saved ?? 0,
              deadline: isISODate(deadline) ? deadline : null,
              createdAt: goal?.createdAt ?? todayISO(),
            });
            onDone();
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function MoveForm({ goal, onDone }: { goal: SavingsGoal; onDone: () => void }) {
  const currency = useStore((s) => s.settings.currency);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState<number | null>(null);
  return (
    <div className="stack">
      <Segmented
        ariaLabel="Mouvement"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'in', label: 'Mettre de côté' },
          { value: 'out', label: 'Retirer' },
        ]}
      />
      <NumberInput value={amount} onChange={setAmount} className="input-amount" suffix={currencySymbol(currency)} placeholder="0" min={0} autoFocus ariaLabel="Montant" />
      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={!amount}
        onClick={() => {
          if (amount) adjustSavings(goal.id, direction === 'in' ? amount : -amount);
          onDone();
        }}
      >
        Valider
      </button>
    </div>
  );
}

export function SavingsTab() {
  const savings = useStore((s) => s.savings);
  const currency = useStore((s) => s.settings.currency);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [moving, setMoving] = useState<SavingsGoal | null>(null);
  const today = todayISO();
  const totalSaved = savings.reduce((a, g) => a + g.saved, 0);

  const openForm = (g: SavingsGoal | null) => {
    setEditing(g);
    setFormOpen(true);
  };

  return (
    <div className="stack-lg">
      <Card
        title="Objectifs d’épargne"
        subtitle={savings.length ? `${formatMoney(totalSaved, currency)} mis de côté au total` : 'Fonds d’urgence, Omra, mariage, voiture…'}
        icon={<PiggyBank size={18} />}
        accent="finance"
        action={
          <button type="button" className="btn btn-soft btn-sm" onClick={() => openForm(null)}>
            <Plus size={16} /> Objectif
          </button>
        }
      >
        {savings.length === 0 ? (
          <EmptyState emoji="🐷" title="Aucun objectif" text="Commencez par un fonds d’urgence : 3 à 6 mois de dépenses." />
        ) : (
          <div className="stack-lg">
            {savings.map((g) => {
              const left = Math.max(0, g.target - g.saved);
              const days = g.deadline ? diffDays(g.deadline, today) : null;
              const months = days !== null ? Math.max(1, Math.ceil(days / 30.44)) : null;
              return (
                <div key={g.id} className="stack-sm">
                  <div className="row">
                    <span className="emoji-chip" aria-hidden>
                      {g.emoji}
                    </span>
                    <div className="grow">
                      <div className="bold truncate">{g.name}</div>
                      <div className="small muted">
                        {formatMoney(g.saved, currency)} / {formatMoney(g.target, currency)} · {formatPercent(Math.min(1, g.saved / g.target))}
                      </div>
                    </div>
                    <button type="button" className="icon-btn sm" onClick={() => openForm(g)} aria-label={`Modifier ${g.name}`}>
                      <Pencil size={16} />
                    </button>
                  </div>
                  <Meter value={g.saved} max={g.target} label={`Progression ${g.name}`} />
                  <div className="row between wrap">
                    <span className="xsmall muted">
                      {left === 0
                        ? 'Objectif atteint 🎉'
                        : g.deadline && months
                          ? days! < 0
                            ? `Échéance dépassée (${formatFull(g.deadline)})`
                            : `${formatMoney(Math.ceil(left / months), currency)} / mois jusqu’au ${formatFull(g.deadline)}`
                          : `Reste ${formatMoney(left, currency)}`}
                    </span>
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => setMoving(g)}>
                      Mettre de côté
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Modifier l’objectif' : 'Nouvel objectif'} accent="finance">
        <GoalForm goal={editing} onDone={() => setFormOpen(false)} />
      </Sheet>
      <Sheet open={moving !== null} onClose={() => setMoving(null)} title={moving?.name ?? ''} accent="finance">
        {moving && <MoveForm goal={moving} onDone={() => setMoving(null)} />}
      </Sheet>
    </div>
  );
}

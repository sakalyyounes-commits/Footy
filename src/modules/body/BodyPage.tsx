import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { LineChart } from '../../components/charts/LineChart';
import { Card } from '../../components/ui/Card';
import { Field, NumberInput } from '../../components/ui/Field';
import { EmptyState, PageHeader } from '../../components/ui/layout';
import { Stat } from '../../components/ui/progress';
import { Sheet } from '../../components/ui/Sheet';
import { toast } from '../../components/ui/toast';
import { addDays, diffDays, formatRelativeDay, formatShort, isISODate, todayISO } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { bmi, bmiCategory } from '../../lib/health';
import { useToday } from '../../lib/hooks';
import { uid } from '../../lib/misc';
import { removeItem } from '../../store/helpers';
import { update, useStore } from '../../store/store';
import type { WeightEntry } from '../../store/types';

/** Enregistre une pesée (une seule par date). */
export function saveWeight(entry: WeightEntry): void {
  update((s) => ({ weights: [...s.weights.filter((w) => w.id !== entry.id && w.date !== entry.date), entry] }));
}

export function WeightSheet({ open, onClose, entry }: { open: boolean; onClose: () => void; entry?: WeightEntry | null }) {
  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Modifier la pesée' : 'Nouvelle pesée'} accent="body">
      <WeightForm entry={entry ?? null} onDone={onClose} />
    </Sheet>
  );
}

function WeightForm({ entry, onDone }: { entry: WeightEntry | null; onDone: () => void }) {
  const weights = useStore((s) => s.weights);
  const last = useMemo(() => [...weights].sort((a, b) => b.date.localeCompare(a.date))[0], [weights]);
  const [date, setDate] = useState(entry?.date ?? todayISO());
  const [kg, setKg] = useState<number | null>(entry?.kg ?? last?.kg ?? null);
  const [waist, setWaist] = useState<number | null>(entry?.waistCm ?? null);
  const [fat, setFat] = useState<number | null>(entry?.bodyFatPct ?? null);

  return (
    <div className="stack">
      <Field label="Poids">{(id) => <NumberInput id={id} value={kg} onChange={setKg} suffix="kg" min={20} max={350} className="input-amount" autoFocus />}</Field>
      <Field label="Date">
        {(id) => <input id={id} type="date" className="input" value={date} max={todayISO()} onChange={(e) => isISODate(e.target.value) && setDate(e.target.value)} />}
      </Field>
      <div className="form-row">
        <Field label="Tour de taille (optionnel)">{(id) => <NumberInput id={id} value={waist} onChange={setWaist} suffix="cm" min={0} />}</Field>
        <Field label="Masse grasse (optionnel)">{(id) => <NumberInput id={id} value={fat} onChange={setFat} suffix="%" min={0} max={70} />}</Field>
      </div>
      <p className="field-hint">Conseil : pesez-vous le matin, à jeun, après être allé aux toilettes.</p>
      <div className="sheet-actions">
        {entry && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              removeItem('weights', entry.id, 'Pesée supprimée');
              onDone();
            }}
          >
            Supprimer
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary btn-lg grow"
          disabled={!kg}
          onClick={() => {
            if (!kg) return;
            saveWeight({ id: entry?.id ?? uid(), date, kg, waistCm: waist ?? undefined, bodyFatPct: fat ?? undefined });
            toast('Pesée enregistrée');
            onDone();
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

export function BodyPage() {
  const today = useToday();
  const weights = useStore((s) => s.weights);
  const profile = useStore((s) => s.profile);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WeightEntry | null>(null);

  const sorted = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights]);
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const monthAgo = [...sorted].reverse().find((w) => w.date <= addDays(today, -30));
  const delta30 = latest && monthAgo ? latest.kg - monthAgo.kg : null;
  const bmiValue = latest && profile.heightCm ? bmi(latest.kg, profile.heightCm) : null;
  const cat = bmiValue ? bmiCategory(bmiValue) : null;
  const toTarget = latest && profile.targetWeightKg ? latest.kg - profile.targetWeightKg : null;

  const recent = sorted.filter((w) => w.date >= addDays(today, -180));
  const base = recent[0]?.date ?? today;
  const points = recent.map((w) => ({ x: diffDays(w.date, base), label: formatShort(w.date), value: w.kg }));

  const openEntry = (e: WeightEntry | null) => {
    setEditing(e);
    setOpen(true);
  };

  return (
    <div className="stack-lg accent-body">
      <PageHeader
        title="Poids & corps"
        subtitle="Suivi du poids, IMC et mensurations"
        back={{ to: '/sante', label: 'Santé' }}
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openEntry(null)}>
            <Plus size={16} /> Pesée
          </button>
        }
      />

      {!latest ? (
        <Card>
          <EmptyState
            emoji="⚖️"
            title="Aucune pesée"
            text="Votre poids sert aussi à calculer vos besoins en eau et en calories."
            action={
              <button type="button" className="btn btn-primary" onClick={() => openEntry(null)}>
                Ajouter mon poids
              </button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="stats cols-4">
            <Stat label="Poids actuel" value={`${formatNumber(latest.kg, 1)} kg`} sub={formatRelativeDay(latest.date, today)} />
            <Stat
              label="Sur 30 jours"
              value={
                delta30 === null ? (
                  '—'
                ) : (
                  <span className="row" style={{ gap: 4 }}>
                    {delta30 < 0 ? <TrendingDown size={18} /> : delta30 > 0 ? <TrendingUp size={18} /> : null}
                    {`${delta30 > 0 ? '+' : delta30 < 0 ? '−' : ''}${formatNumber(Math.abs(delta30), 1)} kg`}
                  </span>
                )
              }
              sub={first && first.date !== latest.date ? `Départ : ${formatNumber(first.kg, 1)} kg` : undefined}
            />
            <Stat
              label="IMC"
              value={bmiValue ? formatNumber(bmiValue, 1) : '—'}
              sub={cat ? cat.label : <Link to="/reglages" className="accent-text">Ajoutez votre taille</Link>}
            />
            <Stat
              label="Objectif"
              value={profile.targetWeightKg ? `${formatNumber(profile.targetWeightKg, 1)} kg` : '—'}
              sub={
                toTarget === null ? (
                  <Link to="/reglages" className="accent-text">Définir un objectif</Link>
                ) : Math.abs(toTarget) < 0.05 ? (
                  'Atteint 🎉'
                ) : (
                  `${formatNumber(Math.abs(toTarget), 1)} kg à ${toTarget > 0 ? 'perdre' : 'prendre'}`
                )
              }
            />
          </div>

          <Card title="Évolution" subtitle="6 derniers mois">
            {points.length < 2 ? (
              <p className="muted small">Ajoutez au moins deux pesées pour voir la courbe.</p>
            ) : (
              <LineChart
                title="Évolution du poids"
                points={points}
                color="var(--c-body)"
                formatValue={(v) => `${formatNumber(v, 1)} kg`}
                formatTick={(v) => formatNumber(v, 1)}
                formatX={(x) => formatShort(addDays(base, x))}
                goal={profile.targetWeightKg}
                valueHeader="Poids"
              />
            )}
          </Card>

          <Card title="Historique">
            <div className="list">
              {[...sorted].reverse().slice(0, 40).map((w) => {
                const details = [w.waistCm && `Tour de taille ${formatNumber(w.waistCm)} cm`, w.bodyFatPct && `Masse grasse ${formatNumber(w.bodyFatPct, 1)} %`]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <button key={w.id} type="button" className="list-item" onClick={() => openEntry(w)}>
                    <div className="grow">
                      <div className="item-title">{formatRelativeDay(w.date, today)}</div>
                      {details && <div className="item-meta">{details}</div>}
                    </div>
                    <span className="bold">{formatNumber(w.kg, 1)} kg</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <WeightSheet open={open} onClose={() => setOpen(false)} entry={editing} />
    </div>
  );
}

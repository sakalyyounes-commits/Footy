import { useState } from 'react';
import { Segmented } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { Sheet } from '../../components/ui/Sheet';
import { toast } from '../../components/ui/toast';
import { INTENSITY_LABELS, workoutType, WORKOUT_TYPES } from '../../data/workouts';
import { isISODate, todayISO } from '../../lib/dates';
import { formatKcal } from '../../lib/format';
import { workoutKcal } from '../../lib/health';
import { uid } from '../../lib/misc';
import { useLatestWeightKg } from '../../store/selectors';
import type { Intensity, Workout } from '../../store/types';
import { removeWorkout, saveWorkout } from './actions';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Séance à modifier (sinon création). */
  workout?: Workout | null;
}

export function WorkoutSheet({ open, onClose, workout }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={workout ? 'Modifier la séance' : 'Nouvelle séance'} accent="sport">
      <WorkoutForm workout={workout ?? null} onDone={onClose} />
    </Sheet>
  );
}

const DURATIONS = [15, 30, 45, 60, 90];

function WorkoutForm({ workout, onDone }: { workout: Workout | null; onDone: () => void }) {
  const weightKg = useLatestWeightKg();
  const [type, setType] = useState(workout?.type ?? 'musculation');
  const [date, setDate] = useState(workout?.date ?? todayISO());
  const [duration, setDuration] = useState<number | null>(workout?.durationMin ?? 45);
  const [intensity, setIntensity] = useState<Intensity>(workout?.intensity ?? 2);
  const [distance, setDistance] = useState<number | null>(workout?.distanceKm ?? null);
  const [note, setNote] = useState(workout?.note ?? '');

  const def = workoutType(type);
  const kcal = duration ? workoutKcal(def.met, weightKg, duration, intensity) : 0;

  const submit = () => {
    if (!duration) return;
    saveWorkout({
      id: workout?.id ?? uid(),
      date,
      type,
      durationMin: duration,
      intensity,
      kcal,
      distanceKm: def.distance && distance ? distance : undefined,
      note: note.trim() || undefined,
      ts: workout?.ts ?? Date.now(),
    });
    toast(workout ? 'Séance modifiée' : `${def.name} enregistré 💪`);
    onDone();
  };

  return (
    <div className="stack">
      <div className="chip-grid accent-sport" role="radiogroup" aria-label="Activité">
        {WORKOUT_TYPES.map((t) => (
          <button key={t.id} type="button" className="tile-btn" role="radio" aria-checked={t.id === type} onClick={() => setType(t.id)}>
            <span className="tile-emoji" aria-hidden>
              {t.emoji}
            </span>
            {t.name}
          </button>
        ))}
      </div>

      <Field label="Durée">
        {(id) => (
          <div className="stack-sm">
            <div className="chips accent-sport">
              {DURATIONS.map((d) => (
                <button key={d} type="button" className="chip" aria-pressed={duration === d} onClick={() => setDuration(d)}>
                  {d} min
                </button>
              ))}
            </div>
            <NumberInput id={id} value={duration} onChange={setDuration} suffix="min" decimals={false} min={1} max={600} />
          </div>
        )}
      </Field>

      <Field label="Intensité">
        {() => (
          <Segmented
            ariaLabel="Intensité"
            value={intensity}
            onChange={setIntensity}
            options={([1, 2, 3] as const).map((i) => ({ value: i, label: INTENSITY_LABELS[i] }))}
          />
        )}
      </Field>

      <div className="form-row">
        <Field label="Date">
          {(id) => (
            <input
              id={id}
              type="date"
              className="input"
              value={date}
              max={todayISO()}
              onChange={(e) => isISODate(e.target.value) && setDate(e.target.value)}
            />
          )}
        </Field>
        {def.distance ? (
          <Field label="Distance">{(id) => <NumberInput id={id} value={distance} onChange={setDistance} suffix="km" min={0} />}</Field>
        ) : (
          <div />
        )}
      </div>

      <Field label="Note (optionnel)">
        {(id) => (
          <input id={id} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. Pecs-triceps, 5×5 développé couché" />
        )}
      </Field>

      <div className="banner accent-sport">
        <span className="bold">≈ {formatKcal(kcal)}</span>
        <span className="muted small">dépensées (estimation selon l’activité, la durée et votre poids)</span>
      </div>

      <div className="sheet-actions">
        {workout && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              removeWorkout(workout.id);
              onDone();
            }}
          >
            Supprimer
          </button>
        )}
        <button type="button" className="btn btn-primary btn-lg grow" disabled={!duration} onClick={submit}>
          {workout ? 'Enregistrer' : 'Ajouter la séance'}
        </button>
      </div>
    </div>
  );
}

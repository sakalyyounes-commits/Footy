import { Archive, ArchiveRestore, Check, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Stepper } from '../../components/ui/controls';
import { Field } from '../../components/ui/Field';
import { EmptyState, PageHeader } from '../../components/ui/layout';
import { Stat } from '../../components/ui/progress';
import { Sheet } from '../../components/ui/Sheet';
import { addDays, formatLong, lastNDays, startOfWeek, todayISO, weekdayIndex, type ISODate } from '../../lib/dates';
import { formatPercent } from '../../lib/format';
import { useToday } from '../../lib/hooks';
import { cx, uid } from '../../lib/misc';
import { bestStreak, currentStreak } from '../../lib/streaks';
import { useStore } from '../../store/store';
import type { Habit } from '../../store/types';
import { deleteHabit, HABIT_EMOJIS, HABIT_SUGGESTIONS, saveHabit, setHabitArchived, tapHabit, WEEKDAYS, WEEKDAY_NAMES } from './actions';

export const isScheduled = (h: Habit, d: ISODate) => h.days.includes(weekdayIndex(d)) && d >= h.createdAt;

export function habitStreak(h: Habit, log: Record<ISODate, number> | undefined, today: ISODate): number {
  return currentStreak((d) => (log?.[d] ?? 0) >= h.target, today, (d) => isScheduled(h, d));
}

/** Bouton de validation d'une habitude (case ou compteur). */
export function HabitCheck({ habit, date }: { habit: Habit; date: ISODate }) {
  const count = useStore((s) => s.habitLogs[habit.id]?.[date] ?? 0);
  const done = count >= habit.target;
  return (
    <button
      type="button"
      className={cx('check-btn', habit.target > 1 && 'count', done ? 'done' : count > 0 && 'partial')}
      aria-pressed={done}
      aria-label={`${habit.name}${habit.target > 1 ? ` : ${count} sur ${habit.target}` : ''}`}
      onClick={() => tapHabit(habit, date)}
    >
      {habit.target > 1 && !done ? `${count}/${habit.target}` : <Check size={20} strokeWidth={3} />}
    </button>
  );
}

function HabitForm({ habit, onDone }: { habit: Habit | null; onDone: () => void }) {
  const [name, setName] = useState(habit?.name ?? '');
  const [emoji, setEmoji] = useState(habit?.emoji ?? '🎯');
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [target, setTarget] = useState(habit?.target ?? 1);

  return (
    <div className="stack">
      <Field label="Habitude">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Lire 20 minutes" data-autofocus />}</Field>
      <div className="field">
        <span className="field-label">Icône</span>
        <div className="chips accent-habits">
          {HABIT_EMOJIS.map((e) => (
            <button key={e} type="button" className="chip" aria-pressed={emoji === e} aria-label={`Icône ${e}`} onClick={() => setEmoji(e)} style={{ fontSize: 18, padding: '0 10px' }}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">Jours</span>
        <div className="chips accent-habits">
          {WEEKDAYS.map((d, i) => (
            <button
              key={i}
              type="button"
              className="chip"
              aria-pressed={days.includes(i)}
              aria-label={WEEKDAY_NAMES[i]}
              style={{ width: 42, justifyContent: 'center', padding: 0 }}
              onClick={() => setDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort()))}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="row between">
        <span className="field-label">Nombre de fois par jour</span>
        <Stepper ariaLabel="Nombre de fois par jour" value={target} onChange={setTarget} min={1} max={20} />
      </div>
      <div className="sheet-actions">
        {habit && (
          <>
            <button
              type="button"
              className="btn btn-danger"
              aria-label="Supprimer"
              onClick={() => {
                deleteHabit(habit.id);
                onDone();
              }}
            >
              <Trash2 size={18} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setHabitArchived(habit.id, !habit.archived);
                onDone();
              }}
            >
              {habit.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
              {habit.archived ? 'Réactiver' : 'Archiver'}
            </button>
          </>
        )}
        <button
          type="button"
          className="btn btn-primary grow"
          disabled={!name.trim() || days.length === 0}
          onClick={() => {
            saveHabit({ id: habit?.id ?? uid(), name: name.trim(), emoji, days, target, createdAt: habit?.createdAt ?? todayISO(), archived: habit?.archived });
            onDone();
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function Heatmap({ habit, log, today }: { habit: Habit; log: Record<ISODate, number> | undefined; today: ISODate }) {
  const weeks = 17;
  const start = addDays(startOfWeek(today), -7 * (weeks - 1));
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  return (
    <div className="heatmap" role="img" aria-label={`Historique de ${habit.name} sur ${weeks} semaines`}>
      {days.map((d) => {
        const count = log?.[d] ?? 0;
        const state = d > today ? 'future' : !isScheduled(habit, d) ? 'rest' : count >= habit.target ? 'on' : count > 0 ? 'partial' : '';
        return <span key={d} className={cx('cell', state, d === today && 'today')} title={`${formatLong(d)}${count ? ` : ${count}` : ''}`} />;
      })}
    </div>
  );
}

export function HabitsPage() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const logs = useStore((s) => s.habitLogs);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const todays = active.filter((h) => isScheduled(h, today));
  const doneToday = todays.filter((h) => (logs[h.id]?.[today] ?? 0) >= h.target).length;
  const last7 = lastNDays(7, today);

  const rate30 = useMemo(() => {
    let scheduled = 0;
    let done = 0;
    for (const h of active) {
      for (const d of lastNDays(30, today)) {
        if (!isScheduled(h, d)) continue;
        scheduled++;
        if ((logs[h.id]?.[d] ?? 0) >= h.target) done++;
      }
    }
    return scheduled ? done / scheduled : null;
  }, [active, logs, today]);

  const openHabit = (h: Habit | null) => {
    setEditing(h);
    setOpen(true);
  };

  const suggestions = HABIT_SUGGESTIONS.filter((s) => !habits.some((h) => h.name === s.name));

  return (
    <div className="stack-lg accent-habits">
      <PageHeader
        title="Habitudes"
        subtitle="Petites actions quotidiennes, grands changements"
        back={{ to: '/plus', label: 'Plus' }}
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openHabit(null)}>
            <Plus size={16} /> Habitude
          </button>
        }
      />

      {active.length > 0 && (
        <div className="stats cols-3">
          <Stat label="Aujourd’hui" value={`${doneToday} / ${todays.length}`} sub="habitudes faites" />
          <Stat label={'Réussite 30\u00a0j'} value={rate30 === null ? '—' : formatPercent(rate30)} />
          <Stat label="Actives" value={active.length} />
        </div>
      )}

      {active.length === 0 ? (
        <Card>
          <EmptyState emoji="🌱" title="Créez votre première habitude" text="Commencez petit : une ou deux habitudes, tenues chaque jour." />
        </Card>
      ) : (
        <div className="grid cols-2">
          {active.map((h) => {
            const log = logs[h.id];
            const streak = habitStreak(h, log, today);
            const best = bestStreak(lastNDays(365, today), (d) => (log?.[d] ?? 0) >= h.target, (d) => isScheduled(h, d));
            return (
              <Card key={h.id} accent="habits">
                <div className="stack">
                  <div className="row">
                    <button type="button" className="plain-btn row grow" onClick={() => openHabit(h)} style={{ display: 'flex' }}>
                      <span className="emoji-chip" aria-hidden>
                        {h.emoji}
                      </span>
                      <span className="grow">
                        <span className="bold truncate" style={{ display: 'block' }}>
                          {h.name}
                        </span>
                        <span className="small muted">
                          {streak > 0 ? `🔥 ${streak} j` : 'Pas de série'} · record {best} j
                          {h.days.length < 7 ? ` · ${h.days.map((d) => WEEKDAYS[d]).join(' ')}` : ''}
                        </span>
                      </span>
                    </button>
                    {isScheduled(h, today) ? <HabitCheck habit={h} date={today} /> : <span className="badge">Repos</span>}
                  </div>
                  <div className="row between">
                    <div className="dots" aria-label="7 derniers jours">
                      {last7.map((d) => (
                        <span
                          key={d}
                          className={cx('dot', !isScheduled(h, d) ? 'rest' : (log?.[d] ?? 0) >= h.target && 'on')}
                          title={formatLong(d)}
                        />
                      ))}
                    </div>
                    <span className="xsmall muted">7 derniers jours</span>
                  </div>
                  <Heatmap habit={h} log={log} today={today} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {suggestions.length > 0 && (
        <Card title="Idées d’habitudes" subtitle="Touchez pour ajouter" accent="habits">
          <div className="chips accent-habits">
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                className="chip"
                onClick={() => saveHabit({ id: uid(), ...s, days: [0, 1, 2, 3, 4, 5, 6], createdAt: today })}
              >
                <span aria-hidden>{s.emoji}</span> {s.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {archived.length > 0 && (
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowArchived((v) => !v)}>
            <Archive size={16} /> {showArchived ? 'Masquer' : 'Voir'} les archives ({archived.length})
          </button>
          {showArchived && (
            <Card className="accent-habits">
              <div className="list">
                {archived.map((h) => (
                  <button key={h.id} type="button" className="list-item" onClick={() => openHabit(h)}>
                    <span className="emoji-chip" aria-hidden>
                      {h.emoji}
                    </span>
                    <span className="item-title grow">{h.name}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier l’habitude' : 'Nouvelle habitude'} accent="habits">
        <HabitForm habit={editing} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  );
}

import { Check, ChevronDown, Flag, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Segmented, Tabs } from '../../components/ui/controls';
import { Field } from '../../components/ui/Field';
import { EmptyState, PageHeader } from '../../components/ui/layout';
import { Sheet } from '../../components/ui/Sheet';
import { addDays, diffDays, formatRelativeDay, formatShort, isISODate, todayISO, type ISODate } from '../../lib/dates';
import { useToday } from '../../lib/hooks';
import { cx, uid, vibrate } from '../../lib/misc';
import { removeItem, upsertItem } from '../../store/helpers';
import { update, useStore } from '../../store/store';
import type { Goal, LifeArea, Priority, Task } from '../../store/types';

export const AREAS: Record<LifeArea, { label: string; emoji: string }> = {
  deen: { label: 'Dîn', emoji: '🕌' },
  health: { label: 'Santé', emoji: '💪' },
  finance: { label: 'Finances', emoji: '💰' },
  family: { label: 'Famille', emoji: '👨‍👩‍👧' },
  work: { label: 'Travail', emoji: '💼' },
  personal: { label: 'Perso', emoji: '🌱' },
};

const PRIORITIES: Record<Priority, string> = { high: 'Haute', normal: 'Normale', low: 'Basse' };

export function toggleTask(id: string): void {
  vibrate(10);
  update((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : undefined } : t)) }));
}

export function TaskRow({ task, today, onOpen }: { task: Task; today: ISODate; onOpen?: (t: Task) => void }) {
  const overdue = !task.done && task.due !== null && task.due < today;
  return (
    <div className="list-item">
      <button
        type="button"
        className={cx('check-btn sm', task.done && 'done')}
        style={{ borderRadius: 999 }}
        aria-pressed={task.done}
        aria-label={task.done ? `Rouvrir « ${task.title} »` : `Terminer « ${task.title} »`}
        onClick={() => toggleTask(task.id)}
      >
        <Check size={16} strokeWidth={3} />
      </button>
      <button type="button" className="plain-btn grow" onClick={() => onOpen?.(task)} disabled={!onOpen}>
        <div className="item-title" style={task.done ? { textDecoration: 'line-through', color: 'var(--text-3)' } : undefined}>
          {task.title}
        </div>
        <div className={cx('item-meta', overdue && 'critical-text')}>
          {[task.due && (overdue ? `En retard · ${formatShort(task.due)}` : formatRelativeDay(task.due, today)), `${AREAS[task.area].emoji} ${AREAS[task.area].label}`]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </button>
      {task.priority === 'high' && !task.done && (
        <span className="badge critical" title="Priorité haute">
          <Flag size={12} /> Haute
        </span>
      )}
    </div>
  );
}

function TaskForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.due ?? '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [area, setArea] = useState<LifeArea>(task.area);
  return (
    <div className="stack">
      <Field label="Tâche">{(id) => <input id={id} className="input" value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
      <Field label="Échéance">{(id) => <input id={id} type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />}</Field>
      <Field label="Priorité">
        {() => (
          <Segmented
            ariaLabel="Priorité"
            value={priority}
            onChange={setPriority}
            options={(['high', 'normal', 'low'] as const).map((p) => ({ value: p, label: PRIORITIES[p] }))}
          />
        )}
      </Field>
      <AreaChips value={area} onChange={setArea} />
      <div className="sheet-actions">
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            removeItem('tasks', task.id, 'Tâche supprimée');
            onDone();
          }}
        >
          Supprimer
        </button>
        <button
          type="button"
          className="btn btn-primary grow"
          disabled={!title.trim()}
          onClick={() => {
            upsertItem('tasks', { ...task, title: title.trim(), due: isISODate(due) ? due : null, priority, area });
            onDone();
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function AreaChips({ value, onChange }: { value: LifeArea; onChange: (a: LifeArea) => void }) {
  return (
    <div className="chips accent-tasks" role="radiogroup" aria-label="Domaine">
      {(Object.keys(AREAS) as LifeArea[]).map((a) => (
        <button key={a} type="button" className="chip" role="radio" aria-checked={value === a} onClick={() => onChange(a)}>
          <span aria-hidden>{AREAS[a].emoji}</span> {AREAS[a].label}
        </button>
      ))}
    </div>
  );
}

function QuickAdd() {
  const today = useToday();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<ISODate | ''>(today);
  const [priority, setPriority] = useState<Priority>('normal');
  const [area, setArea] = useState<LifeArea>('personal');
  const [expanded, setExpanded] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    upsertItem('tasks', { id: uid(), title: title.trim(), due: due || null, priority, area, done: false, createdAt: Date.now() });
    setTitle('');
  };

  return (
    <Card accent="tasks">
      <form onSubmit={submit} className="stack-sm">
        <div className="row">
          <input className="input grow" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nouvelle tâche…" aria-label="Nouvelle tâche" />
          <button type="submit" className="btn btn-primary" disabled={!title.trim()} aria-label="Ajouter la tâche">
            <Plus size={18} />
          </button>
        </div>
        <div className="chips accent-tasks">
          {(
            [
              [today, 'Aujourd’hui'],
              [addDays(today, 1), 'Demain'],
              ['', 'Sans date'],
            ] as const
          ).map(([v, label]) => (
            <button key={label} type="button" className="chip" aria-pressed={due === v} onClick={() => setDue(v)}>
              {label}
            </button>
          ))}
          <button type="button" className="chip" aria-expanded={expanded} onClick={() => setExpanded((x) => !x)}>
            Plus d’options <ChevronDown size={14} />
          </button>
        </div>
        {expanded && (
          <div className="stack-sm">
            <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Échéance" />
            <Segmented
              ariaLabel="Priorité"
              value={priority}
              onChange={setPriority}
              options={(['high', 'normal', 'low'] as const).map((p) => ({ value: p, label: PRIORITIES[p] }))}
            />
            <AreaChips value={area} onChange={setArea} />
          </div>
        )}
      </form>
    </Card>
  );
}

function TasksView() {
  const today = useToday();
  const tasks = useStore((s) => s.tasks);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);

  const sections = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const rank = (t: Task) => ({ high: 0, normal: 1, low: 2 })[t.priority];
    const byDue = (a: Task, b: Task) => (a.due ?? '').localeCompare(b.due ?? '') || rank(a) - rank(b) || a.createdAt - b.createdAt;
    return [
      { key: 'late', title: 'En retard', items: open.filter((t) => t.due && t.due < today).sort(byDue) },
      { key: 'today', title: 'Aujourd’hui', items: open.filter((t) => t.due === today).sort(byDue) },
      { key: 'next', title: 'À venir', items: open.filter((t) => t.due && t.due > today).sort(byDue) },
      { key: 'nodate', title: 'Sans date', items: open.filter((t) => !t.due).sort(byDue) },
    ].filter((s) => s.items.length);
  }, [tasks, today]);

  const done = useMemo(() => tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)), [tasks]);

  return (
    <div className="stack-lg">
      <QuickAdd />
      {sections.length === 0 ? (
        <Card>
          <EmptyState emoji="✅" title="Rien à faire pour l’instant" text="Ajoutez vos tâches : courses, démarches, appels, projets…" />
        </Card>
      ) : (
        sections.map((s) => (
          <Card key={s.key} title={s.title} subtitle={`${s.items.length} tâche${s.items.length > 1 ? 's' : ''}`}>
            <div className="list">
              {s.items.map((t) => (
                <TaskRow key={t.id} task={t} today={today} onOpen={setEditing} />
              ))}
            </div>
          </Card>
        ))
      )}
      {done.length > 0 && (
        <div className="stack-sm">
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowDone((v) => !v)}>
            {showDone ? 'Masquer' : 'Voir'} les tâches terminées ({done.length})
          </button>
          {showDone && (
            <Card>
              <div className="list">
                {done.slice(0, 30).map((t) => (
                  <TaskRow key={t.id} task={t} today={today} onOpen={setEditing} />
                ))}
              </div>
              {done.length > 5 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => update((s) => ({ tasks: s.tasks.filter((t) => !t.done) }))}
                >
                  Effacer les tâches terminées
                </button>
              )}
            </Card>
          )}
        </div>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Modifier la tâche" accent="tasks">
        {editing && <TaskForm task={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

function GoalForm({ goal, onDone }: { goal: Goal | null; onDone: () => void }) {
  const [title, setTitle] = useState(goal?.title ?? '');
  const [area, setArea] = useState<LifeArea>(goal?.area ?? 'personal');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [note, setNote] = useState(goal?.note ?? '');
  return (
    <div className="stack">
      <Field label="Objectif">{(id) => <input id={id} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Mémoriser Juz’ Amma, courir 10 km…" data-autofocus />}</Field>
      <AreaChips value={area} onChange={setArea} />
      <Field label="Échéance (optionnel)">{(id) => <input id={id} type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />}</Field>
      <Field label="Pourquoi / étapes">{(id) => <textarea id={id} className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ma motivation, les prochaines étapes…" />}</Field>
      <div className="sheet-actions">
        {goal && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              removeItem('goals', goal.id, 'Objectif supprimé');
              onDone();
            }}
          >
            Supprimer
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary grow"
          disabled={!title.trim()}
          onClick={() => {
            upsertItem('goals', {
              id: goal?.id ?? uid(),
              title: title.trim(),
              area,
              deadline: isISODate(deadline) ? deadline : null,
              note: note.trim(),
              progress: goal?.progress ?? 0,
              createdAt: goal?.createdAt ?? todayISO(),
              done: goal?.done ?? false,
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

function GoalsView() {
  const today = useToday();
  const goals = useStore((s) => s.goals);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [open, setOpen] = useState(false);
  const sorted = [...goals].sort((a, b) => Number(a.done) - Number(b.done) || (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));

  const setProgress = (g: Goal, progress: number) => upsertItem('goals', { ...g, progress, done: progress >= 100 });
  const openGoal = (g: Goal | null) => {
    setEditing(g);
    setOpen(true);
  };

  return (
    <div className="stack-lg">
      <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => openGoal(null)}>
        <Plus size={18} /> Nouvel objectif
      </button>
      {sorted.length === 0 ? (
        <Card>
          <EmptyState emoji="🎯" title="Aucun objectif" text="Fixez 1 à 3 objectifs par domaine de vie : Dîn, santé, finances, famille, travail." />
        </Card>
      ) : (
        <div className="grid cols-2">
          {sorted.map((g) => {
            const days = g.deadline ? diffDays(g.deadline, today) : null;
            return (
              <Card key={g.id} accent={g.done ? 'body' : 'tasks'}>
                <div className="stack-sm">
                  <div className="row top">
                    <span className="emoji-chip" aria-hidden>
                      {AREAS[g.area].emoji}
                    </span>
                    <button type="button" className="plain-btn grow" onClick={() => openGoal(g)}>
                      <div className="bold">{g.title}</div>
                      <div className="small muted">
                        {AREAS[g.area].label}
                        {g.deadline && ` · ${days !== null && days < 0 && !g.done ? 'échéance dépassée' : `échéance ${formatRelativeDay(g.deadline, today).toLowerCase()}`}`}
                      </div>
                    </button>
                    {g.done && <span className="badge good">Atteint 🎉</span>}
                  </div>
                  {g.note && <p className="small muted">{g.note}</p>}
                  <div className="row">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={g.progress}
                      onChange={(e) => setProgress(g, Number(e.target.value))}
                      className="grow"
                      aria-label={`Progression de « ${g.title} »`}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span className="bold num" style={{ width: 44, textAlign: 'right' }}>
                      {g.progress} %
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Modifier l’objectif' : 'Nouvel objectif'} accent="tasks">
        <GoalForm goal={editing} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  );
}

export function TasksPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('onglet') === 'objectifs' ? 'objectifs' : 'taches';
  return (
    <div className="stack-lg accent-tasks">
      <PageHeader title="Tâches & objectifs" subtitle="Ce qu’il faut faire, et où je veux aller" back={{ to: '/plus', label: 'Plus' }} />
      <div>
        <Tabs
          ariaLabel="Sections"
          value={tab}
          onChange={(v) => setParams(v === 'taches' ? {} : { onglet: v }, { replace: true })}
          tabs={[
            { value: 'taches', label: 'Tâches' },
            { value: 'objectifs', label: 'Objectifs' },
          ]}
        />
        {tab === 'taches' ? <TasksView /> : <GoalsView />}
      </div>
    </div>
  );
}

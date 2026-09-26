import { BookOpen, ChevronRight, Dumbbell, Moon, Plus, Settings, Sparkles } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { MODULES } from '../../app/nav';
import { Card, type Accent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/layout';
import { Meter, ProgressRing } from '../../components/ui/progress';
import { ADHKAR_ITEMS } from '../../data/deen';
import { formatFull, monthKey, startOfWeek } from '../../lib/dates';
import { budgetState, monthTransactions, totals } from '../../lib/finance';
import { formatDuration, formatMl, formatMoney, formatNumber, formatPercent } from '../../lib/format';
import { sleepMinutes } from '../../lib/health';
import { formatHijri, isRamadan, toHijri } from '../../lib/hijri';
import { useToday } from '../../lib/hooks';
import { cx } from '../../lib/misc';
import { useNutritionTargets, useWaterGoal } from '../../store/selectors';
import { useStore } from '../../store/store';
import { addQuranPages, toggleAdhkar } from '../deen/actions';
import { prayedCount } from '../deen/logic';
import { NextPrayerCard } from '../deen/NextPrayerCard';
import { TransactionSheet } from '../finance/TransactionSheet';
import { HabitCheck, isScheduled } from '../habits/HabitsPage';
import { MoodPicker, updateJournal } from '../journal/JournalPage';
import { BackupReminder } from '../more/MorePage';
import { AddFoodSheet } from '../nutrition/AddFoodSheet';
import { defaultSlot, mealSlots } from '../nutrition/actions';
import { MacroBars } from '../nutrition/NutritionPage';
import { SleepSheet } from '../sleep/SleepPage';
import { WorkoutSheet } from '../sport/WorkoutSheet';
import { TaskRow } from '../tasks/TasksPage';
import { addWater } from '../water/actions';

function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Sbah lkhir';
  if (hour >= 18) return 'Msa lkhir';
  return 'Salam';
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="btn btn-ghost btn-sm" style={{ paddingRight: 6 }}>
      {children} <ChevronRight size={16} />
    </Link>
  );
}

function ModuleIcon({ accent, children }: { accent: Accent; children: ReactNode }) {
  return <span className={`icon-chip accent-${accent}`}>{children}</span>;
}

/** Score d'équilibre : moyenne de la progression des prières, de l'eau et des habitudes du jour. */
function BalanceCard() {
  const today = useToday();
  const dayPrayers = useStore((s) => s.prayerLog[today]);
  const water = useStore((s) => s.water);
  const habits = useStore((s) => s.habits);
  const habitLogs = useStore((s) => s.habitLogs);
  const waterGoal = useWaterGoal(today);

  const prayed = prayedCount(dayPrayers);
  const drank = water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
  const todays = habits.filter((h) => !h.archived && isScheduled(h, today));
  const habitsDone = todays.filter((h) => (habitLogs[h.id]?.[today] ?? 0) >= h.target).length;

  const parts = [
    { label: 'Prières', value: prayed, max: 5, text: `${prayed}/5`, accent: 'deen' as Accent },
    { label: 'Eau', value: Math.min(drank, waterGoal.total), max: waterGoal.total, text: formatPercent(Math.min(1, drank / waterGoal.total)), accent: 'water' as Accent },
    ...(todays.length ? [{ label: 'Habitudes', value: habitsDone, max: todays.length, text: `${habitsDone}/${todays.length}`, accent: 'habits' as Accent }] : []),
  ];
  const score = parts.reduce((a, p) => a + p.value / p.max, 0) / parts.length;

  return (
    <Card title="Mon équilibre du jour" icon={<Sparkles size={18} />} accent="brand">
      <div className="row gap-lg">
        <ProgressRing value={score * 100} max={100} size={104} stroke={10} accent="brand" label="Score d’équilibre du jour">
          <span style={{ fontSize: 26, fontWeight: 800 }}>{Math.round(score * 100)}</span>
          <span className="muted xsmall">sur 100</span>
        </ProgressRing>
        <div className="stack-sm grow">
          {parts.map((p) => (
            <div key={p.label} className={`accent-${p.accent}`}>
              <div className="row between small">
                <span>{p.label}</span>
                <span className="bold">{p.text}</span>
              </div>
              <Meter value={p.value} max={p.max} thin label={p.label} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function WaterCard() {
  const today = useToday();
  const water = useStore((s) => s.water);
  const quick = useStore((s) => s.settings.waterQuickAdd);
  const goal = useWaterGoal(today);
  const drank = water.filter((w) => w.date === today).reduce((a, w) => a + w.ml, 0);
  const amounts = [...quick].sort((a, b) => a - b).filter((v) => v >= 200).slice(0, 2);

  return (
    <Card title="Hydratation" icon={<MODULES.water.icon size={18} />} accent="water" action={<SectionLink to="/hydratation">Détails</SectionLink>}>
      <div className="row gap-lg">
        <ProgressRing value={drank} max={goal.total} size={96} stroke={9} accent="water" label="Eau bue aujourd’hui">
          <span style={{ fontSize: 17, fontWeight: 800 }}>{formatMl(drank)}</span>
          <span className="muted xsmall">/ {formatMl(goal.total)}</span>
        </ProgressRing>
        <div className="stack-sm grow">
          {(amounts.length ? amounts : [250, 500]).map((ml) => (
            <button key={ml} type="button" className="btn btn-soft" onClick={() => addWater(ml)}>
              <Plus size={16} /> {formatMl(ml)}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function NutritionCard({ onAdd }: { onAdd: () => void }) {
  const today = useToday();
  const meals = useStore((s) => s.meals);
  const targets = useNutritionTargets();
  const dayMeals = useMemo(() => meals.filter((m) => m.date === today), [meals, today]);
  const kcal = dayMeals.reduce((a, m) => a + m.kcal, 0);

  return (
    <Card
      title="Nutrition"
      icon={<MODULES.nutrition.icon size={18} />}
      accent="nutrition"
      action={
        <button type="button" className="btn btn-soft btn-sm" onClick={onAdd}>
          <Plus size={16} /> Repas
        </button>
      }
    >
      <Link to="/nutrition" className="stack-sm" style={{ display: 'flex' }}>
        <div className="row between">
          <span>
            <span style={{ fontSize: 26, fontWeight: 800 }}>{formatNumber(kcal)}</span>
            <span className="muted"> {targets.kcal ? `/ ${formatNumber(targets.kcal)} kcal` : 'kcal'}</span>
          </span>
          {targets.kcal && <span className="small muted">{kcal <= targets.kcal ? `reste ${formatNumber(targets.kcal - kcal)}` : `+${formatNumber(kcal - targets.kcal)}`}</span>}
        </div>
        {targets.kcal && <Meter value={kcal} max={targets.kcal} label="Calories du jour" />}
        <MacroBars entries={dayMeals} />
      </Link>
    </Card>
  );
}

function HabitsCard() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const logs = useStore((s) => s.habitLogs);
  const todays = habits.filter((h) => !h.archived && isScheduled(h, today));
  const done = todays.filter((h) => (logs[h.id]?.[today] ?? 0) >= h.target).length;

  return (
    <Card
      title="Habitudes"
      subtitle={todays.length ? `${done} / ${todays.length} faites` : undefined}
      icon={<MODULES.habits.icon size={18} />}
      accent="habits"
      action={<SectionLink to="/habitudes">Tout voir</SectionLink>}
    >
      {todays.length === 0 ? (
        <p className="muted small">
          Aucune habitude prévue aujourd’hui.{' '}
          <Link to="/habitudes" className="accent-text bold">
            En créer une
          </Link>
        </p>
      ) : (
        <div className="list">
          {todays.slice(0, 6).map((h) => (
            <div key={h.id} className="list-item" style={{ minHeight: 50 }}>
              <span className="emoji-chip" aria-hidden>
                {h.emoji}
              </span>
              <span className="item-title grow">{h.name}</span>
              <HabitCheck habit={h} date={today} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FinanceCard({ onAdd }: { onAdd: () => void }) {
  const today = useToday();
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const month = monthTransactions(transactions, monthKey(today));
  const t = totals(month);
  const spentToday = month.filter((x) => x.date === today && x.type === 'expense').reduce((a, x) => a + x.amount, 0);
  const budgeted = categories.filter((c) => c.type === 'expense' && !c.archived && c.budget);
  const budget = budgeted.reduce((a, c) => a + (c.budget ?? 0), 0);
  const budgetedIds = new Set(budgeted.map((c) => c.id));
  const budgetedSpent = month.filter((x) => x.type === 'expense' && budgetedIds.has(x.categoryId)).reduce((a, x) => a + x.amount, 0);

  return (
    <Card
      title="Finances du mois"
      icon={<MODULES.finance.icon size={18} />}
      accent="finance"
      action={
        <button type="button" className="btn btn-soft btn-sm" onClick={onAdd}>
          <Plus size={16} /> Dépense
        </button>
      }
    >
      <Link to="/finances" className="stack-sm" style={{ display: 'flex' }}>
        <div className="row between">
          <span>
            <span className="muted small">Dépensé</span>
            <br />
            <span style={{ fontSize: 24, fontWeight: 800 }}>{formatMoney(t.expense, currency)}</span>
          </span>
          <span style={{ textAlign: 'right' }}>
            <span className="muted small">Solde</span>
            <br />
            <span className={cx('bold', t.balance < 0 && 'critical-text')}>{formatMoney(t.balance, currency, { signed: true })}</span>
          </span>
        </div>
        {budget > 0 && (
          <div className="stack-xs">
            <div className="row between small">
              <span className="muted">Budgets</span>
              <span>
                {formatMoney(budgetedSpent, currency)} / {formatMoney(budget, currency)}
              </span>
            </div>
            <Meter value={budgetedSpent} max={budget} state={budgetState(budgetedSpent, budget)} label="Budgets du mois" />
          </div>
        )}
        <span className="small muted">Dépensé aujourd’hui : {formatMoney(spentToday, currency)}</span>
      </Link>
    </Card>
  );
}

function SportSleepCard({ onWorkout, onSleep }: { onWorkout: () => void; onSleep: () => void }) {
  const today = useToday();
  const workouts = useStore((s) => s.workouts);
  const sleep = useStore((s) => s.sleep);
  const goal = useStore((s) => s.settings.goals.workoutsPerWeek);
  const weekStart = startOfWeek(today);
  const sessions = workouts.filter((w) => w.date >= weekStart && w.date <= today).length;
  const todayMin = workouts.filter((w) => w.date === today).reduce((a, w) => a + w.durationMin, 0);
  const lastNight = sleep.find((s) => s.date === today);

  return (
    <Card title="Sport & sommeil" icon={<Dumbbell size={18} />} accent="sport">
      <div className="list">
        <div className="list-item">
          <ModuleIcon accent="sport">
            <Dumbbell size={17} />
          </ModuleIcon>
          <Link to="/sport" className="grow">
            <div className="item-title">
              {sessions} / {goal} séances
            </div>
            <div className="item-meta">{todayMin ? `Semaine en cours · ${formatDuration(todayMin)} aujourd’hui` : 'Semaine en cours · rien aujourd’hui'}</div>
          </Link>
          <button type="button" className="icon-btn bordered sm" onClick={onWorkout} aria-label="Ajouter une séance">
            <Plus size={16} />
          </button>
        </div>
        <div className="list-item">
          <ModuleIcon accent="sleep">
            <Moon size={17} />
          </ModuleIcon>
          <Link to="/sommeil" className="grow">
            <div className="item-title">{lastNight ? `${formatDuration(sleepMinutes(lastNight.bedtime, lastNight.wake))} de sommeil` : 'Nuit non renseignée'}</div>
            <div className="item-meta">{lastNight ? `${lastNight.bedtime} → ${lastNight.wake}` : 'Touchez + pour noter votre nuit'}</div>
          </Link>
          <button type="button" className="icon-btn bordered sm" onClick={onSleep} aria-label="Enregistrer ma nuit">
            <Plus size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function DeenDayCard() {
  const today = useToday();
  const adhkar = useStore((s) => s.adhkarLog[today]);
  const pages = useStore((s) => s.quran.log[today] ?? 0);
  const goal = useStore((s) => s.settings.goals.quranPagesPerDay);
  const items = ADHKAR_ITEMS.filter((i) => i.key === 'morning' || i.key === 'evening');

  return (
    <Card title="Coran & adhkar" icon={<BookOpen size={18} />} accent="deen" action={<SectionLink to="/din?onglet=coran">Coran</SectionLink>}>
      <div className="stack-sm">
        <div className="row">
          <div className="grow">
            <div className="small">
              <strong>{pages}</strong> / {goal} pages lues
            </div>
            <Meter value={pages} max={goal} thin label="Pages de Coran lues aujourd’hui" />
          </div>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => addQuranPages(today, 1)}>
            +1 page
          </button>
        </div>
        <div className="chips accent-deen">
          {items.map((i) => (
            <button key={i.key} type="button" className="chip" aria-pressed={!!adhkar?.[i.key]} onClick={() => toggleAdhkar(today, i.key)}>
              {adhkar?.[i.key] ? '✓ ' : ''}
              {i.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function MoodCard() {
  const today = useToday();
  const mood = useStore((s) => s.journal[today]?.mood ?? null);
  return (
    <Card title="Mon humeur" icon={<MODULES.journal.icon size={18} />} accent="journal" action={<SectionLink to="/journal">Journal</SectionLink>}>
      <MoodPicker label="Humeur du jour" value={mood} onChange={(m) => updateJournal(today, { mood: m })} />
    </Card>
  );
}

function TasksCard() {
  const today = useToday();
  const tasks = useStore((s) => s.tasks);
  const due = tasks
    .filter((t) => !t.done && t.due !== null && t.due <= today)
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))
    .slice(0, 5);
  const doneToday = tasks.filter((t) => t.done && t.doneAt && new Date(t.doneAt).toDateString() === new Date().toDateString()).length;

  return (
    <Card
      title="À faire aujourd’hui"
      subtitle={doneToday ? `${doneToday} terminée${doneToday > 1 ? 's' : ''} aujourd’hui` : undefined}
      icon={<MODULES.tasks.icon size={18} />}
      accent="tasks"
      action={<SectionLink to="/taches">Tâches</SectionLink>}
    >
      {due.length === 0 ? (
        <p className="muted small">Rien d’urgent. Profitez-en pour avancer sur un objectif 🎯</p>
      ) : (
        <div className="list">
          {due.map((t) => (
            <TaskRow key={t.id} task={t} today={today} />
          ))}
        </div>
      )}
    </Card>
  );
}

export function TodayPage() {
  const today = useToday();
  const name = useStore((s) => s.profile.name);
  const hijriOffset = useStore((s) => s.settings.prayer.hijriOffset);
  const [sheet, setSheet] = useState<'meal' | 'expense' | 'workout' | 'sleep' | null>(null);
  const ramadan = isRamadan(today, hijriOffset);

  return (
    <div className="stack-lg">
      <PageHeader
        title={`${greeting(new Date().getHours())}${name ? ` ${name}` : ''} 👋`}
        subtitle={`${formatFull(today)} · ${formatHijri(toHijri(today, hijriOffset))}${ramadan ? ' · Ramadan Moubarak 🌙' : ''}`}
        actions={
          <Link to="/reglages" className="icon-btn" aria-label="Réglages">
            <Settings size={20} />
          </Link>
        }
      />
      <BackupReminder />
      <div className="grid cols-3">
        <div className="span-2">
          <NextPrayerCard showLink />
        </div>
        <BalanceCard />
        <WaterCard />
        <HabitsCard />
        <NutritionCard onAdd={() => setSheet('meal')} />
        <FinanceCard onAdd={() => setSheet('expense')} />
        <DeenDayCard />
        <SportSleepCard onWorkout={() => setSheet('workout')} onSleep={() => setSheet('sleep')} />
        <MoodCard />
        <TasksCard />
      </div>

      <AddFoodSheet open={sheet === 'meal'} onClose={() => setSheet(null)} date={today} slot={defaultSlot()} slots={mealSlots(ramadan)} />
      <TransactionSheet open={sheet === 'expense'} onClose={() => setSheet(null)} />
      <WorkoutSheet open={sheet === 'workout'} onClose={() => setSheet(null)} />
      <SleepSheet open={sheet === 'sleep'} onClose={() => setSheet(null)} />
    </div>
  );
}

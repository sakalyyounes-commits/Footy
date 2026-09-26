import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LineChart } from '../../components/charts/LineChart';
import { Card } from '../../components/ui/Card';
import { DateNav, PageHeader } from '../../components/ui/layout';
import { Stat } from '../../components/ui/progress';
import { addDays, diffDays, formatRelativeDay, formatShort, lastNDays, type ISODate } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { useToday } from '../../lib/hooks';
import { average } from '../../lib/misc';
import { update, useStore } from '../../store/store';
import type { JournalEntry, Rating } from '../../store/types';

export const MOODS: Array<{ value: Rating; emoji: string; label: string }> = [
  { value: 1, emoji: '😞', label: 'Très mal' },
  { value: 2, emoji: '🙁', label: 'Pas top' },
  { value: 3, emoji: '😐', label: 'Neutre' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Excellent' },
];

const ENERGY: Array<{ value: Rating; emoji: string; label: string }> = [
  { value: 1, emoji: '🪫', label: 'Épuisé' },
  { value: 2, emoji: '😴', label: 'Fatigué' },
  { value: 3, emoji: '🙂', label: 'Correct' },
  { value: 4, emoji: '💪', label: 'En forme' },
  { value: 5, emoji: '⚡', label: 'Au top' },
];

function emptyEntry(date: ISODate): JournalEntry {
  return { date, mood: null, energy: null, gratitude: ['', '', ''], note: '', updatedAt: 0 };
}

export function updateJournal(date: ISODate, patch: Partial<JournalEntry>): void {
  update((s) => {
    const next = { ...(s.journal[date] ?? emptyEntry(date)), ...patch, updatedAt: Date.now() };
    const isEmpty = !next.mood && !next.energy && !next.note.trim() && next.gratitude.every((g) => !g.trim());
    const journal = { ...s.journal };
    if (isEmpty) delete journal[date];
    else journal[date] = next;
    return { journal };
  });
}

export function MoodPicker({ value, onChange, options = MOODS, label }: { value: Rating | null; onChange: (v: Rating | null) => void; options?: typeof MOODS; label: string }) {
  return (
    <div className="mood-picker" role="radiogroup" aria-label={label}>
      {options.map((m) => (
        <button key={m.value} type="button" role="radio" aria-checked={value === m.value} className="mood-btn" onClick={() => onChange(value === m.value ? null : m.value)}>
          <span className="mood-emoji" aria-hidden>
            {m.emoji}
          </span>
          {m.label}
        </button>
      ))}
    </div>
  );
}

/** Zones de texte avec enregistrement automatique (différé pendant la frappe). */
function TextEntries({ date }: { date: ISODate }) {
  const entry = useStore((s) => s.journal[date]);
  const [gratitude, setGratitude] = useState<string[]>(entry?.gratitude ?? ['', '', '']);
  const [note, setNote] = useState(entry?.note ?? '');
  const [saved, setSaved] = useState(false);
  const pending = useRef<{ gratitude: string[]; note: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) {
      updateJournal(date, pending.current);
      pending.current = null;
      setSaved(true);
    }
  };

  // Enregistre ce qui est en attente si on change de jour ou de page.
  useEffect(() => () => flush(), [date]);

  const schedule = (next: { gratitude: string[]; note: string }) => {
    pending.current = next;
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  return (
    <>
      <Card title="Gratitude" subtitle="Alhamdulillah pour…" accent="journal">
        <div className="stack-sm">
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              className="input"
              value={gratitude[i] ?? ''}
              placeholder={['ma santé', 'ma famille', 'un moment de la journée'][i]}
              aria-label={`Gratitude ${i + 1}`}
              onChange={(e) => {
                const next = [...gratitude];
                next[i] = e.target.value;
                setGratitude(next);
                schedule({ gratitude: next, note });
              }}
              onBlur={flush}
            />
          ))}
        </div>
      </Card>
      <Card
        title="Réflexion du jour"
        subtitle="Victoires, difficultés, intentions pour demain"
        accent="journal"
        action={saved ? <span className="badge good"><Check size={12} /> Enregistré</span> : null}
      >
        <textarea
          className="textarea"
          rows={6}
          value={note}
          placeholder="Qu’est-ce qui s’est bien passé aujourd’hui ? Qu’est-ce que je veux améliorer ?"
          aria-label="Réflexion du jour"
          onChange={(e) => {
            setNote(e.target.value);
            schedule({ gratitude, note: e.target.value });
          }}
          onBlur={flush}
        />
      </Card>
    </>
  );
}

export function JournalPage() {
  const today = useToday();
  const [date, setDate] = useState<ISODate>(today);
  const journal = useStore((s) => s.journal);
  const entry = journal[date];

  const last30 = lastNDays(30, today);
  const moodPoints = last30
    .filter((d) => journal[d]?.mood)
    .map((d) => ({ x: diffDays(d, last30[0]), label: formatShort(d), value: journal[d].mood as number }));
  const avgMood = average(moodPoints.map((p) => p.value));
  const avgEnergy = average(last30.map((d) => journal[d]?.energy).filter((v): v is Rating => !!v));
  const recent = Object.values(journal)
    .filter((e) => e.note.trim() || e.gratitude.some((g) => g.trim()))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <div className="stack-lg accent-journal">
      <PageHeader title="Journal & humeur" subtitle="Quelques minutes par jour pour prendre du recul" back={{ to: '/plus', label: 'Plus' }} />
      <DateNav value={date} onChange={setDate} />

      <div className="grid cols-2">
        <div className="stack-lg">
          <Card title="Comment je me sens ?" accent="journal">
            <MoodPicker label="Humeur" value={entry?.mood ?? null} onChange={(mood) => updateJournal(date, { mood })} />
          </Card>
          <Card title="Mon énergie" accent="journal">
            <MoodPicker label="Énergie" options={ENERGY} value={entry?.energy ?? null} onChange={(energy) => updateJournal(date, { energy })} />
          </Card>
        </div>
        <div className="stack-lg">
          <TextEntries key={date} date={date} />
        </div>
      </div>

      <Card title="Humeur sur 30 jours" accent="journal">
        {moodPoints.length < 2 ? (
          <p className="muted small">Notez votre humeur quelques jours pour voir la tendance.</p>
        ) : (
          <>
            <LineChart
              title="Humeur sur 30 jours"
              points={moodPoints}
              color="var(--c-journal)"
              yDomain={[1, 5]}
              yTicks={[1, 2, 3, 4, 5]}
              formatTick={(v) => MOODS[v - 1]?.emoji ?? ''}
              formatValue={(v) => `${MOODS[Math.round(v) - 1]?.emoji ?? ''} ${MOODS[Math.round(v) - 1]?.label ?? ''}`}
              formatX={(x) => formatShort(addDays(last30[0], x))}
              area={false}
              valueHeader="Humeur"
            />
            <div className="stats" style={{ marginTop: 12 }}>
              <Stat label="Humeur moyenne" value={avgMood ? `${formatNumber(avgMood, 1)} / 5` : '—'} />
              <Stat label="Énergie moyenne" value={avgEnergy ? `${formatNumber(avgEnergy, 1)} / 5` : '—'} />
            </div>
          </>
        )}
      </Card>

      {recent.length > 0 && (
        <Card title="Pages récentes">
          <div className="list">
            {recent.map((e) => (
              <button key={e.date} type="button" className="list-item" onClick={() => setDate(e.date)}>
                <span className="emoji-chip" aria-hidden>
                  {e.mood ? MOODS[e.mood - 1].emoji : '📝'}
                </span>
                <div className="grow">
                  <div className="item-title">{formatRelativeDay(e.date, today)}</div>
                  <div className="item-meta">{e.note.trim() || e.gratitude.filter((g) => g.trim()).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

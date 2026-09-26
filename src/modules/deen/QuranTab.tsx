import { BookOpen, Minus, Pencil } from 'lucide-react';
import { useState } from 'react';
import { BarChart } from '../../components/charts/BarChart';
import { Card } from '../../components/ui/Card';
import { Field, NumberInput } from '../../components/ui/Field';
import { Meter, ProgressRing, Stat } from '../../components/ui/progress';
import { Sheet } from '../../components/ui/Sheet';
import { QURAN_PAGES } from '../../data/deen';
import { addDays, formatFull, formatShort, lastNDays } from '../../lib/dates';
import { formatNumber, formatPercent } from '../../lib/format';
import { useToday } from '../../lib/hooks';
import { average } from '../../lib/misc';
import { currentStreak } from '../../lib/streaks';
import { useStore } from '../../store/store';
import { addQuranPages, setQuranPosition } from './actions';

/** Hizb (1 à 60) correspondant approximativement à une page du Mushaf. */
export function hizbOfPage(page: number): number {
  return Math.min(60, Math.floor((Math.max(1, page) - 1) / (QURAN_PAGES / 60)) + 1);
}

export function QuranTab() {
  const today = useToday();
  const quran = useStore((s) => s.quran);
  const goal = useStore((s) => s.settings.goals.quranPagesPerDay);
  const [editOpen, setEditOpen] = useState(false);
  const [custom, setCustom] = useState<number | null>(null);
  const [page, setPage] = useState<number | null>(quran.page);
  const [khatmas, setKhatmas] = useState<number | null>(quran.khatmas);

  const todayPages = quran.log[today] ?? 0;
  const last14 = lastNDays(14, today);
  const avgPages = average(last14.map((d) => quran.log[d] ?? 0)) ?? 0;
  const remaining = QURAN_PAGES - quran.page;
  // Rythme réel des 14 derniers jours, ou l'objectif quotidien si rien n'a été lu récemment.
  const pace = avgPages > 0 ? avgPages : goal;
  const finishDate = pace > 0 ? addDays(today, Math.ceil(remaining / pace)) : null;
  const streak = currentStreak((d) => (quran.log[d] ?? 0) > 0, today);

  const chartData = last14.map((d) => ({
    key: d,
    label: String(Number(d.slice(8))),
    fullLabel: formatShort(d),
    value: quran.log[d] ?? 0,
    current: d === today,
  }));

  return (
    <div className="stack-lg">
      <div className="grid cols-2">
        <Card
          title={`Khatma n° ${quran.khatmas + 1}`}
          subtitle={quran.khatmas ? `${quran.khatmas} khatma${quran.khatmas > 1 ? 's' : ''} terminée${quran.khatmas > 1 ? 's' : ''}, masha’Allah` : 'Lecture complète du Coran'}
          icon={<BookOpen size={18} />}
          accent="deen"
          action={
            <button
              type="button"
              className="icon-btn"
              aria-label="Modifier ma position"
              onClick={() => {
                setPage(quran.page);
                setKhatmas(quran.khatmas);
                setEditOpen(true);
              }}
            >
              <Pencil size={18} />
            </button>
          }
        >
          <div className="row gap-lg">
            <ProgressRing value={quran.page} max={QURAN_PAGES} size={128} stroke={11} accent="deen" label="Progression de la khatma">
              <span style={{ fontSize: 24, fontWeight: 800 }}>{formatPercent(quran.page / QURAN_PAGES)}</span>
              <span className="muted xsmall">p. {quran.page} / {QURAN_PAGES}</span>
            </ProgressRing>
            <div className="stack-sm grow">
              <Stat label="Position" value={quran.page ? `Hizb ${hizbOfPage(quran.page)}` : 'Début'} sub={`${remaining} pages restantes`} />
              <p className="small muted">
                {finishDate ? `Fin estimée : ${formatFull(finishDate)}` : 'Lisez quelques pages pour estimer la fin.'}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Lecture du jour" subtitle={`Objectif : ${goal} pages`} accent="deen">
          <div className="stack">
            <div className="row between">
              <span className="big-number">{todayPages}</span>
              <span className="muted">page{todayPages > 1 ? 's' : ''} lue{todayPages > 1 ? 's' : ''}</span>
            </div>
            <Meter value={todayPages} max={goal} label="Pages lues aujourd’hui" />
            <div className="chips accent-deen">
              {[1, 2, 5, 10, 20].map((n) => (
                <button key={n} type="button" className="chip" onClick={() => addQuranPages(today, n)}>
                  +{n} p.
                </button>
              ))}
              {todayPages > 0 && (
                <button type="button" className="chip" onClick={() => addQuranPages(today, -1)} aria-label="Retirer une page">
                  <Minus size={14} /> 1
                </button>
              )}
            </div>
            <div className="row">
              <NumberInput value={custom} onChange={setCustom} placeholder="Autre nombre de pages" decimals={false} min={1} max={604} ariaLabel="Nombre de pages lues" />
              <button
                type="button"
                className="btn btn-soft"
                disabled={!custom}
                onClick={() => {
                  if (custom) addQuranPages(today, custom);
                  setCustom(null);
                }}
              >
                Ajouter
              </button>
            </div>
            <p className="small muted">
              {streak > 0 ? `🔥 ${streak} jour${streak > 1 ? 's' : ''} de lecture d’affilée` : 'Même une page par jour, avec constance, vaut mieux que beaucoup rarement.'}
            </p>
          </div>
        </Card>
      </div>

      <Card title="14 derniers jours" subtitle="Pages lues par jour">
        <BarChart
          title="Pages de Coran lues sur 14 jours"
          data={chartData}
          color="var(--c-deen)"
          goal={goal}
          formatValue={(v) => `${formatNumber(v)} p.`}
          formatTick={(v) => `${v}`}
          valueHeader="Pages"
        />
      </Card>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Ma position" accent="deen">
        <div className="stack">
          <Field label="Dernière page lue" hint={`Mushaf de 604 pages. Page ${page ?? 0} ≈ hizb ${hizbOfPage(page ?? 1)}.`}>
            {(id) => <NumberInput id={id} value={page} onChange={setPage} decimals={false} min={0} max={QURAN_PAGES - 1} />}
          </Field>
          <Field label="Khatmas déjà terminées">
            {(id) => <NumberInput id={id} value={khatmas} onChange={setKhatmas} decimals={false} min={0} />}
          </Field>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setQuranPosition(page ?? 0, khatmas ?? 0);
              setEditOpen(false);
            }}
          >
            Enregistrer
          </button>
        </div>
      </Sheet>
    </div>
  );
}

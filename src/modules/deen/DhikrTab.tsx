import { Check, RotateCcw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Meter } from '../../components/ui/progress';
import { ADHKAR_ITEMS, TASBIH_PHRASES } from '../../data/deen';
import { parseISODate } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { useToday } from '../../lib/hooks';
import { cx, vibrate } from '../../lib/misc';
import { currentStreak } from '../../lib/streaks';
import { useStore } from '../../store/store';
import { toggleAdhkar, updateTasbih } from './actions';

function AdhkarCard() {
  const today = useToday();
  const adhkarLog = useStore((s) => s.adhkarLog);
  const day = adhkarLog[today];
  const isFriday = parseISODate(today).getDay() === 5;
  const items = ADHKAR_ITEMS.filter((i) => !i.fridayOnly || isFriday);
  const done = items.filter((i) => day?.[i.key]).length;
  const streak = currentStreak((d) => !!adhkarLog[d]?.morning && !!adhkarLog[d]?.evening, today);

  return (
    <Card title="Adhkar du jour" subtitle={`${done} / ${items.length} · série matin & soir : ${streak} j`} accent="deen">
      <div className="list">
        {items.map((item) => {
          const checked = !!day?.[item.key];
          return (
            <div key={item.key} className="list-item">
              <div className="grow">
                <div className="item-title">
                  {item.label} <span className="ar muted small">{item.ar}</span>
                </div>
                <div className="item-meta">{item.detail}</div>
              </div>
              <button
                type="button"
                className={cx('check-btn', checked && 'done')}
                aria-pressed={checked}
                aria-label={item.label}
                onClick={() => toggleAdhkar(today, item.key)}
              >
                <Check size={20} strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TasbihCard() {
  const tasbih = useStore((s) => s.tasbih);
  const phrase = TASBIH_PHRASES.find((p) => p.id === tasbih.phrase) ?? TASBIH_PHRASES[0];
  const reached = tasbih.count >= tasbih.target;

  const increment = () => {
    const count = tasbih.count + 1;
    if (count === tasbih.target) vibrate([40, 60, 40]);
    else vibrate(8);
    updateTasbih({ count, total: tasbih.total + 1 });
  };

  return (
    <Card
      title="Tasbih"
      subtitle={`Total : ${formatNumber(tasbih.total)} dhikr`}
      accent="deen"
      action={
        <button type="button" className="icon-btn" onClick={() => updateTasbih({ count: 0 })} aria-label="Remettre le compteur à zéro">
          <RotateCcw size={18} />
        </button>
      }
    >
      <div className="chips accent-deen" role="radiogroup" aria-label="Dhikr">
        {TASBIH_PHRASES.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            role="radio"
            aria-checked={p.id === phrase.id}
            onClick={() => updateTasbih({ phrase: p.id, target: p.target, count: 0 })}
          >
            {p.fr}
          </button>
        ))}
      </div>
      <p className="ar center" style={{ fontSize: 30, margin: '16px 0 4px' }}>
        {phrase.ar}
      </p>
      <button type="button" className="tasbih-btn" onClick={increment} aria-label={`${phrase.fr} : ${tasbih.count} sur ${tasbih.target}. Toucher pour compter.`}>
        <span>
          <span className="tasbih-count">{tasbih.count}</span>
          <span style={{ display: 'block', fontSize: 14, opacity: 0.85 }}>/ {tasbih.target}</span>
        </span>
      </button>
      <Meter value={Math.min(tasbih.count, tasbih.target)} max={tasbih.target} label="Progression du tasbih" />
      <p className="center small muted" style={{ marginTop: 8 }}>
        {reached ? 'Objectif atteint — barak Allahu fik ! Continuez ou changez de dhikr.' : 'Touchez le cercle à chaque dhikr (vibration à l’objectif).'}
      </p>
    </Card>
  );
}

export function DhikrTab() {
  return (
    <div className="grid cols-2">
      <AdhkarCard />
      <TasbihCard />
    </div>
  );
}

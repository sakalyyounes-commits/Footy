import { Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Segmented, Stepper, Switch } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { Sheet } from '../../components/ui/Sheet';
import { toast } from '../../components/ui/toast';
import { FOOD_CATEGORIES, FOODS } from '../../data/foods';
import type { ISODate } from '../../lib/dates';
import { formatKcal, formatNumber } from '../../lib/format';
import { normalize, round } from '../../lib/misc';
import { useStore } from '../../store/store';
import type { FoodItem, MealSlot } from '../../store/types';
import { addCustomFood, addMeal, type SlotDef } from './actions';

interface Props {
  open: boolean;
  onClose: () => void;
  date: ISODate;
  slot: MealSlot;
  slots: SlotDef[];
}

export function AddFoodSheet({ open, onClose, date, slot: initialSlot, slots }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Ajouter un aliment" accent="nutrition">
      {open && <AddFoodForm date={date} initialSlot={initialSlot} slots={slots} onDone={onClose} />}
    </Sheet>
  );
}

function AddFoodForm({
  date,
  initialSlot,
  slots,
  onDone,
}: {
  date: ISODate;
  initialSlot: MealSlot;
  slots: SlotDef[];
  onDone: () => void;
}) {
  const customFoods = useStore((s) => s.customFoods);
  const meals = useStore((s) => s.meals);
  const [mode, setMode] = useState<'list' | 'manual'>('list');
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState(1);

  const allFoods = useMemo(() => [...customFoods, ...FOODS], [customFoods]);

  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: FoodItem[] = [];
    for (const m of [...meals].sort((a, b) => b.ts - a.ts)) {
      if (!m.foodId || seen.has(m.foodId)) continue;
      const food = allFoods.find((f) => f.id === m.foodId);
      if (food) {
        seen.add(m.foodId);
        out.push(food);
      }
      if (out.length >= 8) break;
    }
    return out;
  }, [meals, allFoods]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (q) return allFoods.filter((f) => normalize(f.name).includes(q)).slice(0, 40);
    if (category === 'Mes aliments') return customFoods;
    if (category) return allFoods.filter((f) => f.category === category && !f.custom);
    return recents;
  }, [query, category, allFoods, customFoods, recents]);

  const add = () => {
    if (!selected) return;
    addMeal({
      date,
      slot,
      name: selected.name,
      qty,
      unit: selected.unit,
      foodId: selected.id,
      kcal: round(selected.kcal * qty),
      protein: round(selected.protein * qty, 1),
      carbs: round(selected.carbs * qty, 1),
      fat: round(selected.fat * qty, 1),
    });
    toast(`${selected.name} ajouté`);
    onDone();
  };

  return (
    <div className="stack">
      <div className="chips accent-nutrition" role="radiogroup" aria-label="Repas">
        {slots.map((s) => (
          <button key={s.slot} type="button" className="chip" role="radio" aria-checked={s.slot === slot} onClick={() => setSlot(s.slot)}>
            <span aria-hidden>{s.emoji}</span> {s.label}
          </button>
        ))}
      </div>
      <Segmented
        ariaLabel="Mode de saisie"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'list', label: 'Base d’aliments' },
          { value: 'manual', label: 'Saisie libre' },
        ]}
      />

      {mode === 'manual' ? (
        <ManualEntry date={date} slot={slot} onDone={onDone} />
      ) : selected ? (
        <div className="stack">
          <div className="card flat" style={{ background: 'var(--surface-2)' }}>
            <div className="row between top">
              <div className="grow">
                <div className="bold">{selected.name}</div>
                <div className="muted small">
                  {selected.unit} · {formatKcal(selected.kcal)}
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                Changer
              </button>
            </div>
          </div>
          <div className="row between">
            <span className="bold">Quantité</span>
            <Stepper
              ariaLabel="Quantité"
              value={qty}
              onChange={setQty}
              step={0.5}
              min={0.5}
              max={20}
              format={(v) => `× ${formatNumber(v, 1)}`}
            />
          </div>
          <div className="stats">
            <MacroStat label="Énergie" value={formatKcal(selected.kcal * qty)} />
            <MacroStat label="Protéines" value={`${formatNumber(selected.protein * qty, 1)} g`} />
            <MacroStat label="Glucides" value={`${formatNumber(selected.carbs * qty, 1)} g`} />
            <MacroStat label="Lipides" value={`${formatNumber(selected.fat * qty, 1)} g`} />
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={add}>
            Ajouter au repas
          </button>
          <p className="field-hint">Valeurs indicatives pour une portion standard.</p>
        </div>
      ) : (
        <>
          <div className="input-wrap">
            <input
              className="input"
              type="search"
              placeholder="Rechercher : harira, msemen, poulet…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un aliment"
              style={{ paddingLeft: 40 }}
            />
            <Search size={18} className="subtle" style={{ position: 'absolute', left: 12, top: 14 }} aria-hidden />
          </div>
          {!query && (
            <div className="chips accent-nutrition">
              <button type="button" className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}>
                <Star size={14} /> Récents
              </button>
              {customFoods.length > 0 && (
                <button
                  type="button"
                  className="chip"
                  aria-pressed={category === 'Mes aliments'}
                  onClick={() => setCategory('Mes aliments')}
                >
                  Mes aliments
                </button>
              )}
              {FOOD_CATEGORIES.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="stack-xs">
            {results.length === 0 ? (
              <p className="muted small center" style={{ padding: 16 }}>
                {query
                  ? 'Aucun aliment trouvé. Utilisez la saisie libre pour l’ajouter.'
                  : 'Vos aliments récents apparaîtront ici. Choisissez une catégorie ou recherchez un aliment.'}
              </p>
            ) : (
              results.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="food-result"
                  onClick={() => {
                    setSelected(f);
                    setQty(1);
                  }}
                >
                  <div className="grow">
                    <div className="bold truncate">{f.name}</div>
                    <div className="muted small truncate">
                      {f.unit}
                      {f.custom ? ' · perso' : ''}
                    </div>
                  </div>
                  <span className="badge">{formatKcal(f.kcal)}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 18 }}>
        {value}
      </div>
    </div>
  );
}

function ManualEntry({ date, slot, onDone }: { date: ISODate; slot: MealSlot; onDone: () => void }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('1 portion');
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [carbs, setCarbs] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);
  const [save, setSave] = useState(true);

  const valid = name.trim() !== '' && kcal !== null;

  const submit = () => {
    if (!valid) return;
    const macros = { kcal: kcal ?? 0, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 };
    const food = save ? addCustomFood({ name: name.trim(), unit: unit.trim() || '1 portion', category: 'Mes aliments', ...macros }) : null;
    addMeal({ date, slot, name: name.trim(), qty: 1, unit: unit.trim() || '1 portion', foodId: food?.id, ...macros });
    toast(`${name.trim()} ajouté`);
    onDone();
  };

  return (
    <div className="stack">
      <Field label="Nom">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Tajine de ma mère" />}</Field>
      <Field label="Portion">{(id) => <input id={id} className="input" value={unit} onChange={(e) => setUnit(e.target.value)} />}</Field>
      <div className="form-row">
        <Field label="Calories">{(id) => <NumberInput id={id} value={kcal} onChange={setKcal} suffix="kcal" decimals={false} min={0} />}</Field>
        <Field label="Protéines">{(id) => <NumberInput id={id} value={protein} onChange={setProtein} suffix="g" min={0} />}</Field>
        <Field label="Glucides">{(id) => <NumberInput id={id} value={carbs} onChange={setCarbs} suffix="g" min={0} />}</Field>
        <Field label="Lipides">{(id) => <NumberInput id={id} value={fat} onChange={setFat} suffix="g" min={0} />}</Field>
      </div>
      <Switch checked={save} onChange={setSave} label="Enregistrer dans mes aliments" description="Pour le retrouver rapidement la prochaine fois" />
      <button type="button" className="btn btn-primary btn-lg" disabled={!valid} onClick={submit}>
        Ajouter au repas
      </button>
    </div>
  );
}

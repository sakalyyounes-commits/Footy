import { Database, Download, Info, MoonStar, Palette, Target, Upload, User, Wallet } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Segmented, Stepper, Switch } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/layout';
import { toast } from '../../components/ui/toast';
import { formatTime, todayISO } from '../../lib/dates';
import { CURRENCIES, formatMl, formatNumber } from '../../lib/format';
import { baseWaterGoal, calorieTarget } from '../../lib/health';
import { downloadFile } from '../../lib/misc';
import { getDayTimes, METHODS, TIME_KEYS, TIME_LABELS } from '../../lib/prayer';
import { markBackupDone, parseBackup, resetAllData, restoreBackup, serializeBackup } from '../../store/backup';
import { transactionsToCSV } from '../../lib/finance';
import { useLatestWeightKg } from '../../store/selectors';
import { getData, useStore } from '../../store/store';
import type { PrayerMethodId, ThemePref } from '../../store/types';
import { updateGoals, updatePrayerSettings, updateProfile, updateSettings } from './actions';
import { PrayerLocation } from './PrayerLocation';
import { ProfileFields } from './ProfileFields';

function ProfileSection() {
  const target = useStore((s) => s.profile.targetWeightKg);
  const weightKg = useLatestWeightKg();
  return (
    <Card title="Profil" subtitle="Sert à calculer vos besoins en calories et en eau" icon={<User size={18} />} accent="brand">
      <div className="stack">
        <ProfileFields />
        <div className="form-row">
          <Field label="Poids actuel" hint={<Link to="/corps" className="accent-text">Mettre à jour dans « Poids & corps »</Link>}>
            {(id) => <input id={id} className="input" value={weightKg ? `${formatNumber(weightKg, 1)} kg` : '—'} readOnly />}
          </Field>
          <Field label="Poids visé">
            {(id) => <NumberInput id={id} value={target} onChange={(targetWeightKg) => updateProfile({ targetWeightKg })} suffix="kg" placeholder="—" />}
          </Field>
        </div>
      </div>
    </Card>
  );
}

function GoalsSection() {
  const goals = useStore((s) => s.settings.goals);
  const profile = useStore((s) => s.profile);
  const weightKg = useLatestWeightKg();
  const autoWater = baseWaterGoal(weightKg, null);
  const autoKcal = calorieTarget(profile, weightKg, null);

  return (
    <Card title="Objectifs quotidiens" icon={<Target size={18} />} accent="brand">
      <div className="stack">
        <Switch
          checked={goals.waterMl === null}
          onChange={(auto) => updateGoals({ waterMl: auto ? null : autoWater })}
          label="Objectif d’eau automatique"
          description={`35 ml par kg de poids : ${formatMl(autoWater)} (+ bonus les jours de sport)`}
        />
        {goals.waterMl !== null && (
          <Field label="Objectif d’eau">{(id) => <NumberInput id={id} value={goals.waterMl} onChange={(v) => v && updateGoals({ waterMl: v })} suffix="ml" decimals={false} min={500} max={8000} allowEmpty={false} />}</Field>
        )}
        <Switch
          checked={goals.kcal === null}
          onChange={(auto) => updateGoals({ kcal: auto ? null : autoKcal ?? 2000 })}
          label="Objectif calorique automatique"
          description={autoKcal ? `Calculé selon votre profil : ${formatNumber(autoKcal)} kcal` : 'Complétez âge, taille et poids pour le calcul automatique'}
        />
        {goals.kcal !== null && (
          <Field label="Objectif calorique">{(id) => <NumberInput id={id} value={goals.kcal} onChange={(v) => v && updateGoals({ kcal: v })} suffix="kcal" decimals={false} min={800} max={8000} allowEmpty={false} />}</Field>
        )}
        <div className="form-row">
          <Field label="Pas par jour">{(id) => <NumberInput id={id} value={goals.steps} onChange={(v) => v !== null && updateGoals({ steps: v })} decimals={false} min={0} allowEmpty={false} />}</Field>
          <Field label="Sommeil">{(id) => <NumberInput id={id} value={goals.sleepHours} onChange={(v) => v !== null && updateGoals({ sleepHours: v })} suffix="h" min={3} max={14} allowEmpty={false} />}</Field>
          <Field label="Séances / semaine">{(id) => <NumberInput id={id} value={goals.workoutsPerWeek} onChange={(v) => v !== null && updateGoals({ workoutsPerWeek: v })} decimals={false} min={1} max={14} allowEmpty={false} />}</Field>
          <Field label="Coran (pages / jour)">{(id) => <NumberInput id={id} value={goals.quranPagesPerDay} onChange={(v) => v !== null && updateGoals({ quranPagesPerDay: v })} decimals={false} min={1} max={604} allowEmpty={false} />}</Field>
        </div>
      </div>
    </Card>
  );
}

function PrayerSection() {
  const prayer = useStore((s) => s.settings.prayer);
  const times = useMemo(() => getDayTimes(prayer, todayISO()), [prayer]);
  return (
    <Card title="Horaires de prière" icon={<MoonStar size={18} />} accent="deen" id="prieres">
      <div className="stack">
        <PrayerLocation />
        <Field label="Méthode de calcul" hint={METHODS[prayer.method].detail}>
          {(id) => (
            <select id={id} className="select" value={prayer.method} onChange={(e) => updatePrayerSettings({ method: e.target.value as PrayerMethodId })}>
              {(Object.keys(METHODS) as PrayerMethodId[]).map((m) => (
                <option key={m} value={m}>
                  {METHODS[m].label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Asr" hint="Standard : écoles malikite, chafi‘ite et hanbalite.">
          {() => (
            <Segmented
              ariaLabel="Calcul de Asr"
              value={prayer.asr}
              onChange={(asr) => updatePrayerSettings({ asr })}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'hanafi', label: 'Hanafi' },
              ]}
            />
          )}
        </Field>
        <div className="stack-sm">
          <span className="field-label">Ajustements manuels (minutes) · aujourd’hui</span>
          {TIME_KEYS.map((k) => (
            <div key={k} className="row between">
              <span>
                {TIME_LABELS[k].fr} <span className="muted num">{formatTime(times[k])}</span>
              </span>
              <Stepper
                ariaLabel={`Ajustement ${TIME_LABELS[k].fr}`}
                value={prayer.adjustments[k]}
                onChange={(v) => updatePrayerSettings({ adjustments: { ...prayer.adjustments, [k]: v } })}
                min={-30}
                max={30}
                format={(v) => (v > 0 ? `+${v}` : String(v))}
              />
            </div>
          ))}
          <p className="field-hint">Pour caler l’application sur l’horaire de votre mosquée.</p>
        </div>
        <div className="row between">
          <span>Décalage du calendrier hégirien</span>
          <Stepper ariaLabel="Décalage hégirien" value={prayer.hijriOffset} onChange={(hijriOffset) => updatePrayerSettings({ hijriOffset })} min={-3} max={3} format={(v) => (v > 0 ? `+${v} j` : `${v} j`)} />
        </div>
      </div>
    </Card>
  );
}

function AppearanceSection() {
  const theme = useStore((s) => s.settings.theme);
  const currency = useStore((s) => s.settings.currency);
  return (
    <Card title="Apparence & devise" icon={<Palette size={18} />} accent="brand">
      <div className="stack">
        <Field label="Thème">
          {() => (
            <Segmented
              ariaLabel="Thème"
              value={theme}
              onChange={(t: ThemePref) => updateSettings({ theme: t })}
              options={[
                { value: 'system', label: 'Automatique' },
                { value: 'light', label: 'Clair' },
                { value: 'dark', label: 'Sombre' },
              ]}
            />
          )}
        </Field>
        <Field label="Devise" hint={<span className="row" style={{ gap: 4 }}><Wallet size={13} /> Utilisée dans Finances et Zakat</span>}>
          {(id) => (
            <select id={id} className="select" value={currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} ({c.symbol})
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
    </Card>
  );
}

function DataSection() {
  const lastBackupAt = useStore((s) => s.meta.lastBackupAt);
  const fileRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  const exportJson = () => {
    downloadFile(`hayati-sauvegarde-${todayISO()}.json`, serializeBackup(getData()), 'application/json');
    markBackupDone();
    toast('Sauvegarde téléchargée');
  };

  const importJson = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      if (!window.confirm('Remplacer toutes les données actuelles par celles de la sauvegarde ?')) return;
      restoreBackup(data);
      toast('Sauvegarde restaurée ✓');
    } catch (e) {
      toast((e as Error).message, { tone: 'error', duration: 6000 });
    }
  };

  const reset = () => {
    const answer = window.prompt('Toutes vos données seront effacées de cet appareil. Tapez EFFACER pour confirmer.');
    if (answer?.trim().toUpperCase() === 'EFFACER') {
      resetAllData();
      toast('Données effacées');
    }
  };

  return (
    <Card title="Mes données" subtitle="Tout est stocké sur cet appareil, rien n’est envoyé sur Internet" icon={<Database size={18} />} accent="brand">
      <div className="stack">
        <p className="small muted">
          Dernière sauvegarde : {lastBackupAt ? new Date(lastBackupAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'jamais'}. Exportez régulièrement
          un fichier de sauvegarde (par exemple dans votre Drive) : il permet aussi de transférer vos données vers un autre appareil.
        </p>
        <div className="row wrap">
          <button type="button" className="btn btn-primary" onClick={exportJson}>
            <Download size={18} /> Exporter une sauvegarde
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Importer
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => downloadFile(`hayati-transactions-${todayISO()}.csv`, transactionsToCSV(getData().transactions, getData().categories), 'text/csv;charset=utf-8')}
          >
            Transactions (CSV)
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importJson(file);
            e.target.value = '';
          }}
        />
        {persisted === false && (
          <button
            type="button"
            className="btn btn-ghost btn-sm wrap"
            style={{ alignSelf: 'flex-start' }}
            onClick={async () => {
              const ok = await navigator.storage?.persist?.();
              setPersisted(!!ok);
              toast(ok ? 'Stockage protégé ✓' : 'Le navigateur a refusé ; installez l’application sur l’écran d’accueil.');
            }}
          >
            Protéger mes données contre l’effacement automatique
          </button>
        )}
        {persisted && <p className="xsmall good-text">✓ Stockage protégé par le navigateur</p>}
        <div className="divider" />
        <button type="button" className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }} onClick={reset}>
          Effacer toutes les données
        </button>
      </div>
    </Card>
  );
}

function AboutSection() {
  return (
    <Card title="À propos" icon={<Info size={18} />} accent="brand">
      <div className="stack-sm small muted">
        <p>
          <strong className="bold" style={{ color: 'var(--text)' }}>Hayati</strong> — version {__APP_VERSION__}. Application personnelle, gratuite et sans publicité.
        </p>
        <p>
          <strong>Installer sur le téléphone :</strong> iPhone → Safari → bouton Partager → « Sur l’écran d’accueil ». Android → Chrome → menu ⋮ → « Installer
          l’application ». Elle fonctionne ensuite hors connexion.
        </p>
        <p>Les valeurs nutritionnelles, calories sportives et calculs de zakat sont indicatifs.</p>
      </div>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="stack-lg">
      <PageHeader title="Réglages" back={{ to: '/plus', label: 'Plus' }} />
      <div className="grid cols-2">
        <div className="stack-lg">
          <ProfileSection />
          <GoalsSection />
          <AppearanceSection />
        </div>
        <div className="stack-lg">
          <PrayerSection />
          <DataSection />
          <AboutSection />
        </div>
      </div>
    </div>
  );
}

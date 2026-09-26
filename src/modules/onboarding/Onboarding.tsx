import { ArrowRight, BookOpen, HeartPulse, ListChecks, MoonStar, ShieldCheck, Upload, Wallet } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { LogoMark } from '../../app/Layout';
import { Field, NumberInput } from '../../components/ui/Field';
import { toast, Toaster } from '../../components/ui/toast';
import { formatTime, todayISO } from '../../lib/dates';
import { uid } from '../../lib/misc';
import { getDayTimes, METHODS, PRAYERS, TIME_LABELS } from '../../lib/prayer';
import { parseBackup, restoreBackup } from '../../store/backup';
import { update, useStore } from '../../store/store';
import type { PrayerMethodId } from '../../store/types';
import { saveWeight } from '../body/BodyPage';
import { updatePrayerSettings, updateProfile } from '../settings/actions';
import { PrayerLocation } from '../settings/PrayerLocation';
import { ProfileFields } from '../settings/ProfileFields';

const FEATURES = [
  { icon: MoonStar, text: 'Horaires et suivi des prières, Coran, adhkar, jeûne' },
  { icon: HeartPulse, text: 'Eau, nutrition, sport, sommeil et poids' },
  { icon: Wallet, text: 'Dépenses, budgets, charges fixes et épargne' },
  { icon: ListChecks, text: 'Habitudes, journal, tâches et objectifs' },
];

function finish() {
  update((s) => ({ meta: { ...s.meta, onboarded: true } }));
}

export function Onboarding() {
  const [step, setStep] = useState(0);
  const name = useStore((s) => s.profile.name);
  const prayer = useStore((s) => s.settings.prayer);
  const [weight, setWeight] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const times = useMemo(() => getDayTimes(prayer, todayISO()), [prayer]);

  const next = () => {
    if (step === 1 && weight) saveWeight({ id: uid(), date: todayISO(), kg: weight });
    setStep((s) => s + 1);
  };

  const importBackup = async (file: File) => {
    try {
      restoreBackup(parseBackup(await file.text()));
      toast('Sauvegarde restaurée ✓');
    } catch (e) {
      toast((e as Error).message, { tone: 'error', duration: 6000 });
    }
  };

  return (
    <div className="onboarding">
      <div className="progress-dots" aria-label={`Étape ${step + 1} sur 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i <= step ? 'on' : undefined} />
        ))}
      </div>

      {step === 0 && (
        <div className="stack-lg">
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            <LogoMark size={40} className="xl" />
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>Salam, bienvenue sur Hayati</h1>
            <p className="muted">
              <span className="ar">حياتي</span> — « ma vie ». Un seul endroit pour prendre soin de votre dîn, de votre santé, de vos finances et de vos habitudes.
            </p>
          </div>
          <div className="card stack-sm">
            {FEATURES.map((f) => (
              <div key={f.text} className="row">
                <span className="icon-chip">
                  <f.icon size={18} />
                </span>
                <span className="small">{f.text}</span>
              </div>
            ))}
          </div>
          <div className="banner">
            <ShieldCheck size={18} className="banner-icon" />
            <span className="small">Vos données restent sur votre appareil. Pas de compte, pas de publicité.</span>
          </div>
          <Field label="Comment vous appelez-vous ?">
            {(id) => <input id={id} className="input" value={name} onChange={(e) => updateProfile({ name: e.target.value })} placeholder="Votre prénom" autoComplete="given-name" />}
          </Field>
          <button type="button" className="btn btn-primary btn-lg" onClick={next}>
            Commencer <ArrowRight size={18} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> J’ai déjà une sauvegarde
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importBackup(file);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {step === 1 && (
        <div className="stack-lg">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>Votre profil</h1>
            <p className="muted">Pour calculer vos besoins en calories et en eau. Tout est modifiable plus tard.</p>
          </div>
          <ProfileFields showName={false} />
          <Field label="Poids actuel">{(id) => <NumberInput id={id} value={weight} onChange={setWeight} suffix="kg" placeholder="75" />}</Field>
          <button type="button" className="btn btn-primary btn-lg" onClick={next}>
            Continuer <ArrowRight size={18} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
            Passer cette étape
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="stack-lg">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>Horaires de prière</h1>
            <p className="muted">Choisissez votre ville ou utilisez votre position.</p>
          </div>
          <PrayerLocation />
          <Field label="Méthode de calcul">
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
          <div className="card accent-deen">
            <div className="small muted" style={{ marginBottom: 8 }}>
              Aujourd’hui à {prayer.label}
            </div>
            <div className="row between wrap">
              {PRAYERS.map((p) => (
                <div key={p} className="center">
                  <div className="small muted">{TIME_LABELS[p].fr}</div>
                  <div className="bold num">{formatTime(times[p])}</div>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={next}>
            Continuer <ArrowRight size={18} />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="stack-lg">
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 56 }} aria-hidden>
              🌿
            </span>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>C’est prêt{name ? `, ${name}` : ''} !</h1>
            <p className="muted">Bismillah. Quelques conseils pour bien démarrer :</p>
          </div>
          <div className="card stack-sm small">
            <p>
              📱 <strong>Installez l’application</strong> : iPhone → Safari → Partager → « Sur l’écran d’accueil ». Android → Chrome → ⋮ → « Installer
              l’application ».
            </p>
            <p>
              💾 <strong>Sauvegardez chaque mois</strong> depuis Réglages → Mes données (vos données ne quittent jamais votre téléphone).
            </p>
            <p>
              <BookOpen size={14} style={{ verticalAlign: -2 }} /> <strong>Commencez petit</strong> : les 5 prières, 2 L d’eau et une habitude. La régularité fait
              le reste.
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={finish}>
            C’est parti <ArrowRight size={18} />
          </button>
        </div>
      )}
      <Toaster />
    </div>
  );
}

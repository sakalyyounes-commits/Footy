import { Segmented } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { ACTIVITY_LEVELS, WEIGHT_GOALS } from '../../lib/health';
import { useStore } from '../../store/store';
import type { ActivityLevel, WeightGoal } from '../../store/types';
import { updateProfile } from './actions';

/** Champs du profil (réutilisés dans les réglages et l'accueil). */
export function ProfileFields({ showName = true }: { showName?: boolean }) {
  const profile = useStore((s) => s.profile);
  return (
    <div className="stack">
      {showName && (
        <Field label="Prénom">
          {(id) => <input id={id} className="input" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} placeholder="Votre prénom" autoComplete="given-name" />}
        </Field>
      )}
      <Field label="Sexe">
        {() => (
          <Segmented
            ariaLabel="Sexe"
            value={profile.sex}
            onChange={(sex) => updateProfile({ sex })}
            options={[
              { value: 'male', label: 'Homme' },
              { value: 'female', label: 'Femme' },
            ]}
          />
        )}
      </Field>
      <div className="form-row">
        <Field label="Année de naissance">
          {(id) => <NumberInput id={id} value={profile.birthYear} onChange={(birthYear) => updateProfile({ birthYear })} decimals={false} placeholder="1995" />}
        </Field>
        <Field label="Taille">
          {(id) => <NumberInput id={id} value={profile.heightCm} onChange={(heightCm) => updateProfile({ heightCm })} suffix="cm" decimals={false} placeholder="175" />}
        </Field>
      </div>
      <Field label="Niveau d’activité" hint={ACTIVITY_LEVELS[profile.activity].detail}>
        {(id) => (
          <select id={id} className="select" value={profile.activity} onChange={(e) => updateProfile({ activity: e.target.value as ActivityLevel })}>
            {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((k) => (
              <option key={k} value={k}>
                {ACTIVITY_LEVELS[k].label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Objectif">
        {() => (
          <Segmented
            ariaLabel="Objectif de poids"
            value={profile.goal}
            onChange={(goal: WeightGoal) => updateProfile({ goal })}
            options={(Object.keys(WEIGHT_GOALS) as WeightGoal[]).map((g) => ({
              value: g,
              label: g === 'lose' ? 'Perdre' : g === 'gain' ? 'Prendre' : 'Maintenir',
            }))}
          />
        )}
      </Field>
    </div>
  );
}

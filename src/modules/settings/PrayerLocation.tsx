import { LocateFixed } from 'lucide-react';
import { useState } from 'react';
import { Field } from '../../components/ui/Field';
import { toast } from '../../components/ui/toast';
import { CITIES, findCity } from '../../data/cities';
import { useStore } from '../../store/store';
import { locate, updatePrayerSettings } from './actions';

/** Choix de la ville (liste) ou de la position GPS pour les horaires de prière. */
export function PrayerLocation() {
  const prayer = useStore((s) => s.settings.prayer);
  const [busy, setBusy] = useState(false);
  const countries = [...new Set(CITIES.map((c) => c.country))];

  const useGps = async () => {
    setBusy(true);
    try {
      const { lat, lng } = await locate();
      updatePrayerSettings({ cityId: null, label: 'Ma position', lat, lng });
      toast('Position enregistrée');
    } catch (e) {
      toast((e as Error).message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack-sm">
      <Field label="Ville">
        {(id) => (
          <select
            id={id}
            className="select"
            value={prayer.cityId ?? 'custom'}
            onChange={(e) => {
              const city = findCity(e.target.value);
              if (city) updatePrayerSettings({ cityId: city.id, label: city.name, lat: city.lat, lng: city.lng });
            }}
          >
            {prayer.cityId === null && <option value="custom">📍 {prayer.label}</option>}
            {countries.map((country) => (
              <optgroup key={country} label={country}>
                {CITIES.filter((c) => c.country === country).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </Field>
      <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={useGps} disabled={busy}>
        <LocateFixed size={16} /> {busy ? 'Localisation…' : 'Utiliser ma position GPS'}
      </button>
    </div>
  );
}

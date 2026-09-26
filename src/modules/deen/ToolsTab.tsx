import { Compass, Coins, MapPin, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Segmented, Stepper } from '../../components/ui/controls';
import { Field, NumberInput } from '../../components/ui/Field';
import { Stat } from '../../components/ui/progress';
import { formatMoney, formatNumber } from '../../lib/format';
import { computeZakat } from '../../lib/finance';
import { formatHijri, formatHijriAr, toHijri } from '../../lib/hijri';
import { useToday } from '../../lib/hooks';
import { vibrate } from '../../lib/misc';
import { compassLabel, METHODS, qiblaBearing } from '../../lib/prayer';
import { update, useStore } from '../../store/store';
import type { ZakatInputs } from '../../store/types';
import { updateZakat } from './actions';

type CompassStatus = 'idle' | 'active' | 'denied' | 'unsupported';

interface OrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

function QiblaCard() {
  const { lat, lng, label } = useStore((s) => s.settings.prayer);
  const bearing = qiblaBearing(lat, lng);
  const [heading, setHeading] = useState<number | null>(null);
  const [status, setStatus] = useState<CompassStatus>('idle');
  const aligned = heading !== null && Math.abs(((bearing - heading + 540) % 360) - 180) < 5;
  const wasAligned = useRef(false);

  useEffect(() => {
    if (aligned && !wasAligned.current) vibrate([30, 40, 30]);
    wasAligned.current = aligned;
  }, [aligned]);

  useEffect(() => {
    if (status !== 'active') return;
    const onAbsolute = (e: DeviceOrientationEvent) => {
      if (e.absolute && e.alpha !== null) setHeading((360 - e.alpha) % 360);
    };
    const onRelative = (e: DeviceOrientationEvent) => {
      const h = (e as OrientationEventWithCompass).webkitCompassHeading;
      if (typeof h === 'number') setHeading(h);
    };
    window.addEventListener('deviceorientationabsolute', onAbsolute as EventListener);
    window.addEventListener('deviceorientation', onRelative);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onAbsolute as EventListener);
      window.removeEventListener('deviceorientation', onRelative);
    };
  }, [status]);

  const start = async () => {
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (!DOE) return setStatus('unsupported');
    try {
      if (typeof DOE.requestPermission === 'function' && (await DOE.requestPermission()) !== 'granted') return setStatus('denied');
      setStatus('active');
    } catch {
      setStatus('denied');
    }
  };

  const rad = (bearing * Math.PI) / 180;
  const dialRotation = heading === null ? 0 : -heading;

  return (
    <Card title="Qibla" subtitle={`${formatNumber(bearing, 1)}° depuis le nord (${compassLabel(bearing)})`} icon={<Compass size={18} />} accent="deen">
      <div className="compass" aria-hidden>
        <div className="compass-pointer" />
        <div className="compass-dial" style={{ transform: `rotate(${dialRotation}deg)` }}>
          {[
            ['N', 50, 7],
            ['E', 93, 50],
            ['S', 50, 93],
            ['O', 7, 50],
          ].map(([c, x, y]) => (
            <span key={c} className="cardinal" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
              {c}
            </span>
          ))}
          <div className="compass-needle" style={{ transform: `rotate(${bearing + 180}deg)` }} />
          <span className="compass-kaaba" style={{ left: `${50 + 31 * Math.sin(rad)}%`, top: `${50 - 31 * Math.cos(rad)}%` }}>
            🕋
          </span>
        </div>
        <div className="compass-center" />
      </div>
      <div className="stack-sm center">
        {status === 'active' ? (
          heading === null ? (
            <p className="small muted">Bougez le téléphone en formant un 8 pour calibrer la boussole…</p>
          ) : aligned ? (
            <p className="bold good-text">✓ Vous faites face à la Qibla</p>
          ) : (
            <p className="small muted">Tournez-vous jusqu’à ce que la Kaaba 🕋 arrive en haut, sous le repère.</p>
          )
        ) : (
          <>
            <button type="button" className="btn btn-soft" onClick={start}>
              <Compass size={18} /> Activer la boussole
            </button>
            {status === 'denied' && <p className="small critical-text">Accès à l’orientation refusé.</p>}
            {status === 'unsupported' && <p className="small muted">Boussole non disponible sur cet appareil.</p>}
            <p className="xsmall muted">
              Sans boussole : le nord est en haut du cadran. Direction calculée pour {label}.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

function ZakatCard() {
  const zakat = useStore((s) => s.zakat);
  const currency = useStore((s) => s.settings.currency);
  const result = computeZakat(zakat);
  const money = (n: number) => formatMoney(n, currency);

  const field = (key: keyof Omit<ZakatInputs, 'nisabBase'>, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      {(id) => <NumberInput id={id} value={zakat[key] || null} onChange={(v) => updateZakat({ [key]: v ?? 0 })} min={0} placeholder="0" />}
    </Field>
  );

  return (
    <Card title="Calculateur de zakat" subtitle="Zakat al-mal : 2,5 % de l’épargne détenue depuis un an lunaire" icon={<Coins size={18} />} accent="finance">
      <div className="stack">
        <div className="form-row">
          {field('cash', 'Liquidités & comptes')}
          {field('gold', 'Or (valeur)')}
          {field('silver', 'Argent (valeur)')}
          {field('investments', 'Placements, actions')}
          {field('receivables', 'Créances à recevoir')}
          {field('debts', 'Dettes à payer')}
        </div>
        <Field label="Nisab calculé sur">
          {() => (
            <Segmented
              ariaLabel="Base du nisab"
              value={zakat.nisabBase}
              onChange={(v) => updateZakat({ nisabBase: v })}
              options={[
                { value: 'gold', label: 'Or (85 g)' },
                { value: 'silver', label: 'Argent (595 g)' },
              ]}
            />
          )}
        </Field>
        {zakat.nisabBase === 'gold'
          ? field('goldPricePerGram', 'Prix du gramme d’or 24 carats', 'À vérifier le jour du calcul (bijoutier, banque).')
          : field('silverPricePerGram', 'Prix du gramme d’argent', 'À vérifier le jour du calcul.')}
        <div className="stats">
          <Stat label="Patrimoine net" value={money(result.net)} />
          <Stat label="Nisab" value={result.nisab ? money(result.nisab) : '—'} />
        </div>
        <div className="banner accent-finance">
          {result.nisab === 0 ? (
            <span>Indiquez le prix du gramme pour connaître le nisab.</span>
          ) : result.eligible ? (
            <span>
              Zakat à verser : <strong>{money(result.due)}</strong>
            </span>
          ) : (
            <span>Votre patrimoine est en dessous du nisab : pas de zakat due.</span>
          )}
        </div>
        <p className="xsmall muted">Calcul indicatif. Pour les cas particuliers (commerce, agriculture, bijoux portés), consultez un savant.</p>
      </div>
    </Card>
  );
}

function HijriCard() {
  const today = useToday();
  const prayer = useStore((s) => s.settings.prayer);
  const h = toHijri(today, prayer.hijriOffset);
  const setOffset = (hijriOffset: number) => update((s) => ({ settings: { ...s.settings, prayer: { ...s.settings.prayer, hijriOffset } } }));

  return (
    <Card title="Calendrier hégirien" accent="deen">
      <div className="stack">
        <div>
          <div className="big-number" style={{ fontSize: 30 }}>
            {formatHijri(h)}
          </div>
          <div className="ar muted" style={{ fontSize: 20 }}>
            {formatHijriAr(h)}
          </div>
        </div>
        <div className="row between">
          <span className="small muted">Décalage (jours)</span>
          <Stepper ariaLabel="Décalage hégirien" value={prayer.hijriOffset} onChange={setOffset} min={-3} max={3} format={(v) => (v > 0 ? `+${v}` : String(v))} />
        </div>
        <p className="xsmall muted">
          Calendrier Umm al-Qura. Au Maroc, le début des mois dépend de l’observation du croissant : ajustez d’un jour si besoin.
        </p>
      </div>
    </Card>
  );
}

function PrayerSettingsCard() {
  const prayer = useStore((s) => s.settings.prayer);
  return (
    <Card title="Réglages des horaires" icon={<Settings2 size={18} />} accent="deen">
      <div className="stack-sm">
        <div className="row small">
          <MapPin size={15} className="subtle" /> {prayer.label} ({formatNumber(prayer.lat, 3)}, {formatNumber(prayer.lng, 3)})
        </div>
        <div className="small muted">
          {METHODS[prayer.method].label} · {METHODS[prayer.method].detail}
        </div>
        <Link to="/reglages" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
          Changer de ville ou de méthode
        </Link>
      </div>
    </Card>
  );
}

export function ToolsTab() {
  return (
    <div className="grid cols-2">
      <QiblaCard />
      <div className="stack-lg">
        <HijriCard />
        <PrayerSettingsCard />
      </div>
      <div className="span-2">
        <ZakatCard />
      </div>
    </div>
  );
}

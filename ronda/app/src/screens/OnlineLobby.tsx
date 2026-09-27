import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { levelForXp, prizePerWinner, TABLES, type Mode } from '@ronda/core';
import { Coins, CoinIcon, Segmented, TopBar } from '../components/ui';
import { formatCoins, useT } from '../i18n';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { toast } from '../store/toast';

/** Couleur du feutre de chaque table (du vert de Tanger au rouge du palais de Rabat). */
const CITY_FELTS: Record<string, [string, string]> = {
  tanja: ['#3fd07f', '#0f6a34'],
  fes: ['#5d9bff', '#173f9e'],
  chaouen: ['#7cc4ff', '#1f5d98'],
  souira: ['#4fd1c5', '#0f5c63'],
  casa: ['#9a6bff', '#2f1780'],
  marrakech: ['#f0a94b', '#8a3f0c'],
  rabat: ['#ff6a5a', '#7a0d09'],
};

function CityTable({ id, label }: { id: string; label: string }) {
  const [a, b] = CITY_FELTS[id] ?? CITY_FELTS.tanja;
  return (
    <div className="city-table" style={{ ['--felt-a' as string]: a, ['--felt-b' as string]: b }}>
      <div className="ct-top" />
      <span className="ct-name">{label}</span>
    </div>
  );
}

export function OnlineLobby() {
  const t = useT();
  const nav = useNav();
  const lang = useSettings((s) => s.lang);
  const profile = useSession((s) => s.profile);
  const status = useSession((s) => s.status);
  const [mode, setMode] = useState<Mode>('2v2');
  const level = profile ? levelForXp(profile.xp) : 1;

  function join(tableId: string, entry: number, minLevel: number) {
    if (status !== 'online' || !profile) return toast(t('err.offline'), 'error');
    if (level < minLevel) return toast(t('lobby.min_level', { n: minLevel }), 'error');
    if (profile.coins < entry) {
      toast(t('lobby.not_enough'), 'error');
      nav.push({ name: 'shop', tab: 'coins' });
      return;
    }
    nav.push({ name: 'matchmaking', mode, tableId });
  }

  return (
    <div className="screen">
      <TopBar title={t('lobby.title')} onBack={nav.pop} right={<Coins amount={profile?.coins ?? null} onPlus={() => nav.push({ name: 'shop', tab: 'coins' })} />} />
      {status !== 'online' && (
        <div className="panel small" style={{ marginBottom: 12, borderColor: 'rgba(255,107,91,.5)' }}>
          {status === 'connecting' ? t('common.connecting') : t('common.server_down')}
        </div>
      )}
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: '1v1', label: t('mode.1v1') },
          { value: '2v2', label: t('mode.2v2') },
        ]}
      />
      <div className="col" style={{ marginTop: 14, gap: 10 }}>
        {TABLES.map((table, i) => {
          const locked = level < table.minLevel;
          const prize = prizePerWinner(table.entry, mode);
          return (
            <motion.button
              key={table.id}
              className={`city-card ${locked ? 'locked' : ''}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: locked ? 0.55 : 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => join(table.id, table.entry, table.minLevel)}
            >
              <CityTable id={table.id} label={table.cityAr} />
              <div style={{ flex: 1, textAlign: 'start' }}>
                <div className="city-name">{lang === 'ar' ? table.cityAr : table.city}</div>
                <div className="city-meta">
                  <span>
                    {t('lobby.entry')} <b>{formatCoins(table.entry, lang)}</b>
                  </span>
                  <span>
                    {t('lobby.prize')} <b>{formatCoins(prize, lang)}</b>
                  </span>
                </div>
              </div>
              {locked ? (
                <span className="chip">
                  <Lock size={14} /> {t('common.locked', { n: table.minLevel })}
                </span>
              ) : (
                <span className="btn btn-gold btn-sm">
                  <CoinIcon size={16} /> {t('common.play')}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

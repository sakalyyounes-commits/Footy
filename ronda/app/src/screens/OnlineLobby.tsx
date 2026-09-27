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

const CITY_COLORS: Record<string, string> = {
  tanja: 'linear-gradient(135deg,#1f8a66,#0a4a37)',
  fes: 'linear-gradient(135deg,#1d4f91,#0f2a52)',
  chaouen: 'linear-gradient(135deg,#5b9bd5,#2f6db3)',
  souira: 'linear-gradient(135deg,#2436b8,#121a63)',
  casa: 'linear-gradient(135deg,#34495e,#0c1726)',
  marrakech: 'linear-gradient(135deg,#c9803a,#7d1a12)',
  rabat: 'linear-gradient(135deg,#9b2318,#3f0c07)',
};

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
              <div className="city-badge" style={{ background: CITY_COLORS[table.id] }}>
                {table.cityAr.slice(0, 3)}
              </div>
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

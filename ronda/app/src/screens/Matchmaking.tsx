import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { findTable, modePlayers, prizePerWinner, type Mode } from '@ronda/core';
import { FramedAvatar } from '../components/Avatar';
import { CoinIcon, TopBar } from '../components/ui';
import { formatCoins, useT } from '../i18n';
import { connection } from '../net/connection';
import { PlayingCard } from './game/PlayingCard';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

export function Matchmaking({ mode, tableId }: { mode: Mode; tableId: string }) {
  const t = useT();
  const nav = useNav();
  const lang = useSettings((s) => s.lang);
  const avatar = useSettings((s) => s.avatar);
  const name = useSettings((s) => s.name);
  const queue = useSession((s) => s.queue);
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);
  const [seconds, setSeconds] = useState(0);
  const table = findTable(tableId);

  useEffect(() => {
    if (status === 'online') connection.send({ t: 'queue.join', mode, tableId });
  }, [status, mode, tableId]);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  function cancel() {
    connection.send({ t: 'queue.leave' });
    useSession.setState({ queue: null });
    nav.pop();
  }

  const players = modePlayers(mode);
  return (
    <div className="screen">
      <TopBar title={table ? (lang === 'ar' ? table.cityAr : table.city) : ''} onBack={cancel} />
      <div className="col" style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <div className="spinner-cards">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -34 }}
              animate={{ rotate: [i * 72, i * 72 + 360] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
            >
              <div style={{ transform: 'translateY(-38px)' }}>
                <PlayingCard card={i * 9} width={44} shared={false} initial={false} />
              </div>
            </motion.div>
          ))}
        </div>
        <h2 className="title gold-text" style={{ textAlign: 'center' }}>
          {t('mm.searching')}
        </h2>
        <p className="muted">{t('mm.waiting', { s: seconds })}</p>
        <div className="mm-seats">
          {Array.from({ length: players }, (_, i) =>
            i === 0 ? (
              <div key={i} className="mm-seat">
                <FramedAvatar index={avatar} size={60} frame={profile?.equipped.frame ?? 'frame-none'} />
                {name || t('common.you')}
              </div>
            ) : (
              <div key={i} className="mm-seat">
                <motion.div className="mm-empty" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}>
                  ?
                </motion.div>
                …
              </div>
            ),
          )}
        </div>
        {table && (
          <div className="row chip" style={{ height: 40 }}>
            <CoinIcon /> {t('lobby.entry')} {formatCoins(table.entry, lang)} → {t('lobby.prize')} {formatCoins(prizePerWinner(table.entry, mode), lang)}
          </div>
        )}
        <p className="small muted" style={{ textAlign: 'center', maxWidth: 320, marginTop: 18 }}>
          {t('mm.bots_soon')}
        </p>
        {!queue && status !== 'online' && <p className="small" style={{ color: 'var(--bad)' }}>{t('common.connecting')}</p>}
      </div>
      <button className="btn btn-ghost btn-block" onClick={cancel}>
        {t('common.cancel')}
      </button>
    </div>
  );
}

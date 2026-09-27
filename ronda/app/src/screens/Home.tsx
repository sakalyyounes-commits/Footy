import { BookOpen, Gift, Globe2, Play, Settings, ShoppingBag, Trophy, Users, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { levelProgress } from '@ronda/core';
import { sfx } from '../audio/audio';
import { starPoints } from '../cards/CardDefs';
import { FramedAvatar } from '../components/Avatar';
import { DailyModal, dailyAvailable } from '../components/DailyModal';
import { Coins, Logo } from '../components/ui';
import { formatNumber, useT } from '../i18n';
import { LocalController, loadSavedGame } from '../game/local';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

function ModeIcon({ children }: { children: ReactNode }) {
  return (
    <div className="mode-icon">
      <svg className="star" viewBox="0 0 60 60" aria-hidden="true">
        <polygon points={starPoints(30, 30, 29, 22)} fill="url(#g-gold)" stroke="#7a5310" strokeWidth="1.5" />
        <polygon points={starPoints(30, 30, 21, 16)} fill="#fff0b8" opacity="0.5" />
      </svg>
      <span className="glyph">{children}</span>
    </div>
  );
}

function ModeCard({ cls, icon, title, sub, live, onClick, delay }: {
  cls: string;
  icon: ReactNode;
  title: string;
  sub: string;
  live?: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      className={`mode-card ${cls}`}
      onClick={() => {
        sfx('tap');
        onClick();
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 24 }}
    >
      <ModeIcon>{icon}</ModeIcon>
      <div className="mode-text">
        <div className="mode-title">{title}</div>
        <div className="mode-sub">{sub}</div>
        {live && <div className="mode-live">{live}</div>}
      </div>
    </motion.button>
  );
}

export function Home() {
  const t = useT();
  const nav = useNav();
  const lang = useSettings((s) => s.lang);
  const name = useSettings((s) => s.name);
  const avatar = useSettings((s) => s.avatar);
  const profile = useSession((s) => s.profile);
  const status = useSession((s) => s.status);
  const online = useSession((s) => s.online);
  const [daily, setDaily] = useState(false);
  const saved = loadSavedGame();
  const progress = levelProgress(profile?.xp ?? 0);
  const giftReady = profile ? dailyAvailable(profile) : false;

  function resume() {
    if (!saved) return;
    useSession.getState().setGame(new LocalController(saved.setup, saved));
    nav.push({ name: 'game' });
  }

  return (
    <div className="screen">
      <div className="home-top">
        <button className="player-chip" onClick={() => nav.push({ name: 'profile' })}>
          <FramedAvatar index={avatar} size={48} frame={profile?.equipped.frame ?? 'frame-none'} />
          <div style={{ minWidth: 0 }}>
            <div className="name">{name || profile?.name || t('common.you')}</div>
            <div className="row" style={{ gap: 6 }}>
              <span className="level-badge">{progress.level}</span>
              <div className="xp-bar">
                <span style={{ width: `${Math.round((progress.current / progress.needed) * 100)}%` }} />
              </div>
            </div>
          </div>
        </button>
        <Coins amount={profile?.coins ?? null} onPlus={() => nav.push({ name: 'shop', tab: 'coins' })} />
        <button className="icon-btn" aria-label={t('settings.title')} onClick={() => nav.push({ name: 'settings' })}>
          <Settings size={20} />
        </button>
      </div>

      <div className="home-hero">
        <Logo />
        <p className="subtitle">{t('app.tagline')}</p>
      </div>

      <div className="mode-list">
        <ModeCard
          cls="online"
          icon={<Globe2 size={28} strokeWidth={2.4} />}
          title={t('home.online')}
          sub={t('home.online_sub')}
          live={status === 'online' ? t('common.online', { n: formatNumber(Math.max(online, 1), lang) }) : undefined}
          onClick={() => nav.push({ name: 'online' })}
          delay={0.05}
        />
        <ModeCard
          cls="friends"
          icon={<Users size={28} strokeWidth={2.4} />}
          title={t('home.friends')}
          sub={t('home.friends_sub')}
          onClick={() => nav.push({ name: 'friends' })}
          delay={0.12}
        />
        <ModeCard
          cls="offline"
          icon={<Bot size={28} strokeWidth={2.4} />}
          title={t('home.offline')}
          sub={t('home.offline_sub')}
          onClick={() => nav.push({ name: 'offline' })}
          delay={0.19}
        />
      </div>

      {saved && (
        <button className="resume-banner" onClick={resume}>
          <Play size={20} color="var(--gold-2)" />
          <span style={{ flex: 1, textAlign: 'start' }}>{t('home.resume')}</span>
          <span className="muted small">
            {saved.state.scores[0]} – {saved.state.scores[1]}
          </span>
        </button>
      )}

      <div className="home-dock">
        <button className="dock-btn" onClick={() => setDaily(true)}>
          <Gift size={24} />
          {t('home.daily')}
          {giftReady && <span className="badge">1</span>}
        </button>
        <button className="dock-btn" onClick={() => nav.push({ name: 'shop' })}>
          <ShoppingBag size={24} />
          {t('home.shop')}
        </button>
        <button className="dock-btn" onClick={() => nav.push({ name: 'ranking' })}>
          <Trophy size={24} />
          {t('home.ranking')}
        </button>
        <button className="dock-btn" onClick={() => nav.push({ name: 'rules' })}>
          <BookOpen size={24} />
          {t('home.rules')}
        </button>
      </div>

      <DailyModal open={daily} onClose={() => setDaily(false)} />
    </div>
  );
}

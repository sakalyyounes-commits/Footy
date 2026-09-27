import { BookOpen, Gift, Globe2, Play, Settings, ShoppingBag, Trophy, Users, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { levelProgress, REFERRAL_COINS, type Card } from '@ronda/core';
import { sfx } from '../audio/audio';
import { FramedAvatar } from '../components/Avatar';
import { DailyModal, dailyAvailable } from '../components/DailyModal';
import { Coins, Logo } from '../components/ui';
import { formatNumber, useT } from '../i18n';
import { LocalController, loadSavedGame } from '../game/local';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { PlayingCard } from './game/PlayingCard';

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
      <span className="mode-icon">{icon}</span>
      <div className="mode-text">
        <div className="mode-title">{title}</div>
        <div className="mode-sub">{sub}</div>
        {live && <div className="mode-live">{live}</div>}
      </div>
    </motion.button>
  );
}

/** Cartes de l'éventail d'accueil : as d'oros, cavalier de copas, roi d'espadas, 7 de bastos. */
const HERO_CARDS: Card[] = [0, 18, 29, 36];

function ChipStack({ colors, style }: { colors: string[]; style: React.CSSProperties }) {
  return (
    <div className="chip-stack" style={style}>
      {colors.map((c, i) => (
        <span key={i} className={`chip3d ${c}`} />
      ))}
    </div>
  );
}

/** Décor de l'accueil : éventail de cartes en 3D sous la lumière, piles de jetons. */
function HeroScene() {
  return (
    <div className="hero-scene" aria-hidden="true">
      <div className="hero-light" />
      <div className="hero-fan">
        {HERO_CARDS.map((c, i) => (
          <PlayingCard
            key={c}
            card={c}
            width={64}
            shared={false}
            initial={{ rotate: 0, opacity: 0, y: 30 }}
            animate={{ rotate: (i - 1.5) * 15, opacity: 1, y: Math.abs(i - 1.5) * 6 }}
            transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 200, damping: 18 }}
          />
        ))}
      </div>
      <ChipStack colors={['red', 'red', 'red', 'black']} style={{ left: '9%', bottom: 18 }} />
      <ChipStack colors={['blue', 'blue', 'gold']} style={{ left: '19%', bottom: 6 }} />
      <ChipStack colors={['green', 'green', 'green', 'green', 'red']} style={{ right: '10%', bottom: 16 }} />
      <ChipStack colors={['gold', 'black']} style={{ right: '21%', bottom: 4 }} />
    </div>
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
          <FramedAvatar index={avatar} size={46} frame={profile?.equipped.frame ?? 'frame-none'} />
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
        <HeroScene />
        <Logo />
      </div>

      <div className="mode-list">
        <ModeCard
          cls="online"
          icon={<Globe2 size={32} strokeWidth={2.4} />}
          title={t('home.online')}
          sub={t('home.online_sub')}
          live={status === 'online' ? t('common.online', { n: formatNumber(Math.max(online, 1), lang) }) : undefined}
          onClick={() => nav.push({ name: 'online' })}
          delay={0.05}
        />
        <ModeCard
          cls="friends"
          icon={<Users size={24} strokeWidth={2.6} />}
          title={t('home.friends')}
          sub={t('home.friends_sub')}
          onClick={() => nav.push({ name: 'friends' })}
          delay={0.12}
        />
        <ModeCard
          cls="offline"
          icon={<Bot size={24} strokeWidth={2.6} />}
          title={t('home.offline')}
          sub={t('home.offline_sub')}
          onClick={() => nav.push({ name: 'offline' })}
          delay={0.19}
        />
      </div>

      <motion.button
        className={`promo-banner ${giftReady ? 'daily' : 'invite'}`}
        onClick={() => (giftReady ? setDaily(true) : nav.push({ name: 'profile' }))}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.26 }}
      >
        <span className="promo-art" aria-hidden="true">
          {giftReady ? <Gift size={30} strokeWidth={2.4} /> : <Users size={28} strokeWidth={2.4} />}
        </span>
        <span className="promo-text">
          <b>{giftReady ? t('home.promo_daily') : t('home.promo_invite')}</b>
          <span>
            {giftReady ? t('home.promo_daily_sub') : t('home.promo_invite_sub', { n: formatNumber(REFERRAL_COINS, lang) })}
          </span>
        </span>
        <span className="promo-go">›</span>
      </motion.button>

      {saved && (
        <button className="resume-banner" onClick={resume}>
          <Play size={20} color="var(--gold-2)" />
          <span style={{ flex: 1, textAlign: 'start' }}>{t('home.resume')}</span>
          <span className="muted small">
            {saved.state.scores[0]} – {saved.state.scores[1]}
          </span>
        </button>
      )}

      <div className="home-dock-wrap">
        <div className="home-dock">
          <button className="dock-btn" onClick={() => setDaily(true)}>
            <span className="dock-icon">
              <Gift size={22} strokeWidth={2.4} />
            </span>
            {t('home.daily')}
            {giftReady && <span className="badge">1</span>}
          </button>
          <button className="dock-btn" onClick={() => nav.push({ name: 'shop' })}>
            <span className="dock-icon">
              <ShoppingBag size={22} strokeWidth={2.4} />
            </span>
            {t('home.shop')}
          </button>
          <button className="dock-btn" onClick={() => nav.push({ name: 'ranking' })}>
            <span className="dock-icon">
              <Trophy size={22} strokeWidth={2.4} />
            </span>
            {t('home.ranking')}
          </button>
          <button className="dock-btn" onClick={() => nav.push({ name: 'rules' })}>
            <span className="dock-icon">
              <BookOpen size={22} strokeWidth={2.4} />
            </span>
            {t('home.rules')}
          </button>
        </div>
      </div>

      <DailyModal open={daily} onClose={() => setDaily(false)} />
    </div>
  );
}

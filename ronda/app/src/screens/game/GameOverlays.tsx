import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { EMOJIS, PHRASES, teamOf, type Seat } from '@ronda/core';
import { starPoints } from '../../cards/CardDefs';
import { CoinIcon, Modal } from '../../components/ui';
import { useT, type TranslationKey } from '../../i18n';
import type { Banner, Floater, GameDisplay, SeatDisplay } from '../../game/types';
import { PlayingCard } from './PlayingCard';
import type { SeatPos } from './GameParts';

function Burst({ color }: { color: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => i);
  return (
    <motion.svg
      className="banner-burst"
      viewBox="-100 -100 200 200"
      initial={{ rotate: 0, scale: 0.4, opacity: 0 }}
      animate={{ rotate: 40, scale: 1, opacity: 0.85 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      {rays.map((i) => (
        <polygon key={i} points="0,0 -7,-100 7,-100" fill={color} opacity={i % 2 ? 0.35 : 0.6} transform={`rotate(${i * 22.5})`} />
      ))}
      <polygon points={starPoints(0, 0, 38, 26)} fill={color} opacity="0.7" />
    </motion.svg>
  );
}

export function BannerView({ banner, seats, myTeam }: { banner: Banner | null; seats: SeatDisplay[]; myTeam: number }) {
  const t = useT();
  const nameOf = (seat: Seat) => seats[seat]?.name ?? '';
  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          key={banner.id}
          className="banner"
          initial={{ opacity: 0, scale: 0.3, x: '-50%', y: '-50%' }}
          animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
          exit={{ opacity: 0, scale: 1.15, x: '-50%', y: '-50%' }}
          transition={{ type: 'spring', stiffness: 520, damping: 22 }}
        >
          {banner.kind === 'darba' && (
            <>
              <Burst color={teamOf(banner.seat) === myTeam ? '#f2c75c' : '#ff6b5b'} />
              <motion.div
                className={`banner-word ${banner.level === 1 ? 'darba' : 'escalate'}`}
                animate={{ rotate: [0, -6, 5, -3, 0] }}
                transition={{ duration: 0.5 }}
              >
                {t(`game.darba${banner.level}` as TranslationKey)}
              </motion.div>
              <div className="banner-sub">
                {nameOf(banner.seat)} · {t(`game.darba_sub${banner.level}` as TranslationKey, { n: banner.points })}
              </div>
            </>
          )}
          {banner.kind === 'missa' && (
            <>
              <Burst color="#3ecf8e" />
              <div className="banner-word missa">{t('game.missa')}</div>
              <div className="banner-sub">
                {nameOf(banner.seat)} · {t('game.missa_sub', { n: banner.points })}
              </div>
            </>
          )}
          {banner.kind === 'lastDeal' && <div className="banner-sub" style={{ fontSize: 18 }}>🃏 {t('game.last_deal')}</div>}
          {banner.kind === 'sweep' && <div className="banner-sub">{t('game.sweep', { name: nameOf(banner.seat) })}</div>}
          {banner.kind === 'announce' && (
            <div className="announce-card">
              <div className="display gold-text" style={{ fontSize: 20 }}>
                {t('game.announces')}
              </div>
              {banner.entries.map((e) => (
                <div key={e.seat} className={`combo ${banner.winners.includes(e.seat) ? 'win' : ''}`}>
                  <span>{nameOf(e.seat)}</span>
                  <span className="mini-cards">
                    {e.combos.flatMap((c) => c.cards).map((c) => (
                      <PlayingCard key={c} card={c} width={26} shared={false} initial={false} />
                    ))}
                  </span>
                  <span>{e.combos.map((c) => t(`reason.${c.kind}` as TranslationKey)).join(' + ')}</span>
                </div>
              ))}
              <div className="small muted" style={{ marginTop: 8 }}>
                {banner.winners.length > 1 && new Set(banner.winners.map(teamOf)).size > 1
                  ? t('game.announce_split')
                  : t('game.announce_win', { name: nameOf(banner.winners[0]) })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const FLOAT_POS: Record<SeatPos, React.CSSProperties> = {
  bottom: { left: '50%', bottom: 200 },
  top: { left: '50%', top: 130 },
  left: { left: 70, top: '42%' },
  right: { right: 70, top: '42%' },
};

export function Floaters({
  floaters,
  myTeam,
  posOf,
}: {
  floaters: Floater[];
  myTeam: number;
  posOf: (seat: Seat) => SeatPos;
}) {
  const t = useT();
  return (
    <AnimatePresence>
      {floaters.map((f) => {
        const style: React.CSSProperties =
          f.seat === null ? { top: 58, [f.team === myTeam ? 'left' : 'right']: '22%' } : FLOAT_POS[posOf(f.seat)];
        return (
          <motion.div
            key={f.id}
            className={`floater ${f.team === myTeam ? 'us' : 'them'}`}
            style={style}
            initial={{ opacity: 0, y: 20, scale: 0.6 }}
            animate={{ opacity: 1, y: -30, scale: 1 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <span className="float-chip">+{f.points}</span>
            <small>{t(`reason.${f.reason}` as TranslationKey)}</small>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        color: ['#f2c75c', '#c0392b', '#1f8a66', '#2436b8', '#fdf6e3'][i % 5],
        rotate: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="fx-layer" style={{ zIndex: 60 }}>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="confetti"
          style={{ left: `${p.left}%`, background: p.color }}
          initial={{ y: -30, rotate: p.rotate, opacity: 1 }}
          animate={{ y: '110vh', rotate: p.rotate + 540, opacity: [1, 1, 0.8] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

export function RoundSummaryModal({
  d,
  labels,
  onNext,
}: {
  d: GameDisplay;
  labels: [string, string];
  onNext: (() => void) | null;
}) {
  const t = useT();
  const s = d.summary;
  const myTeam = teamOf(d.me);
  const other = 1 - myTeam;
  return (
    <Modal open={!!s && !d.result} title={s ? t('game.round_over', { n: s.round }) : ''}>
      {s && (
        <>
          <table className="summary-table">
            <thead>
              <tr>
                <th />
                <th>{labels[0]}</th>
                <th>{labels[1]}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{t('game.cards')}</td>
                <td>{s.counts[myTeam]}</td>
                <td>{s.counts[other]}</td>
              </tr>
              <tr>
                <td>{t('game.points')}</td>
                <td style={{ color: 'var(--good)' }}>+{s.points[myTeam]}</td>
                <td style={{ color: 'var(--bad)' }}>+{s.points[other]}</td>
              </tr>
              <tr>
                <td>{t('game.total')}</td>
                <td className="big gold-text">{s.scores[myTeam]}</td>
                <td className="big">{s.scores[other]}</td>
              </tr>
            </tbody>
          </table>
          <p className="small muted" style={{ textAlign: 'center', margin: '0 0 12px' }}>
            {t('game.target', { n: d.view.rules.target })}
          </p>
          {onNext ? (
            <button className="btn btn-gold btn-block" onClick={onNext}>
              {t('game.next_round')}
            </button>
          ) : (
            <div className="row" style={{ justifyContent: 'center' }}>
              <span className="muted small">{t('common.loading')}</span>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export function ResultModal({
  d,
  labels,
  onAgain,
  onHome,
}: {
  d: GameDisplay;
  labels: [string, string];
  onAgain: () => void;
  onHome: () => void;
}) {
  const t = useT();
  const r = d.result;
  const myTeam = teamOf(d.me);
  return (
    <>
      {r?.won && <Confetti />}
      <Modal open={!!r}>
        {r && (
          <div className="result-hero">
            <motion.div initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
              <svg viewBox="0 0 120 120" width={96} height={96}>
                <polygon points={starPoints(60, 60, 56, 40)} fill={r.won ? 'url(#g-gold)' : '#5a6b64'} stroke="#7a5310" strokeWidth="2" />
                <polygon points={starPoints(60, 60, 40, 28)} fill={r.won ? '#c0392b' : '#2c3e50'} />
                {r.won ? (
                  <use href="#e-crown" x="34" y="42" width="52" height="36" />
                ) : r.forfeit ? (
                  <path d="M47 38 V84 M47 40 H76 L69 50 L76 60 H47" fill="#fdf6e3" stroke="#fdf6e3" strokeWidth="4" strokeLinejoin="round" />
                ) : (
                  <g transform="rotate(-8 60 60)">
                    <rect x="46" y="38" width="28" height="44" rx="4" fill="#fdf6e3" stroke="#7a5310" strokeWidth="2" />
                    <polygon points={starPoints(60, 60, 9, 6)} fill="#0b5d45" />
                  </g>
                )}
              </svg>
            </motion.div>
            <div className={`result-title ${r.won ? 'gold-text' : ''}`}>
              {r.forfeit ? t('game.forfeit') : r.won ? t('game.victory') : t('game.defeat')}
            </div>
            <div className="row" style={{ gap: 18 }}>
              <div className="col" style={{ alignItems: 'center', gap: 0 }}>
                <span className="small muted">{labels[0]}</span>
                <span className="result-scores gold-text">{r.scores[myTeam]}</span>
              </div>
              <span className="muted">—</span>
              <div className="col" style={{ alignItems: 'center', gap: 0 }}>
                <span className="small muted">{labels[1]}</span>
                <span className="result-scores">{r.scores[1 - myTeam]}</span>
              </div>
            </div>
            {(r.coins !== null || r.xp !== null) && (
              <div className="reward-row">
                {r.coins !== null && r.coins !== 0 && (
                  <span className="reward-pill" style={{ color: r.coins > 0 ? 'var(--good)' : 'var(--bad)' }}>
                    <CoinIcon /> {r.coins > 0 ? '+' : ''}
                    {t('game.coins_won', { n: r.coins })}
                  </span>
                )}
                {r.xp !== null && <span className="reward-pill">⭐ {t('game.xp', { n: r.xp })}</span>}
                {r.levelUp !== null && <span className="reward-pill gold-text">🎉 {t('game.level_up', { n: r.levelUp })}</span>}
              </div>
            )}
            <div className="col" style={{ width: '100%', marginTop: 6 }}>
              <button className="btn btn-gold btn-block btn-lg" onClick={onAgain}>
                {t('game.play_again')}
              </button>
              <button className="btn btn-ghost btn-block" onClick={onHome}>
                {t('game.home')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export function EmotePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('game.emotes')}>
      <div className="emote-grid">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => onPick(e)}>
            {e}
          </button>
        ))}
      </div>
      <div className="phrase-grid">
        {PHRASES.map((p) => (
          <button key={p} onClick={() => onPick(p)}>
            {t(`phrase.${p}` as TranslationKey)}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function LeaveModal({
  open,
  online,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  online: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  return (
    <Modal open={open} onClose={onCancel} title={t('game.leave_title')}>
      <p style={{ textAlign: 'center', marginTop: 0 }} className="muted">
        {online ? t('game.leave_online') : t('game.leave_offline')}
      </p>
      <div className="col">
        <button className="btn btn-red btn-block" onClick={onConfirm}>
          {t('game.leave')}
        </button>
        <button className="btn btn-ghost btn-block" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </Modal>
  );
}

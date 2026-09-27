import { LayoutGroup, motion } from 'motion/react';
import { Lightbulb, LogOut, MessageCircle, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { capturePreview, teamOf, type Card, type Seat } from '@ronda/core';
import { sfx } from '../../audio/audio';
import { FramedAvatar } from '../../components/Avatar';
import { useT, type TranslationKey } from '../../i18n';
import type { GameController } from '../../game/controller';
import { LocalController } from '../../game/local';
import { OnlineController } from '../../game/online';
import { showInterstitialAfterGame } from '../../platform/ads';
import { useNav } from '../../store/nav';
import { useSession } from '../../store/session';
import { useSettings } from '../../store/settings';
import {
  DeckStack,
  entryFrom,
  flyingToTeam,
  PileStack,
  SeatView,
  seatPosition,
  SpeechBubble,
  TableCards,
  TimerRing,
} from './GameParts';
import { TableScene, type TableGeometry } from './Table3D';
import { BannerView, EmotePicker, Floaters, LeaveModal, ResultModal, RoundSummaryModal } from './GameOverlays';
import { PlayingCard } from './PlayingCard';

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return size;
}

/** Zone des cartes posées : le centre du tapis, sans les cartes cachées des places latérales. */
function cardsArea(g: TableGeometry, sides: boolean, topSeat: boolean) {
  const b = g.cardsBox;
  const inset = sides ? 44 : 14;
  // Sous la place du joueur d'en face (avatar puis plaque : ~76 px).
  const top = Math.max(b.y + 30, topSeat ? g.seats.top.y + 78 : 0);
  const bottom = b.y + b.h;
  return { x: b.x + inset, y: top, w: Math.max(80, b.w - inset * 2), h: Math.max(90, bottom - top) };
}

export function GameScreen() {
  const game = useSession((s) => s.game);
  const reset = useNav((s) => s.reset);
  useEffect(() => {
    if (!game) reset();
  }, [game, reset]);
  if (!game) return null;
  return <GameView key={(game as { matchId?: string }).matchId ?? 'local'} game={game} />;
}

function GameView({ game }: { game: GameController }) {
  const d = useSyncExternalStore(game.subscribe, game.getSnapshot);
  const t = useT();
  const nav = useNav();
  const confirmPlay = useSettings((s) => s.confirmPlay);
  const { w, h } = useViewport();
  const [selected, setSelected] = useState<Card | null>(null);
  const [emotes, setEmotes] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const lastTick = useRef(0);

  const v = d.view;
  const players = v.rules.players;
  const me = d.me;
  const myTeam = teamOf(me);
  const posOf = (seat: Seat) => seatPosition(seat, me, players);
  const seatAt = (pos: string) => d.seats.find((s) => posOf(s.seat) === pos);
  // Pendant une animation (prise, darba…), l'état montre encore l'ancien joueur : on attend l'événement « tour ».
  const turnShown = !d.busy || d.lastEvent?.type === 'turn';
  const myTurn = v.phase === 'play' && v.turn === me && !d.result && turnShown;
  const canPlay = myTurn && !d.busy && !d.pendingPlay;
  const dealing = d.lastEvent?.type === 'deal';
  const bubbleOf = (seat: Seat) => d.bubbles.filter((b) => b.seat === seat).at(-1);

  // Tailles de cartes adaptées à l'écran : la main en bas, la table 3D prend tout le reste.
  const contentW = Math.min(w, 560) - 16;
  const handW = Math.max(58, Math.min(86, (contentW - 30) / 4.3, (h - 560) / 1.25 + 60));

  // La sélection disparaît quand la carte n'est plus en main.
  useEffect(() => {
    if (selected !== null && !v.hand.includes(selected)) setSelected(null);
  }, [v.hand, selected]);

  // Tic-tac pendant les 5 dernières secondes de mon tour.
  useEffect(() => {
    if (!myTurn || !d.deadline) return;
    const id = setInterval(() => {
      const left = d.deadline! - Date.now();
      const sec = Math.ceil(left / 1000);
      if (left > 0 && sec <= 5 && sec !== lastTick.current) {
        lastTick.current = sec;
        sfx('tick');
      }
    }, 200);
    return () => clearInterval(id);
  }, [myTurn, d.deadline]);

  const preview = useMemo(
    () => (selected !== null && myTurn ? capturePreview(v, selected) : null),
    [selected, myTurn, v],
  );
  const targets = useMemo(() => new Set(preview?.zid ? [] : (preview?.captures ?? [])), [preview]);

  function play(card: Card) {
    if (game.play(card)) setSelected(null);
  }

  function onCardTap(card: Card) {
    sfx('tap');
    if (!canPlay) {
      setSelected(selected === card ? null : card);
      return;
    }
    if (!confirmPlay || selected === card) play(card);
    else setSelected(card);
  }

  const labels: [string, string] =
    players === 2
      ? [t('common.you'), d.seats[(me + 1) % 2]?.name ?? t('game.them')]
      : [t('game.us'), t('game.them')];

  function goHome() {
    const g = useSession.getState();
    g.setGame(null);
    nav.reset();
    void showInterstitialAfterGame();
  }

  function playAgain() {
    const session = useSession.getState();
    if (game instanceof LocalController) {
      session.setGame(new LocalController(game.setup));
      void showInterstitialAfterGame();
      return;
    }
    session.setGame(null);
    if (d.tableId) {
      nav.reset({ name: 'online' });
      nav.push({ name: 'matchmaking', mode: d.mode, tableId: d.tableId });
    } else {
      nav.reset({ name: 'friends' });
    }
    void showInterstitialAfterGame();
  }

  function confirmLeave() {
    setLeaving(false);
    game.leave();
    if (game instanceof LocalController) {
      useSession.getState().setGame(null);
      nav.reset();
    }
  }

  const topSeat = seatAt('top');
  const leftSeat = seatAt('left');
  const rightSeat = seatAt('right');
  const mySeat = d.seats[me];
  const activeName = d.seats[v.turn]?.name ?? '';
  const pending = v.pending;
  const entry = (card: Card) => {
    if (d.lastPlay?.card === card && d.lastPlay.seat !== me) return entryFrom(posOf(d.lastPlay.seat));
    return false as const;
  };
  const meAuto = mySeat?.auto && d.kind === 'online';
  const n = v.hand.length;

  return (
    // La table garde une géométrie fixe (places, trajectoires des cartes) même en arabe.
    <div className={`game theme-${d.table}`} dir="ltr">
      <LayoutGroup>
        {/* Scores */}
        <div className="hud">
          <button className="icon-btn" aria-label={t('game.leave')} onClick={() => (d.result ? goHome() : setLeaving(true))}>
            <LogOut size={20} />
          </button>
          <div className="scoreboard">
            <div className="team us">
              <span className="team-name">{labels[0]}</span>
              <motion.span key={`s0-${v.scores[myTeam]}`} className="team-score gold-text" initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
                {v.scores[myTeam]}
              </motion.span>
            </div>
            <div className="target">
              {v.rules.target}
              <br />
              pts
            </div>
            <div className="team them">
              <motion.span key={`s1-${v.scores[1 - myTeam]}`} className="team-score" initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
                {v.scores[1 - myTeam]}
              </motion.span>
              <span className="team-name">{labels[1]}</span>
            </div>
          </div>
          <button className="icon-btn" aria-label={t('game.emotes')} onClick={() => setEmotes(true)}>
            <MessageCircle size={20} />
          </button>
        </div>
        <div className="infoline">
          <span>{t('game.round', { n: v.round })}</span>
          <span className="dot">•</span>
          <span>{t('game.deal', { n: Math.max(1, v.dealNo), t: v.dealsPerRound })}</span>
          {d.stake > 0 && (
            <>
              <span className="dot">•</span>
              <span>🪙 {d.stake}</span>
            </>
          )}
        </div>

        {/* Table de poker en 3D : places sur le bourrelet, talon, tas et cartes sur le tapis */}
        <TableScene margins={{ top: 40, bottom: 4, side: players === 4 ? 24 : 6 }}>
          {(g) => {
            const box = cardsArea(g, players === 4, topSeat !== undefined);
            const perRow = box.w > 300 ? 5 : 4;
            const tableW = Math.max(38, Math.min(64, (box.w - (perRow - 1) * 8) / perRow, (box.h - 10) / 2 / 1.5556));
            const stackW = Math.round(Math.max(26, Math.min(36, tableW * 0.62)));
            // Talon et tas dans les coins du tapis, loin des places latérales même sur une table courte.
            const farV = g.length - 0.32;
            const seatProps = (seat: typeof topSeat) =>
              seat && {
                info: seat,
                active: turnShown && v.turn === seat.seat && v.phase === 'play',
                deadline: d.deadline,
                turnMs: d.turnMs,
                count: v.handCounts[seat.seat] ?? 0,
                back: d.cardBack,
                bubble: bubbleOf(seat.seat),
                dealing,
                dealer: v.dealer === seat.seat,
              };
            const place = (p: { x: number; y: number }) => ({ left: p.x, top: p.y });
            const topP = seatProps(topSeat);
            const leftP = seatProps(leftSeat);
            const rightP = seatProps(rightSeat);
            return (
              <>
                <DeckStack
                  count={v.deckCount}
                  back={d.cardBack}
                  label={t('game.deck')}
                  width={stackW}
                  style={place(g.at(-0.26, farV))}
                />
                <PileStack
                  count={v.pileCounts[1 - myTeam]}
                  team={(1 - myTeam) as 0 | 1}
                  cls="them"
                  back={d.cardBack}
                  label={labels[1]}
                  flying={flyingToTeam(d.lastEvent, (1 - myTeam) as 0 | 1)}
                  width={stackW}
                  style={place(g.at(0.26, farV))}
                />
                <PileStack
                  count={v.pileCounts[myTeam]}
                  team={myTeam}
                  cls="us"
                  back={d.cardBack}
                  label={labels[0]}
                  flying={flyingToTeam(d.lastEvent, myTeam)}
                  width={stackW}
                  style={place(g.at(-0.17, 0.27))}
                />
                {pending && (
                  <div className="pending-zone" style={place(g.at(0.17, 0.27))}>
                    <div className="pending-cards">
                      {pending.cards.map((c) => (
                        <PlayingCard
                          key={c}
                          card={c}
                          width={tableW * 0.72}
                          className={`on-felt ${preview?.zid ? 'target' : ''}`}
                          initial={entry(c)}
                        />
                      ))}
                    </div>
                    <span className="pending-tag">
                      {t(`game.darba${pending.level}` as TranslationKey)} · {d.seats[pending.owner]?.name}
                    </span>
                  </div>
                )}
                <TableCards
                  d={d}
                  width={tableW}
                  targets={targets}
                  entry={entry}
                  style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                />
                {topP && <SeatView {...topP} pos="top" style={place(g.seats.top)} />}
                {leftP && <SeatView {...leftP} pos="left" style={place(g.seats.left)} />}
                {rightP && <SeatView {...rightP} pos="right" style={place(g.seats.right)} />}
              </>
            );
          }}
        </TableScene>

        {/* Bas : ma place et ma main */}
        <div className="bottom">
          <div className="my-bar">
            <div className={`seat ${myTurn ? 'active' : ''}`}>
              <div className="seat-avatar">
                {mySeat && <FramedAvatar index={mySeat.avatar} size={44} frame={mySeat.frame} />}
                {myTurn && <TimerRing deadline={d.deadline} total={d.turnMs} size={44} />}
                <SpeechBubble bubble={bubbleOf(me)} pos="bottom" />
              </div>
            </div>
            <div className={`turn-hint ${myTurn ? 'mine' : 'muted'}`}>
              <span>
                {v.phase !== 'play' || !turnShown
                  ? ''
                  : myTurn
                    ? selected !== null && confirmPlay && canPlay
                      ? t('game.tap_again')
                      : t('game.your_turn')
                    : t('game.turn_of', { name: activeName })}
              </span>
            </div>
            {game instanceof LocalController ? (
              <button
                className="icon-btn"
                aria-label={t('game.hint')}
                disabled={!canPlay}
                style={{ opacity: canPlay ? 1 : 0.4 }}
                onClick={() => {
                  const card = game.hint();
                  if (card !== null) {
                    sfx('tap');
                    setSelected(card);
                  }
                }}
              >
                <Lightbulb size={20} />
              </button>
            ) : (
              <div style={{ width: 40 }} />
            )}
          </div>
          <div className="hand" style={{ height: handW * 1.5556 + 24 }}>
            {v.hand.map((c, i) => {
              const mid = (n - 1) / 2;
              const lifted = selected === c || d.pendingPlay === c;
              const chip = selected === c && preview && canPlay;
              return (
                <div key={c} className="slot" style={{ width: handW + 6 }}>
                  {chip && (
                    <div className={`preview-chip ${preview.darba ? 'darba' : ''}`}>
                      {preview.darba
                        ? t(`game.darba${preview.darba}` as TranslationKey)
                        : preview.captures.length
                          ? t('game.takes', { n: preview.captures.length })
                          : t('game.drop')}
                      {preview.missa ? ` + ${t('reason.missa')}` : ''}
                    </div>
                  )}
                  <PlayingCard
                    card={c}
                    width={handW}
                    className={`${lifted ? 'glow' : ''} ${!myTurn ? 'dim' : ''}`}
                    initial={dealing ? { y: -320, opacity: 0, scale: 0.5, rotate: 20 } : false}
                    flipIn={dealing ? 0.3 + i * 0.08 : false}
                    back={d.cardBack}
                    animate={{
                      opacity: d.pendingPlay === c ? 0.7 : 1,
                      x: 0,
                      y: lifted ? -22 : Math.abs(i - mid) * 5,
                      rotate: (i - mid) * 5,
                      scale: 1,
                    }}
                    transition={{ type: 'spring', stiffness: 430, damping: 32, delay: dealing ? 0.15 + i * 0.08 : 0 }}
                    onClick={() => onCardTap(c)}
                    drag={canPlay}
                    onDragUp={() => play(c)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </LayoutGroup>

      {/* Effets */}
      <div className="fx-layer">
        <BannerView banner={d.banner} seats={d.seats} myTeam={myTeam} />
        <Floaters floaters={d.floaters} myTeam={myTeam} posOf={posOf} />
      </div>

      {d.netStatus === 'reconnecting' && d.kind === 'online' && !d.result && (
        <div className="net-banner">
          <WifiOff size={16} /> {t('game.reconnecting')}
        </div>
      )}
      {meAuto && !d.result && game instanceof OnlineController && (
        <div className="auto-banner">
          {t('game.auto')}
          <button className="btn btn-gold btn-sm" onClick={() => game.resumeControl()}>
            {t('game.resume_control')}
          </button>
        </div>
      )}

      <RoundSummaryModal
        d={d}
        labels={labels}
        onNext={game instanceof LocalController ? () => game.continueRound() : null}
      />
      <ResultModal d={d} labels={labels} onAgain={playAgain} onHome={goHome} />
      <EmotePicker
        open={emotes}
        onClose={() => setEmotes(false)}
        onPick={(id) => {
          setEmotes(false);
          sfx('pop');
          game.emote(id);
        }}
      />
      <LeaveModal open={leaving} online={d.kind === 'online'} onCancel={() => setLeaving(false)} onConfirm={confirmLeave} />
    </div>
  );
}

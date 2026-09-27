import { Bot, Copy, Crown, Share2, UserPlus, X } from 'lucide-react';
import { teamOf, type BotLevel, type SeatInfo } from '@ronda/core';
import { FramedAvatar } from '../components/Avatar';
import { QrCode } from '../components/QrCode';
import { TopBar } from '../components/ui';
import { useT } from '../i18n';
import { connection, httpBase } from '../net/connection';
import { useLanBase } from '../net/lan';
import { copyText, openWhatsApp, shareText } from '../platform/native';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { toast } from '../store/toast';

export function inviteLink(code: string, lanBase?: string | null): string {
  const base = lanBase || httpBase() || (typeof location !== 'undefined' ? location.origin : '');
  return base ? `${base}/join/${code}` : '';
}

/** Places autour de la mini-table : partenaires face à face (0 en bas, 1 à droite, 2 en haut, 3 à gauche). */
const SPOTS_4 = ['bottom', 'right', 'top', 'left'] as const;
const SPOTS_2 = ['bottom', 'top'] as const;

export function Room() {
  const t = useT();
  const nav = useNav();
  const room = useSession((s) => s.room);
  const profile = useSession((s) => s.profile);
  const lan = useLanBase();

  // Salon fermé ou partie lancée : la navigation est gérée par la session (room.closed, match.start).
  if (!room || !profile) return null;
  const isHost = room.hostId === profile.id;
  const link = inviteLink(room.code, lan);
  const message = `${t('room.share_text', { code: room.code })}${link ? `\n${link}` : ''}`;
  const spots = room.seats.length === 4 ? SPOTS_4 : SPOTS_2;

  function leave() {
    connection.send({ t: 'room.leave' });
    useSession.setState({ room: null });
    nav.pop();
  }

  function seatAction(s: SeatInfo) {
    if (s.player) return;
    if (s.bot) {
      if (isHost) connection.send({ t: 'room.bot', seat: s.seat, level: null });
      return;
    }
    connection.send({ t: 'room.seat', seat: s.seat });
  }

  function addBot(seat: number, level: BotLevel) {
    connection.send({ t: 'room.bot', seat, level });
  }

  const chainLabel = room.rules.darbaChain ? t('room.chain_on') : t('room.chain_off');

  return (
    <div className="screen">
      <TopBar title={t('room.title')} onBack={leave} />
      <div className="panel-ornate room-code">
        <div className="room-code-main">
          <span className="small muted">{t('room.code')}</span>
          <span className="code gold-text">{room.code}</span>
          <span className="small muted">
            {t('room.rules', { target: room.rules.target, chain: chainLabel })}
            {room.rules.lastCardPoints > 0 ? ` · ${t('room.last_card')}` : ''}
            {room.stake > 0 ? ` · ${t('room.stake', { n: room.stake })}` : ''}
          </span>
        </div>
        {link && (
          <div className="room-qr">
            <QrCode text={link} size={112} />
            <span className="small muted">{t('room.scan')}</span>
          </div>
        )}
        <div className="row room-share">
          <button className="btn btn-wa" style={{ flex: 1 }} onClick={() => openWhatsApp(message)}>
            {t('room.whatsapp')}
          </button>
          <button
            className="btn btn-ghost"
            aria-label={t('common.share')}
            onClick={async () => {
              const r = await shareText(t('room.share_text', { code: room.code }), link || undefined);
              if (r === 'copied') toast(t('common.copied'), 'success');
            }}
          >
            <Share2 size={20} />
          </button>
          <button
            className="btn btn-ghost"
            aria-label={t('common.copy')}
            onClick={async () => {
              if (await copyText(room.code)) toast(t('common.copied'), 'success');
              else toast(room.code, 'success');
            }}
          >
            <Copy size={20} />
          </button>
        </div>
      </div>

      <div className={`mini-table seats-${room.seats.length}`}>
        <div className="mini-rail">
          <div className="mini-felt">
            {room.seats.length === 4 ? (
              <>
                <span className="mini-team team-0">↕ {t('room.team_a')}</span>
                <span className="mini-team team-1">↔ {t('room.team_b')}</span>
              </>
            ) : (
              <span className="mini-team">{t('mode.1v1')}</span>
            )}
          </div>
        </div>
        {room.seats.map((s, i) => (
          <div key={s.seat} className={`room-seat spot-${spots[i]} team-${teamOf(s.seat)}`}>
            {s.player ? (
              <>
                <FramedAvatar index={s.player.avatar} size={54} frame={s.player.frame} />
                <span className="room-seat-name">
                  {s.player.id === room.hostId && <Crown size={13} className="crown" />}
                  {s.player.name}
                </span>
                {!s.connected && <span className="small muted">…</span>}
              </>
            ) : s.bot ? (
              <>
                <div className="seat-empty bot">
                  <Bot size={26} />
                </div>
                <span className="room-seat-name">{t(`bot.${s.bot}`)}</span>
                {isHost && (
                  <button className="mini-btn" onClick={() => seatAction(s)} aria-label={t('room.remove_bot')}>
                    <X size={12} /> {t('room.remove_bot')}
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="seat-empty" onClick={() => seatAction(s)} aria-label={t('room.sit')}>
                  <UserPlus size={22} />
                </button>
                <span className="room-seat-name muted">{t('room.empty')}</span>
                {isHost && (
                  <div className="bot-picks">
                    {(['easy', 'medium', 'hard'] as const).map((lvl) => (
                      <button key={lvl} className="mini-btn" onClick={() => addBot(s.seat, lvl)} aria-label={t(`bot.${lvl}`)}>
                        🤖{lvl === 'easy' ? '1' : lvl === 'medium' ? '2' : '3'}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <p className="small muted" style={{ textAlign: 'center', margin: '4px 0 12px' }}>
        {t('room.bots_fill')}
      </p>
      <div className="spacer" />
      {isHost ? (
        <button className="btn btn-green btn-block btn-lg" onClick={() => connection.send({ t: 'room.start' })}>
          {t('room.start')}
        </button>
      ) : (
        <div className="panel waiting-host">{t('room.waiting_host')}</div>
      )}
      <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={leave}>
        {t('room.leave')}
      </button>
    </div>
  );
}

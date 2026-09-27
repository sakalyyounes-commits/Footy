import { Bot, Copy, Crown, Share2, UserPlus, X } from 'lucide-react';
import { useEffect } from 'react';
import { teamOf, type BotLevel, type SeatInfo } from '@ronda/core';
import { FramedAvatar } from '../components/Avatar';
import { TopBar } from '../components/ui';
import { useT } from '../i18n';
import { connection, httpBase } from '../net/connection';
import { copyText, openWhatsApp, shareText } from '../platform/native';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { toast } from '../store/toast';

export function inviteLink(code: string): string {
  const base = httpBase() || (typeof location !== 'undefined' ? location.origin : '');
  return base ? `${base}/join/${code}` : '';
}

export function Room() {
  const t = useT();
  const nav = useNav();
  const room = useSession((s) => s.room);
  const profile = useSession((s) => s.profile);

  useEffect(() => {
    if (!room) nav.pop();
  }, [room, nav]);

  if (!room || !profile) return null;
  const isHost = room.hostId === profile.id;
  const link = inviteLink(room.code);
  const message = `${t('room.share_text', { code: room.code })}${link ? `\n${link}` : ''}`;

  function leave() {
    connection.send({ t: 'room.leave' });
    useSession.setState({ room: null });
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
        <span className="small muted">{t('room.code')}</span>
        <span className="code gold-text">{room.code}</span>
        <span className="small muted">
          {t('room.rules', { target: room.rules.target, chain: chainLabel })}
          {room.stake > 0 ? ` · ${t('room.stake', { n: room.stake })}` : ''}
        </span>
        <div className="row" style={{ marginTop: 10, width: '100%' }}>
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
            }}
          >
            <Copy size={20} />
          </button>
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-around', margin: '14px 0 6px' }}>
        <span className="small" style={{ color: 'var(--good)', fontWeight: 800 }}>
          {t('room.team_a')}
        </span>
        <span className="small" style={{ color: 'var(--bad)', fontWeight: 800 }}>
          {t('room.team_b')}
        </span>
      </div>
      <div className="room-seats">
        {/* Grille 2 colonnes : places paires (équipe 1) à gauche, impaires (équipe 2) à droite. */}
        {room.seats.map((s) => (
          <div key={s.seat} className={`room-seat team-${teamOf(s.seat)}`}>
            <span className="seat-label">#{s.seat + 1}</span>
            {s.player ? (
              <>
                <FramedAvatar index={s.player.avatar} size={56} frame={s.player.frame} />
                <span style={{ fontWeight: 800 }}>
                  {s.player.id === room.hostId && <Crown size={14} color="var(--gold-2)" style={{ display: 'inline', marginInlineEnd: 4 }} />}
                  {s.player.name}
                </span>
                {!s.connected && <span className="small muted">…</span>}
              </>
            ) : s.bot ? (
              <>
                <div className="mm-empty" style={{ borderStyle: 'solid' }}>
                  <Bot size={26} />
                </div>
                <span style={{ fontWeight: 800 }}>
                  {t('common.bot')} · {t(`bot.${s.bot}`)}
                </span>
                {isHost && (
                  <button className="btn btn-ghost btn-sm" onClick={() => seatAction(s)}>
                    <X size={14} /> {t('room.remove_bot')}
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="mm-empty" onClick={() => seatAction(s)} aria-label={t('room.sit')}>
                  <UserPlus size={22} />
                </button>
                <span className="small muted">{t('room.empty')}</span>
                {isHost && (
                  <div className="row" style={{ gap: 4 }}>
                    {(['easy', 'medium', 'hard'] as const).map((lvl) => (
                      <button key={lvl} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} onClick={() => addBot(s.seat, lvl)}>
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
      <p className="small muted" style={{ textAlign: 'center' }}>
        {t('room.bots_fill')}
      </p>
      <div className="spacer" />
      {isHost ? (
        <button className="btn btn-gold btn-block btn-lg" onClick={() => connection.send({ t: 'room.start' })}>
          {t('room.start')}
        </button>
      ) : (
        <div className="panel" style={{ textAlign: 'center', fontWeight: 800 }}>
          {t('room.waiting_host')}
        </div>
      )}
      <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={leave}>
        {t('room.leave')}
      </button>
    </div>
  );
}

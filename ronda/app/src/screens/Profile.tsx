import { Copy, Gift, KeyRound, Share2 } from 'lucide-react';
import { useState } from 'react';
import { AVATAR_COUNT, levelProgress, REFERRAL_COINS, sanitizeName } from '@ronda/core';
import { FramedAvatar } from '../components/Avatar';
import { TopBar } from '../components/ui';
import { formatNumber, useT } from '../i18n';
import { connection } from '../net/connection';
import { copyText, shareText } from '../platform/native';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { toast } from '../store/toast';

export function ProfileScreen() {
  const t = useT();
  const nav = useNav();
  const lang = useSettings((s) => s.lang);
  const settings = useSettings();
  const profile = useSession((s) => s.profile);
  const status = useSession((s) => s.status);
  const [name, setName] = useState(settings.name || profile?.name || '');
  const [restoreCode, setRestoreCode] = useState('');
  const [referral, setReferral] = useState('');
  const progress = levelProgress(profile?.xp ?? 0);
  const online = status === 'online' && !!profile;

  function save() {
    const clean = sanitizeName(name);
    if (!clean) return toast(t('err.bad_name'), 'error');
    settings.set({ name: clean });
    connection.send({ t: 'profile.update', name: clean, avatar: settings.avatar });
    toast('✓', 'success');
  }

  function pickAvatar(avatar: number) {
    settings.set({ avatar });
    connection.send({ t: 'profile.update', avatar });
  }

  const s = profile?.stats;
  const winrate = s && s.played ? Math.round((s.won / s.played) * 100) : 0;
  const stats: [string, string | number][] = s
    ? [
        [t('stats.played'), s.played],
        [t('stats.won'), s.won],
        [t('stats.winrate'), `${winrate}%`],
        [t('stats.darbas'), s.darbas],
        [t('stats.missas'), s.missas],
        [t('stats.rondas'), s.rondas],
        [t('stats.tringas'), s.tringas],
        [t('stats.best_streak'), s.bestStreak],
        [t('stats.coins_won'), formatNumber(s.coinsWon, lang)],
      ]
    : [];

  return (
    <div className="screen">
      <TopBar title={t('profile.title')} onBack={nav.pop} />
      <div className="col" style={{ alignItems: 'center', gap: 6 }}>
        <FramedAvatar index={settings.avatar} size={96} frame={profile?.equipped.frame ?? 'frame-none'} />
        <div className="row">
          <span className="level-badge">{progress.level}</span>
          <div className="xp-bar" style={{ width: 160 }}>
            <span style={{ width: `${Math.round((progress.current / progress.needed) * 100)}%` }} />
          </div>
          <span className="small muted">
            {progress.current}/{progress.needed} XP
          </span>
        </div>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>{t('profile.name')}</label>
        <div className="row">
          <input className="input" style={{ flex: 1 }} value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-gold" onClick={save}>
            {t('common.save')}
          </button>
        </div>
      </div>

      <h3 className="section-title">{t('profile.avatar')}</h3>
      <div className="avatar-grid">
        {Array.from({ length: AVATAR_COUNT }, (_, i) => (
          <button key={i} aria-pressed={settings.avatar === i} onClick={() => pickAvatar(i)}>
            <FramedAvatar index={i} size={58} />
          </button>
        ))}
      </div>

      <h3 className="section-title">{t('profile.stats')}</h3>
      {online && s ? (
        <div className="stats-grid">
          {stats.map(([label, value]) => (
            <div key={label} className="stat">
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="small muted">{t('profile.offline_note')}</p>
      )}
      <div className="stats-grid" style={{ marginTop: 8 }}>
        <div className="stat">
          <b>{settings.localStats.played}</b>
          <span>
            {t('stats.played')} · {t('home.offline')}
          </span>
        </div>
        <div className="stat">
          <b>{settings.localStats.won}</b>
          <span>
            {t('stats.won')} · {t('home.offline')}
          </span>
        </div>
      </div>

      {online && profile && (
        <>
          <h3 className="section-title">
            <Gift size={16} style={{ display: 'inline', marginInlineEnd: 6 }} />
            {t('profile.referral')}
          </h3>
          <p className="small muted" style={{ marginTop: 0 }}>
            {t('profile.referral_help', { n: REFERRAL_COINS })}
          </p>
          <div className="code-box">
            <span style={{ flex: 1 }}>{profile.referralCode}</span>
            <button
              className="icon-btn"
              onClick={() => shareText(`${t('app.name')} 🃏 ${t('profile.referral')} : ${profile.referralCode}`)}
              aria-label={t('common.share')}
            >
              <Share2 size={18} />
            </button>
          </div>
          {!profile.referredBy && Date.now() - profile.createdAt < 7 * 86_400_000 && (
            <div className="row" style={{ marginTop: 8 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder={t('profile.referral_enter')}
                value={referral}
                maxLength={8}
                onChange={(e) => setReferral(e.target.value.toUpperCase())}
              />
              <button className="btn btn-green" onClick={() => connection.send({ t: 'referral', code: referral })}>
                OK
              </button>
            </div>
          )}

          <h3 className="section-title">
            <KeyRound size={16} style={{ display: 'inline', marginInlineEnd: 6 }} />
            {t('profile.transfer')}
          </h3>
          <p className="small muted" style={{ marginTop: 0 }}>
            {t('profile.transfer_help')}
          </p>
          <div className="code-box">
            <span style={{ flex: 1 }}>{profile.transferCode.replace(/(.{5})/, '$1-')}</span>
            <button
              className="icon-btn"
              onClick={async () => {
                if (await copyText(profile.transferCode)) toast(t('common.copied'), 'success');
              }}
              aria-label={t('common.copy')}
            >
              <Copy size={18} />
            </button>
          </div>
        </>
      )}

      <h3 className="section-title">{t('profile.restore')}</h3>
      <div className="row">
        <input
          className="input"
          style={{ flex: 1, letterSpacing: 2 }}
          placeholder={t('profile.restore_placeholder')}
          value={restoreCode}
          maxLength={12}
          onChange={(e) => setRestoreCode(e.target.value.toUpperCase())}
        />
        <button
          className="btn btn-ghost"
          disabled={restoreCode.replace(/[^A-Z0-9]/g, '').length < 8}
          onClick={() => {
            if (!connection.send({ t: 'account.restore', code: restoreCode })) toast(t('err.offline'), 'error');
          }}
        >
          {t('profile.restore_btn')}
        </button>
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

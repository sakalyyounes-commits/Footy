import { Clapperboard, Gift } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ADS_PER_DAY,
  AD_REWARD,
  DAILY_REWARDS,
  FREE_COINS,
  RESCUE_COINS,
  RESCUE_THRESHOLD,
  VIP_DAILY_COINS,
  type Profile,
} from '@ronda/core';
import { formatCoins, useT } from '../i18n';
import { connection } from '../net/connection';
import { rewardedAvailable, showRewardedAd } from '../platform/ads';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { toast } from '../store/toast';
import { CoinIcon, Modal } from './ui';

function todayKey(): string {
  return new Date(connection.serverNow()).toISOString().slice(0, 10);
}

export function dailyAvailable(p: Profile): boolean {
  return p.daily.lastClaim !== todayKey() || connection.serverNow() >= p.freeCoinsAt;
}

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

/** Bonus quotidien, pièces gratuites toutes les 4 heures, coup de pouce et vidéo récompensée. */
export function DailyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const profile = useSession((s) => s.profile);
  const status = useSession((s) => s.status);
  const [now, setNow] = useState(() => connection.serverNow());
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(connection.serverNow()), 1000);
    return () => clearInterval(id);
  }, [open]);

  const connected = status === 'online' && !!profile;
  const today = todayKey();
  const claimedToday = profile?.daily.lastClaim === today;
  const yesterday = new Date(connection.serverNow() - 86_400_000).toISOString().slice(0, 10);
  const streak = profile ? (profile.daily.lastClaim === yesterday || claimedToday ? profile.daily.streak : 0) : 0;
  const nextDay = claimedToday ? streak : (streak % DAILY_REWARDS.length) + 1;
  const freeReady = !!profile && now >= profile.freeCoinsAt;
  const adsLeft = profile ? (profile.ads.date === today ? ADS_PER_DAY - profile.ads.count : ADS_PER_DAY) : 0;
  const rescue = !!profile && profile.coins < RESCUE_THRESHOLD && profile.rescueDate !== today;

  function claim(kind: 'daily' | 'free' | 'rescue' | 'ad') {
    if (!connection.send({ t: 'claim', kind })) toast(t('err.offline'), 'error');
  }

  async function watchAd() {
    setWatching(true);
    const ok = await showRewardedAd();
    setWatching(false);
    if (ok) claim('ad');
    else toast(t('err.ads_unavailable'), 'error');
  }

  return (
    <Modal open={open} onClose={onClose} title={t('daily.title')}>
      {!connected ? (
        <p className="muted" style={{ textAlign: 'center' }}>
          {t('err.offline')}
        </p>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          <div className="daily-grid">
            {DAILY_REWARDS.map((coins, i) => {
              const day = i + 1;
              const done = claimedToday ? day <= streak : day < nextDay;
              const isToday = !claimedToday && day === nextDay;
              return (
                <div key={day} className={`daily-day ${done ? 'done' : ''} ${isToday ? 'today' : ''} ${day === 7 ? 'big' : ''}`}>
                  <span className="muted">{t('daily.day', { n: day })}</span>
                  {day === 7 ? <Gift size={26} color="var(--gold-2)" /> : <CoinIcon size={22} />}
                  <span>{formatCoins(coins, lang)}</span>
                </div>
              );
            })}
          </div>
          {profile?.vip && <div className="small gold-text" style={{ textAlign: 'center' }}>{t('daily.vip_bonus', { n: VIP_DAILY_COINS })}</div>}
          <button className="btn btn-gold btn-block btn-lg" disabled={claimedToday} onClick={() => claim('daily')}>
            {claimedToday ? t('daily.claimed', { n: (streak % DAILY_REWARDS.length) + 1 }) : t('daily.claim')}
          </button>

          <div className="panel row" style={{ padding: 12 }}>
            <CoinIcon size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>
                {t('daily.free')} · +{FREE_COINS}
              </div>
              {!freeReady && profile && (
                <div className="small muted">{t('daily.free_in', { time: formatDuration(profile.freeCoinsAt - now) })}</div>
              )}
            </div>
            <button className="btn btn-green btn-sm" disabled={!freeReady} onClick={() => claim('free')}>
              {t('daily.claim')}
            </button>
          </div>

          {rewardedAvailable() && (
            <div className="panel row" style={{ padding: 12 }}>
              <Clapperboard size={28} color="var(--gold-2)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{t('shop.watch_ad')}</div>
                <div className="small muted">{t('shop.watch_ad_sub', { n: AD_REWARD, left: adsLeft })}</div>
              </div>
              <button className="btn btn-gold btn-sm" disabled={adsLeft <= 0 || watching} onClick={watchAd}>
                ▶
              </button>
            </div>
          )}

          {rescue && (
            <div className="panel row" style={{ padding: 12 }}>
              <span style={{ fontSize: 26 }}>🤲</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{t('daily.rescue')}</div>
                <div className="small muted">{t('daily.rescue_sub', { n: RESCUE_COINS })}</div>
              </div>
              <button className="btn btn-green btn-sm" onClick={() => claim('rescue')}>
                {t('daily.claim')}
              </button>
            </div>
          )}
        </div>
      )}
      <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={onClose}>
        {t('common.close')}
      </button>
    </Modal>
  );
}

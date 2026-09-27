import { Swords } from 'lucide-react';
import type { BotLevel, Mode } from '@ronda/core';
import { Segmented, Switch, TopBar } from '../components/ui';
import { useT } from '../i18n';
import { LocalController, clearSavedGame } from '../game/local';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

export function OfflineSetup() {
  const t = useT();
  const nav = useNav();
  const setup = useSettings((s) => s.offline);
  const set = useSettings((s) => s.set);
  const update = (patch: Partial<typeof setup>) => set({ offline: { ...setup, ...patch } });

  function start() {
    clearSavedGame();
    useSession.getState().setGame(new LocalController(setup));
    nav.replace({ name: 'game' });
  }

  return (
    <div className="screen">
      <TopBar title={t('offline.title')} onBack={nav.pop} />
      <div className="col" style={{ gap: 18 }}>
        <div className="field">
          <label>{t('offline.mode')}</label>
          <Segmented<Mode>
            value={setup.mode}
            onChange={(mode) => update({ mode, chain: mode === '2v2' })}
            options={[
              { value: '1v1', label: t('mode.1v1') },
              { value: '2v2', label: t('mode.2v2') },
            ]}
          />
          <span className="small muted">{setup.mode === '1v1' ? t('mode.1v1_sub') : t('mode.2v2_sub')}</span>
        </div>
        <div className="field">
          <label>{t('offline.difficulty')}</label>
          <Segmented<BotLevel>
            value={setup.level}
            onChange={(level) => update({ level })}
            options={(['easy', 'medium', 'hard'] as const).map((l) => ({
              value: l,
              label: (
                <span className="col" style={{ gap: 0, lineHeight: 1.1 }}>
                  <span>{t(`bot.${l}`)}</span>
                  <span style={{ fontSize: 11, opacity: 0.75 }}>{t(`bot.${l}_sub`)}</span>
                </span>
              ),
            }))}
          />
        </div>
        <div className="field">
          <label>{t('offline.target')}</label>
          <Segmented<number>
            value={setup.target}
            onChange={(target) => update({ target })}
            options={[21, 31, 41].map((n) => ({ value: n, label: t('friends.points', { n }) }))}
          />
        </div>
        <div className="panel row">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>{t('friends.chain')}</div>
            <div className="small muted">{t('friends.chain_sub')}</div>
          </div>
          <Switch checked={setup.chain} onChange={(chain) => update({ chain })} label={t('friends.chain')} />
        </div>
        <div className="panel row">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>{t('friends.last_card')}</div>
            <div className="small muted">{t('friends.last_card_sub')}</div>
          </div>
          <Switch
            checked={setup.lastCard !== false}
            onChange={(lastCard) => update({ lastCard })}
            label={t('friends.last_card')}
          />
        </div>
        <button className="btn btn-gold btn-block btn-lg" onClick={start}>
          <Swords size={22} /> {t('offline.start')}
        </button>
      </div>
    </div>
  );
}

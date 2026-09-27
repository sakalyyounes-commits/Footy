import { useState } from 'react';
import { audio } from '../audio/audio';
import { Modal, Row, Segmented, Switch, TopBar } from '../components/ui';
import { LANGS, useT, type Lang } from '../i18n';
import { connection, serverUrl } from '../net/connection';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

export function SettingsScreen() {
  const t = useT();
  const nav = useNav();
  const s = useSettings();
  const status = useSession((st) => st.status);
  const [privacy, setPrivacy] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [url, setUrl] = useState(s.serverUrl);
  const [taps, setTaps] = useState(0);

  return (
    <div className="screen">
      <TopBar title={t('settings.title')} onBack={nav.pop} />
      <div className="field">
        <label>{t('settings.language')}</label>
        <Segmented<Lang> value={s.lang} onChange={(lang) => s.set({ lang })} options={LANGS.map((l) => ({ value: l.id, label: l.label }))} />
      </div>
      <div className="panel" style={{ marginTop: 16, padding: '4px 14px' }}>
        <Row>
          <span style={{ flex: 1, fontWeight: 700 }}>{t('settings.sound')}</span>
          <Switch checked={s.sound} onChange={(sound) => s.set({ sound })} label={t('settings.sound')} />
        </Row>
        <Row>
          <span style={{ flex: 1, fontWeight: 700 }}>{t('settings.music')}</span>
          <Switch
            checked={s.music}
            onChange={(music) => {
              s.set({ music });
              audio.syncMusic();
            }}
            label={t('settings.music')}
          />
        </Row>
        <Row>
          <span style={{ flex: 1, fontWeight: 700 }}>{t('settings.vibration')}</span>
          <Switch checked={s.vibration} onChange={(vibration) => s.set({ vibration })} label={t('settings.vibration')} />
        </Row>
        <Row>
          <span style={{ flex: 1 }}>
            <span style={{ fontWeight: 700 }}>{t('settings.confirm_play')}</span>
            <br />
            <span className="small muted">{t('settings.confirm_play_sub')}</span>
          </span>
          <Switch checked={s.confirmPlay} onChange={(confirmPlay) => s.set({ confirmPlay })} label={t('settings.confirm_play')} />
        </Row>
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <label>{t('settings.speed')}</label>
        <Segmented<'normal' | 'fast'>
          value={s.speed}
          onChange={(speed) => s.set({ speed })}
          options={[
            { value: 'normal', label: t('settings.speed_normal') },
            { value: 'fast', label: t('settings.speed_fast') },
          ]}
        />
      </div>
      <div className="panel" style={{ marginTop: 16, padding: '4px 14px' }}>
        <Row onClick={() => nav.push({ name: 'rules' })} chevron>
          <span style={{ flex: 1, fontWeight: 700 }}>{t('settings.rules')}</span>
        </Row>
        <Row onClick={() => setPrivacy(true)} chevron>
          <span style={{ flex: 1, fontWeight: 700 }}>{t('settings.privacy')}</span>
        </Row>
        <Row
          onClick={() => {
            const n = taps + 1;
            setTaps(n);
            if (n >= 5) setAdvanced(true);
          }}
        >
          <span style={{ flex: 1, fontWeight: 700 }}>{t('settings.server')}</span>
          <span className="small" style={{ color: status === 'online' ? 'var(--good)' : 'var(--text-3)' }}>
            ● {status === 'online' ? t('settings.connected') : t('settings.disconnected')}
          </span>
        </Row>
      </div>
      {advanced && (
        <div className="field" style={{ marginTop: 12 }}>
          <label>WebSocket</label>
          <input className="input" value={url} placeholder={serverUrl() || 'wss://…/ws'} onChange={(e) => setUrl(e.target.value)} />
          <button
            className="btn btn-ghost"
            onClick={() => {
              s.set({ serverUrl: url.trim() });
              connection.restart();
            }}
          >
            {t('common.save')}
          </button>
        </div>
      )}
      <p className="small muted" style={{ textAlign: 'center', marginTop: 20 }}>
        {t('app.name')} · {t('settings.version', { v: __APP_VERSION__ })}
      </p>
      <Modal open={privacy} onClose={() => setPrivacy(false)} title={t('settings.privacy')}>
        <p style={{ lineHeight: 1.6 }}>{t('settings.privacy_text')}</p>
        <button className="btn btn-gold btn-block" onClick={() => setPrivacy(false)}>
          {t('common.ok')}
        </button>
      </Modal>
    </div>
  );
}

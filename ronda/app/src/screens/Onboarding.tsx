import { useState } from 'react';
import { AVATAR_COUNT, sanitizeName } from '@ronda/core';
import { audio } from '../audio/audio';
import { FramedAvatar } from '../components/Avatar';
import { Logo, Segmented } from '../components/ui';
import { LANGS, useT, type Lang } from '../i18n';
import { connection } from '../net/connection';
import { useNav } from '../store/nav';
import { useSettings } from '../store/settings';
import { toast } from '../store/toast';

export function Onboarding() {
  const t = useT();
  const nav = useNav();
  const s = useSettings();
  const [name, setName] = useState(s.name);

  function start() {
    const clean = sanitizeName(name);
    if (!clean) return toast(t('err.bad_name'), 'error');
    audio.unlock();
    s.set({ name: clean, onboarded: true });
    connection.send({ t: 'profile.update', name: clean, avatar: s.avatar });
    // Arrivé par un lien d'invitation : on garde l'écran « amis » avec le code de la table.
    const top = nav.stack[nav.stack.length - 1];
    if (top.name !== 'friends') nav.reset();
  }

  return (
    <div className="screen">
      <div className="onboarding">
        <Logo compact />
        <Segmented<Lang> value={s.lang} onChange={(lang) => s.set({ lang })} options={LANGS.map((l) => ({ value: l.id, label: l.label }))} />
        <div style={{ textAlign: 'center' }}>
          <h1 className="title gold-text">{t('onb.welcome')}</h1>
          <p className="subtitle">{t('onb.subtitle')}</p>
        </div>
        <input
          className="input"
          style={{ textAlign: 'center', fontWeight: 800 }}
          placeholder={t('onb.name_placeholder')}
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start()}
        />
        <div className="avatar-grid">
          {Array.from({ length: AVATAR_COUNT }, (_, i) => (
            <button key={i} aria-pressed={s.avatar === i} onClick={() => s.set({ avatar: i })}>
              <FramedAvatar index={i} size={58} />
            </button>
          ))}
        </div>
        <button className="btn btn-gold btn-block btn-lg" disabled={name.trim().length < 2} onClick={start}>
          {t('onb.start')}
        </button>
      </div>
    </div>
  );
}

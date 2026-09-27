import { LogIn, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Mode } from '@ronda/core';
import { Segmented, Switch, TopBar } from '../components/ui';
import { useT } from '../i18n';
import { connection } from '../net/connection';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { toast } from '../store/toast';

const STAKES = [0, 500, 2_500, 10_000];

export function Friends({ join }: { join?: string }) {
  const t = useT();
  const nav = useNav();
  const status = useSession((s) => s.status);
  const [mode, setMode] = useState<Mode>('2v2');
  const [target, setTarget] = useState(41);
  const [chain, setChain] = useState(true);
  const [stake, setStake] = useState(0);
  const [code, setCode] = useState(join ?? '');

  const online = status === 'online';

  // Lien d'invitation ouvert : on rejoint dès que la connexion est prête.
  useEffect(() => {
    if (join && online) connection.send({ t: 'room.join', code: join });
  }, [join, online]);

  function create() {
    if (!connection.send({ t: 'room.create', mode, rules: { target, darbaChain: chain }, stake })) toast(t('err.offline'), 'error');
  }

  function joinRoom() {
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) return toast(t('err.bad_code'), 'error');
    if (!connection.send({ t: 'room.join', code: clean })) toast(t('err.offline'), 'error');
  }

  return (
    <div className="screen">
      <TopBar title={t('friends.title')} onBack={nav.pop} />
      {!online && (
        <div className="panel small" style={{ marginBottom: 12, borderColor: 'rgba(255,107,91,.5)' }}>
          {status === 'connecting' ? t('common.connecting') : t('common.server_down')}
        </div>
      )}

      <div className="panel-ornate col" style={{ gap: 14 }}>
        <div className="row">
          <PlusCircle color="var(--gold-2)" />
          <div>
            <div className="display" style={{ fontSize: 20 }}>
              {t('friends.create')}
            </div>
            <div className="small muted">{t('friends.create_sub')}</div>
          </div>
        </div>
        <Segmented<Mode>
          value={mode}
          onChange={(m) => {
            setMode(m);
            setChain(m === '2v2');
          }}
          options={[
            { value: '1v1', label: t('mode.1v1') },
            { value: '2v2', label: t('mode.2v2') },
          ]}
        />
        <div className="field">
          <label>{t('friends.target')}</label>
          <Segmented<number> value={target} onChange={setTarget} options={[21, 31, 41, 61].map((n) => ({ value: n, label: String(n) }))} />
        </div>
        <div className="field">
          <label>{t('friends.stake')}</label>
          <Segmented<number>
            value={stake}
            onChange={setStake}
            options={STAKES.map((s) => ({ value: s, label: s === 0 ? t('friends.no_stake') : `🪙 ${s >= 1000 ? `${s / 1000}k` : s}` }))}
          />
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>{t('friends.chain')}</div>
            <div className="small muted">{t('friends.chain_sub')}</div>
          </div>
          <Switch checked={chain} onChange={setChain} label={t('friends.chain')} />
        </div>
        <button className="btn btn-gold btn-block btn-lg" disabled={!online} onClick={create}>
          {t('friends.create_btn')}
        </button>
      </div>

      <div className="panel col" style={{ gap: 12, marginTop: 16 }}>
        <div className="row">
          <LogIn color="var(--gold-2)" />
          <div>
            <div className="display" style={{ fontSize: 20 }}>
              {t('friends.join')}
            </div>
            <div className="small muted">{t('friends.join_sub')}</div>
          </div>
        </div>
        <input
          className="input code-input"
          value={code}
          maxLength={6}
          placeholder="•••••"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          aria-label={t('friends.code')}
        />
        <button className="btn btn-green btn-block btn-lg" disabled={!online || code.length < 4} onClick={joinRoom}>
          {t('friends.join_btn')}
        </button>
      </div>
    </div>
  );
}

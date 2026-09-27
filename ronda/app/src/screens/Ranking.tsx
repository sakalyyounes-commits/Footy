import { Bot } from 'lucide-react';
import { useEffect } from 'react';
import { FramedAvatar } from '../components/Avatar';
import { TopBar } from '../components/ui';
import { formatNumber, useT } from '../i18n';
import { connection } from '../net/connection';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Ranking() {
  const t = useT();
  const nav = useNav();
  const lang = useSettings((s) => s.lang);
  const status = useSession((s) => s.status);
  const entries = useSession((s) => s.leaderboard);
  const me = useSession((s) => s.profile?.id);

  useEffect(() => {
    if (status === 'online') connection.send({ t: 'leaderboard' });
  }, [status]);

  return (
    <div className="screen">
      <TopBar title={t('ranking.title')} onBack={nav.pop} />
      {status !== 'online' && <p className="muted">{t('err.offline')}</p>}
      {entries && entries.length === 0 && (
        <div className="panel col" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Bot size={32} color="var(--gold-2)" />
          <p className="muted">{t('ranking.empty')}</p>
        </div>
      )}
      <div className="panel" style={{ padding: '4px 10px' }}>
        {entries?.map((e) => (
          <div key={e.player.id} className="rank-row" style={e.player.id === me ? { background: 'rgba(242,199,92,.12)', borderRadius: 12 } : undefined}>
            <span className="rank-num">{MEDALS[e.rank - 1] ?? e.rank}</span>
            <FramedAvatar index={e.player.avatar} size={40} frame={e.player.frame} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.player.name}</div>
              <div className="small muted">{t('ranking.wins', { n: formatNumber(e.won, lang) })}</div>
            </div>
            <span className="level-badge">{e.player.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { audio } from './audio/audio';
import { CardDefs } from './cards/CardDefs';
import { Toasts } from './components/ui';
import { isRtl } from './i18n';
import { connection } from './net/connection';
import { initAds } from './platform/ads';
import { exitApp, initNative, isNative, onAppState, onBackButton, onDeepLink } from './platform/native';
import { Friends } from './screens/Friends';
import { GameScreen } from './screens/game/GameScreen';
import { Home } from './screens/Home';
import { Matchmaking } from './screens/Matchmaking';
import { OfflineSetup } from './screens/OfflineSetup';
import { Onboarding } from './screens/Onboarding';
import { OnlineLobby } from './screens/OnlineLobby';
import { ProfileScreen } from './screens/Profile';
import { Ranking } from './screens/Ranking';
import { Room } from './screens/Room';
import { Rules } from './screens/Rules';
import { SettingsScreen } from './screens/Settings';
import { Shop } from './screens/Shop';
import { currentScreen, useNav, type Screen } from './store/nav';
import { initSession, useSession } from './store/session';
import { useSettings } from './store/settings';

function renderScreen(s: Screen) {
  switch (s.name) {
    case 'home':
      return <Home />;
    case 'onboarding':
      return <Onboarding />;
    case 'online':
      return <OnlineLobby />;
    case 'matchmaking':
      return <Matchmaking mode={s.mode} tableId={s.tableId} />;
    case 'friends':
      return <Friends join={s.join} />;
    case 'room':
      return <Room />;
    case 'offline':
      return <OfflineSetup />;
    case 'game':
      return <GameScreen />;
    case 'profile':
      return <ProfileScreen />;
    case 'shop':
      return <Shop tab={s.tab} />;
    case 'settings':
      return <SettingsScreen />;
    case 'rules':
      return <Rules />;
    case 'ranking':
      return <Ranking />;
  }
}

export function App() {
  const stack = useNav((s) => s.stack);
  const lang = useSettings((s) => s.lang);
  const onboarded = useSettings((s) => s.onboarded);
  const screen = stack[stack.length - 1];
  const shown: Screen = onboarded ? screen : { name: 'onboarding' };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    initSession();
    void initNative();
    if (isNative) void initAds();
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: false, passive: true });
    const offState = onAppState((active) => {
      if (active) {
        audio.resume();
        connection.wake();
        const game = useSession.getState().game as { matchId?: string } | null;
        if (game?.matchId) connection.send({ t: 'match.resume' });
      } else {
        audio.suspend();
      }
    });
    const offBack = onBackButton(() => {
      const nav = useNav.getState();
      const top = currentScreen();
      if (top.name === 'game') return; // quitter une partie passe par le bouton dédié
      if (top.name === 'matchmaking') connection.send({ t: 'queue.leave' });
      if (top.name === 'room') {
        connection.send({ t: 'room.leave' });
        useSession.setState({ room: null });
      }
      if (nav.stack.length > 1) nav.pop();
      else exitApp();
    });
    const offLink = onDeepLink((code) => {
      useNav.getState().reset({ name: 'friends', join: code });
    });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      offState();
      offBack();
      offLink();
    };
  }, []);

  // L'écran de bienvenue ne doit pas se rejouer si la navigation change en dessous (lien d'invitation).
  const key = onboarded ? `${stack.length}-${shown.name}` : 'onboarding';
  const isGame = shown.name === 'game';
  return (
    <div className="app">
      <CardDefs />
      <div className="frame">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={key}
            style={{ position: 'absolute', inset: 0 }}
            initial={isGame ? { opacity: 0 } : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {renderScreen(shown)}
          </motion.div>
        </AnimatePresence>
      </div>
      <Toasts />
    </div>
  );
}

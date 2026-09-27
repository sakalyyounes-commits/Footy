import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/cairo/wght.css';
import '@fontsource-variable/el-messiri/wght.css';
import '@fontsource/aref-ruqaa/arabic-700.css';
import '@fontsource/lilita-one/400.css';
import './styles/global.css';
import './styles/screens.css';
import './styles/game.css';
import { App } from './App';
import { isNative } from './platform/native';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Version web : mise en cache hors ligne et installation sur l'écran d'accueil.
if (!isNative && import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

import { useEffect } from 'react';
import { useStore } from '../store/store';
import type { ThemePref } from '../store/types';

const THEME_COLORS = { light: '#f5f5f2', dark: '#0d0e10' };

function resolve(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return pref;
}

function apply(pref: ThemePref) {
  const theme = resolve(pref);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

/** Applique le thème choisi et suit le réglage du système en mode « Automatique ». */
export function useThemeSync() {
  const pref = useStore((s) => s.settings.theme);
  useEffect(() => {
    apply(pref);
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);
}

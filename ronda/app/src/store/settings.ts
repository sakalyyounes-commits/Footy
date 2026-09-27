import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BotLevel, Mode } from '@ronda/core';
import { detectLang, type Lang } from '../i18n';

export interface OfflineSetup {
  mode: Mode;
  level: BotLevel;
  target: number;
  chain: boolean;
  /** Règle de la dernière carte du donneur (absente des réglages enregistrés avant elle : activée). */
  lastCard?: boolean;
}

export interface LocalStats {
  played: number;
  won: number;
}

export interface SettingsState {
  lang: Lang;
  sound: boolean;
  music: boolean;
  vibration: boolean;
  confirmPlay: boolean;
  speed: 'normal' | 'fast';
  name: string;
  avatar: number;
  onboarded: boolean;
  /** Adresse du serveur imposée à la main (vide : adresse par défaut). */
  serverUrl: string;
  offline: OfflineSetup;
  localStats: LocalStats;
  /** Apparence utilisée hors ligne quand le profil en ligne n'est pas connu. */
  cardBack: string;
  table: string;
  gamesSinceInterstitial: number;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: detectLang(),
      sound: true,
      music: true,
      vibration: true,
      confirmPlay: false,
      speed: 'normal',
      name: '',
      avatar: Math.floor(Math.random() * 16),
      onboarded: false,
      serverUrl: '',
      offline: { mode: '2v2', level: 'medium', target: 41, chain: true, lastCard: true },
      localStats: { played: 0, won: 0 },
      cardBack: 'back-zellige',
      table: 'table-riad',
      gamesSinceInterstitial: 0,
      set: (patch) => set(patch),
    }),
    {
      name: 'ronda:settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
);

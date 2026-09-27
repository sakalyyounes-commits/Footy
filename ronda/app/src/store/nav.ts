import { create } from 'zustand';
import type { Mode } from '@ronda/core';

export type Screen =
  | { name: 'home' }
  | { name: 'onboarding' }
  | { name: 'online' }
  | { name: 'matchmaking'; mode: Mode; tableId: string }
  | { name: 'friends'; join?: string }
  | { name: 'room' }
  | { name: 'offline' }
  | { name: 'game' }
  | { name: 'profile' }
  | { name: 'shop'; tab?: 'coins' | 'cardBack' | 'table' | 'frame' }
  | { name: 'settings' }
  | { name: 'rules' }
  | { name: 'ranking' };

interface NavState {
  stack: Screen[];
  push: (s: Screen) => void;
  pop: () => void;
  replace: (s: Screen) => void;
  reset: (s?: Screen) => void;
}

export const useNav = create<NavState>((set) => ({
  stack: [{ name: 'home' }],
  push: (s) => set((st) => ({ stack: [...st.stack, s] })),
  // Rien à dépiler : on renvoie le même état pour ne réveiller aucun abonné.
  pop: () => set((st) => (st.stack.length > 1 ? { stack: st.stack.slice(0, -1) } : st)),
  replace: (s) => set((st) => ({ stack: [...st.stack.slice(0, -1), s] })),
  reset: (s = { name: 'home' }) => set({ stack: s.name === 'home' ? [s] : [{ name: 'home' }, s] }),
}));

export function currentScreen(): Screen {
  const { stack } = useNav.getState();
  return stack[stack.length - 1];
}

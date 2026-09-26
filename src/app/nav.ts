import {
  BedDouble,
  Droplets,
  Dumbbell,
  HeartPulse,
  House,
  LayoutGrid,
  ListChecks,
  MoonStar,
  NotebookPen,
  Scale,
  Settings,
  SquareCheck,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Accent } from '../components/ui/Card';

export interface ModuleDef {
  to: string;
  label: string;
  icon: LucideIcon;
  accent: Accent;
}

export const MODULES = {
  today: { to: '/', label: 'Aujourd’hui', icon: House, accent: 'brand' },
  deen: { to: '/din', label: 'Dîn & prières', icon: MoonStar, accent: 'deen' },
  health: { to: '/sante', label: 'Santé', icon: HeartPulse, accent: 'sport' },
  water: { to: '/hydratation', label: 'Hydratation', icon: Droplets, accent: 'water' },
  nutrition: { to: '/nutrition', label: 'Nutrition', icon: Utensils, accent: 'nutrition' },
  sport: { to: '/sport', label: 'Sport', icon: Dumbbell, accent: 'sport' },
  sleep: { to: '/sommeil', label: 'Sommeil', icon: BedDouble, accent: 'sleep' },
  body: { to: '/corps', label: 'Poids & corps', icon: Scale, accent: 'body' },
  finance: { to: '/finances', label: 'Finances', icon: Wallet, accent: 'finance' },
  habits: { to: '/habitudes', label: 'Habitudes', icon: ListChecks, accent: 'habits' },
  journal: { to: '/journal', label: 'Journal & humeur', icon: NotebookPen, accent: 'journal' },
  tasks: { to: '/taches', label: 'Tâches & objectifs', icon: SquareCheck, accent: 'tasks' },
  settings: { to: '/reglages', label: 'Réglages', icon: Settings, accent: 'tasks' },
  more: { to: '/plus', label: 'Plus', icon: LayoutGrid, accent: 'brand' },
} satisfies Record<string, ModuleDef>;

export const HEALTH_MODULES = [MODULES.water, MODULES.nutrition, MODULES.sport, MODULES.sleep, MODULES.body];
export const LIFE_MODULES = [MODULES.habits, MODULES.journal, MODULES.tasks];

/** Barre de navigation mobile : 5 entrées, chacune active sur un groupe de pages. */
export const BOTTOM_NAV: Array<{ module: ModuleDef; label: string; match: string[] }> = [
  { module: MODULES.today, label: 'Aujourd’hui', match: ['/'] },
  { module: MODULES.deen, label: 'Dîn', match: ['/din'] },
  { module: MODULES.health, label: 'Santé', match: ['/sante', ...HEALTH_MODULES.map((m) => m.to)] },
  { module: MODULES.finance, label: 'Finances', match: ['/finances'] },
  { module: MODULES.more, label: 'Plus', match: ['/plus', '/reglages', ...LIFE_MODULES.map((m) => m.to)] },
];

export const SIDEBAR: Array<{ title?: string; items: ModuleDef[] }> = [
  { items: [MODULES.today, MODULES.deen] },
  { title: 'Santé', items: HEALTH_MODULES },
  { title: 'Argent', items: [MODULES.finance] },
  { title: 'Vie perso', items: LIFE_MODULES },
];

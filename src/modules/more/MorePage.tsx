import { ChevronRight, Compass, Download, HandCoins, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { MODULES, type ModuleDef } from '../../app/nav';
import { PageHeader } from '../../components/ui/layout';
import { useToday } from '../../lib/hooks';
import { hasUserData } from '../../store/backup';
import { useStore } from '../../store/store';
import { isScheduled } from '../habits/HabitsPage';
import { MOODS } from '../journal/JournalPage';

function Tile({ module: m, meta }: { module: ModuleDef; meta: ReactNode }) {
  return (
    <Link to={m.to} className={`module-tile accent-${m.accent}`}>
      <span className="icon-chip lg">
        <m.icon size={22} />
      </span>
      <span className="tile-name">{m.label}</span>
      <span className="tile-meta">{meta}</span>
    </Link>
  );
}

export function BackupReminder() {
  const last = useStore((s) => s.meta.lastBackupAt);
  const hasData = useStore(hasUserData);
  const stale = !last || Date.now() - last > 30 * 86_400_000;
  if (!stale || !hasData) return null;
  return (
    <Link to="/reglages" className="banner accent-finance">
      <Download size={18} className="banner-icon" />
      <span className="grow small">
        <strong>Pensez à sauvegarder vos données.</strong> {last ? 'Dernière sauvegarde il y a plus d’un mois.' : 'Aucune sauvegarde pour l’instant.'}
      </span>
      <ChevronRight size={18} className="subtle" />
    </Link>
  );
}

export function MorePage() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const habitLogs = useStore((s) => s.habitLogs);
  const journal = useStore((s) => s.journal[today]);
  const tasks = useStore((s) => s.tasks);

  const todays = habits.filter((h) => !h.archived && isScheduled(h, today));
  const doneHabits = todays.filter((h) => (habitLogs[h.id]?.[today] ?? 0) >= h.target).length;
  const openTasks = tasks.filter((t) => !t.done).length;
  const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

  return (
    <div className="stack-lg">
      <PageHeader title="Plus" subtitle="Vie perso, outils et réglages" />
      <BackupReminder />
      <div className="module-tiles">
        <Tile module={MODULES.habits} meta={todays.length ? `${doneHabits} / ${todays.length} aujourd’hui` : 'Créer une habitude'} />
        <Tile module={MODULES.journal} meta={journal?.mood ? `Humeur : ${MOODS[journal.mood - 1].emoji} ${MOODS[journal.mood - 1].label}` : 'Écrire la page du jour'} />
        <Tile module={MODULES.tasks} meta={openTasks ? `${openTasks} tâche${openTasks > 1 ? 's' : ''} en cours` : 'Tout est fait ✓'} />
        <Tile module={MODULES.settings} meta="Profil, prières, sauvegarde" />
      </div>

      <div className="section-title">Raccourcis</div>
      <div className="module-tiles">
        <Link to="/din?onglet=dhikr" className="module-tile accent-deen">
          <span className="icon-chip lg" aria-hidden>
            📿
          </span>
          <span className="tile-name">Tasbih</span>
          <span className="tile-meta">Compteur de dhikr</span>
        </Link>
        <Link to="/din?onglet=outils" className="module-tile accent-deen">
          <span className="icon-chip lg">
            <Compass size={22} />
          </span>
          <span className="tile-name">Qibla</span>
          <span className="tile-meta">Boussole</span>
        </Link>
        <Link to="/din?onglet=outils" className="module-tile accent-finance">
          <span className="icon-chip lg">
            <HandCoins size={22} />
          </span>
          <span className="tile-name">Zakat</span>
          <span className="tile-meta">Calculateur</span>
        </Link>
      </div>

      {!isStandalone && (
        <div className="banner">
          <Smartphone size={18} className="banner-icon" />
          <p className="small">
            <strong>Installez Hayati sur votre téléphone</strong> pour l’ouvrir comme une vraie application, même hors connexion : iPhone → Safari → Partager →
            « Sur l’écran d’accueil » · Android → Chrome → ⋮ → « Installer l’application ».
          </p>
        </div>
      )}
    </div>
  );
}

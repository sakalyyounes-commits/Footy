import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { toast } from '../components/ui/toast';
import { BodyPage } from '../modules/body/BodyPage';
import { DeenPage } from '../modules/deen/DeenPage';
import { FinancePage } from '../modules/finance/FinancePage';
import { HabitsPage } from '../modules/habits/HabitsPage';
import { HealthPage } from '../modules/health/HealthPage';
import { JournalPage } from '../modules/journal/JournalPage';
import { MorePage } from '../modules/more/MorePage';
import { NutritionPage } from '../modules/nutrition/NutritionPage';
import { Onboarding } from '../modules/onboarding/Onboarding';
import { SettingsPage } from '../modules/settings/SettingsPage';
import { SleepPage } from '../modules/sleep/SleepPage';
import { SportPage } from '../modules/sport/SportPage';
import { TasksPage } from '../modules/tasks/TasksPage';
import { TodayPage } from '../modules/today/TodayPage';
import { WaterPage } from '../modules/water/WaterPage';
import { onStorageError, useStore } from '../store/store';
import { Layout } from './Layout';
import { useThemeSync } from './theme';

export function App() {
  useThemeSync();
  const onboarded = useStore((s) => s.meta.onboarded);

  useEffect(
    () =>
      onStorageError(() =>
        toast('Espace de stockage plein : exportez une sauvegarde depuis les Réglages.', { tone: 'error', duration: 8000 }),
      ),
    [],
  );

  return (
    <HashRouter>
      {onboarded ? (
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TodayPage />} />
            <Route path="din" element={<DeenPage />} />
            <Route path="sante" element={<HealthPage />} />
            <Route path="hydratation" element={<WaterPage />} />
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="sport" element={<SportPage />} />
            <Route path="sommeil" element={<SleepPage />} />
            <Route path="corps" element={<BodyPage />} />
            <Route path="finances" element={<FinancePage />} />
            <Route path="habitudes" element={<HabitsPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="taches" element={<TasksPage />} />
            <Route path="reglages" element={<SettingsPage />} />
            <Route path="plus" element={<MorePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        <Onboarding />
      )}
    </HashRouter>
  );
}

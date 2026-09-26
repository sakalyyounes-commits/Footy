import { useEffect, useState } from 'react';
import { todayISO } from './dates';

/** Heure courante, rafraîchie à intervalle régulier et au retour sur l'application. */
export function useNow(intervalMs = 20_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

/** Date du jour (AAAA-MM-JJ), mise à jour après minuit. */
export function useToday(): string {
  const now = useNow(60_000);
  return todayISO(now);
}

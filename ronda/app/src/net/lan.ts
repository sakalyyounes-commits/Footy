import { useEffect, useState } from 'react';
import { httpBase } from './connection';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
let cached: string | null | undefined;

/**
 * Soirée entre amis : l'ordinateur qui fait tourner le jeu l'ouvre souvent en « localhost », une
 * adresse que les téléphones des amis ne connaissent pas. Le serveur local donne alors son adresse
 * sur le Wi-Fi, utilisée pour les liens d'invitation et le QR code de la table.
 */
export function useLanBase(): string | null {
  const [base, setBase] = useState<string | null>(cached ?? null);
  useEffect(() => {
    if (cached !== undefined) return;
    if (typeof location === 'undefined' || !LOCAL_HOSTS.has(location.hostname)) {
      cached = null;
      return;
    }
    let alive = true;
    fetch(`${httpBase() || location.origin}/api/status`)
      .then((r) => r.json() as Promise<{ lan?: string[] }>)
      .then((s) => {
        cached = s.lan?.[0] ?? null;
        if (alive) setBase(cached);
      })
      .catch(() => {
        cached = null;
      });
    return () => {
      alive = false;
    };
  }, []);
  return base;
}

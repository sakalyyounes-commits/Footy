import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useSettings } from '../store/settings';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform() as 'web' | 'android' | 'ios';

export async function initNative(): Promise<void> {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform === 'android') await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* barre d'état non disponible */
  }
}

type Impact = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

/** Petite vibration (jamais bloquante, ignorée si désactivée dans les réglages). */
export function vibrate(kind: Impact = 'light'): void {
  if (!useSettings.getState().vibration) return;
  if (!isNative) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(kind === 'heavy' ? 40 : kind === 'medium' ? 22 : 12);
    }
    return;
  }
  const run =
    kind === 'success'
      ? Haptics.notification({ type: NotificationType.Success })
      : kind === 'warning'
        ? Haptics.notification({ type: NotificationType.Warning })
        : Haptics.impact({ style: kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
  run.catch(() => undefined);
}

/** Partage natif (feuille de partage), sinon Web Share, sinon copie dans le presse-papiers. */
export async function shareText(text: string, url?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (isNative) {
      await Share.share({ text, url, dialogTitle: 'Ronda Dyalna' });
      return 'shared';
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text, url });
      return 'shared';
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'failed';
  }
  return (await copyText(url ? `${text} ${url}` : text)) ? 'copied' : 'failed';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Ouvre WhatsApp avec un message prêt à envoyer. */
export function openWhatsApp(text: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/** Bouton retour d'Android. Renvoie une fonction de désinscription. */
export function onBackButton(handler: () => void): () => void {
  if (!isNative) return () => undefined;
  const sub = App.addListener('backButton', handler);
  return () => {
    void sub.then((s) => s.remove());
  };
}

export function exitApp(): void {
  if (isNative) void App.exitApp();
}

/** Passage en arrière-plan / retour au premier plan. */
export function onAppState(handler: (active: boolean) => void): () => void {
  const onVisibility = () => handler(document.visibilityState === 'visible');
  document.addEventListener('visibilitychange', onVisibility);
  const sub = isNative ? App.addListener('appStateChange', (s) => handler(s.isActive)) : null;
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    void sub?.then((s) => s.remove());
  };
}

/** Code de table contenu dans un lien d'invitation (rondadyalna://join/ABCDE ou https://…/join/ABCDE). */
export function joinCodeFromUrl(url: string): string | null {
  const m = /\/join\/([A-Za-z0-9]{4,8})/.exec(url) ?? /[?&]join=([A-Za-z0-9]{4,8})/.exec(url);
  return m ? m[1].toUpperCase() : null;
}

/** Liens profonds : appelle `handler` avec le code de table reçu. */
export function onDeepLink(handler: (code: string) => void): () => void {
  const initial = joinCodeFromUrl(window.location.href);
  if (initial) setTimeout(() => handler(initial), 0);
  if (!isNative) return () => undefined;
  const sub = App.addListener('appUrlOpen', (e) => {
    const code = joinCodeFromUrl(e.url);
    if (code) handler(code);
  });
  void App.getLaunchUrl().then((launch) => {
    const code = launch?.url ? joinCodeFromUrl(launch.url) : null;
    if (code) handler(code);
  });
  return () => {
    void sub.then((s) => s.remove());
  };
}

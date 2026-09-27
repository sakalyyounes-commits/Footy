import { isNative, platform } from './native';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

/**
 * Publicités Google AdMob (applications Android et iOS uniquement).
 * - Vidéo récompensée : le joueur choisit de la regarder pour gagner des pièces.
 * - Interstitielle : au plus une fois toutes les deux parties, jamais pendant le jeu,
 *   et jamais pour les joueurs VIP ou ayant acheté « Sans publicité ».
 * Sans identifiants configurés, les blocs de TEST officiels de Google sont utilisés.
 */
const TEST_UNITS = {
  android: { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
  ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
};

function units() {
  const env = import.meta.env;
  const ios = platform === 'ios';
  const rewarded = (ios ? env.VITE_ADMOB_IOS_REWARDED : env.VITE_ADMOB_ANDROID_REWARDED) as string | undefined;
  const interstitial = (ios ? env.VITE_ADMOB_IOS_INTERSTITIAL : env.VITE_ADMOB_ANDROID_INTERSTITIAL) as string | undefined;
  const test = TEST_UNITS[ios ? 'ios' : 'android'];
  return {
    rewarded: rewarded || test.rewarded,
    interstitial: interstitial || test.interstitial,
    testing: !rewarded,
  };
}

let ready: Promise<boolean> | null = null;

/** Initialise AdMob et affiche le formulaire de consentement RGPD si nécessaire. */
export function initAds(): Promise<boolean> {
  if (!isNative) return Promise.resolve(false);
  ready ??= (async () => {
    try {
      const { AdMob, AdmobConsentStatus } = await import('@capacitor-community/admob');
      await AdMob.initialize({ initializeForTesting: units().testing });
      const consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
      if (platform === 'ios') await AdMob.requestTrackingAuthorization().catch(() => undefined);
      return true;
    } catch (err) {
      console.warn('[ads] AdMob indisponible', err);
      return false;
    }
  })();
  return ready;
}

function adFree(): boolean {
  const p = useSession.getState().profile;
  return !!p && (p.noAds || p.vip);
}

export function rewardedAvailable(): boolean {
  return isNative;
}

/** Montre une vidéo récompensée. Renvoie true si le joueur l'a regardée jusqu'au bout. */
export async function showRewardedAd(): Promise<boolean> {
  if (!(await initAds())) return false;
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    const u = units();
    const userId = useSession.getState().profile?.id;
    await AdMob.prepareRewardVideoAd({ adId: u.rewarded, isTesting: u.testing, ...(userId ? { ssv: { userId } } : {}) });
    const reward = await AdMob.showRewardVideoAd();
    return !!reward;
  } catch (err) {
    console.warn('[ads] vidéo indisponible', err);
    return false;
  }
}

/** Interstitielle entre deux parties (une partie sur deux au maximum). */
export async function showInterstitialAfterGame(): Promise<void> {
  if (!isNative || adFree()) return;
  const s = useSettings.getState();
  const count = s.gamesSinceInterstitial + 1;
  if (count < 2) {
    s.set({ gamesSinceInterstitial: count });
    return;
  }
  s.set({ gamesSinceInterstitial: 0 });
  if (!(await initAds())) return;
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    const u = units();
    await AdMob.prepareInterstitial({ adId: u.interstitial, isTesting: u.testing });
    await AdMob.showInterstitial();
  } catch {
    /* pas de publicité disponible : on continue simplement */
  }
}

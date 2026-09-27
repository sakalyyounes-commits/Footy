import { IAP_PRODUCTS } from '@ronda/core';
import { isNative, platform } from './native';

/**
 * Achats intégrés via RevenueCat (Google Play Billing et App Store).
 * L'application ne crédite jamais les pièces elle-même : RevenueCat prévient le serveur
 * (webhook), qui crédite le compte du joueur puis lui envoie son nouveau solde.
 */
function apiKey(): string {
  const env = import.meta.env;
  return ((platform === 'ios' ? env.VITE_REVENUECAT_IOS_KEY : env.VITE_REVENUECAT_ANDROID_KEY) as string | undefined) ?? '';
}

export function purchasesAvailable(): boolean {
  return isNative && apiKey() !== '';
}

let configuredFor: string | null = null;

async function ensureConfigured(profileId: string): Promise<boolean> {
  if (!purchasesAvailable()) return false;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  if (configuredFor === null) {
    await Purchases.configure({ apiKey: apiKey(), appUserID: profileId });
    configuredFor = profileId;
  } else if (configuredFor !== profileId) {
    await Purchases.logIn({ appUserID: profileId });
    configuredFor = profileId;
  }
  return true;
}

/** Prix localisés (en dirhams, euros…) tels qu'affichés par le store. */
export async function loadPrices(profileId: string): Promise<Record<string, string>> {
  try {
    if (!(await ensureConfigured(profileId))) return {};
    const { Purchases, PRODUCT_CATEGORY } = await import('@revenuecat/purchases-capacitor');
    const ids = IAP_PRODUCTS.map((p) => p.id);
    const [consumables, subs] = await Promise.all([
      Purchases.getProducts({ productIdentifiers: ids, type: PRODUCT_CATEGORY.NON_SUBSCRIPTION }),
      Purchases.getProducts({ productIdentifiers: ids, type: PRODUCT_CATEGORY.SUBSCRIPTION }),
    ]);
    const prices: Record<string, string> = {};
    for (const p of [...consumables.products, ...subs.products]) prices[p.identifier.split(':')[0]] = p.priceString;
    return prices;
  } catch (err) {
    console.warn('[iap] prix indisponibles', err);
    return {};
  }
}

/** Lance l'achat ; renvoie true si le store l'a validé. */
export async function buyProduct(profileId: string, productId: string): Promise<boolean> {
  if (!(await ensureConfigured(profileId))) return false;
  const { Purchases, PRODUCT_CATEGORY } = await import('@revenuecat/purchases-capacitor');
  const sub = IAP_PRODUCTS.find((p) => p.id === productId)?.vipDays !== undefined;
  const { products } = await Purchases.getProducts({
    productIdentifiers: [productId],
    type: sub ? PRODUCT_CATEGORY.SUBSCRIPTION : PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  });
  const product = products[0];
  if (!product) return false;
  try {
    await Purchases.purchaseStoreProduct({ product });
    return true;
  } catch (err) {
    if ((err as { userCancelled?: boolean }).userCancelled) return false;
    throw err;
  }
}

export async function restorePurchases(profileId: string): Promise<void> {
  if (!(await ensureConfigured(profileId))) return;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  await Purchases.restorePurchases();
}

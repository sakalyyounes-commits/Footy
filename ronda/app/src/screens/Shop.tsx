import { Clapperboard, Crown, Lock, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ADS_PER_DAY,
  AD_REWARD,
  IAP_PRODUCTS,
  levelForXp,
  SHOP_ITEMS,
  type ShopCategory,
  type ShopItem,
} from '@ronda/core';
import { FramedAvatar } from '../components/Avatar';
import { CardBack } from '../cards/CardFace';
import { CoinIcon, Coins, Segmented, TopBar } from '../components/ui';
import { formatCoins, useT, type TranslationKey } from '../i18n';
import { connection } from '../net/connection';
import { rewardedAvailable, showRewardedAd } from '../platform/ads';
import { buyProduct, loadPrices, purchasesAvailable, restorePurchases } from '../platform/purchases';
import { useNav } from '../store/nav';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { toast } from '../store/toast';

type Tab = 'coins' | ShopCategory;

const TABLE_PREVIEW: Record<string, [string, string, string]> = {
  'table-riad': ['#13704f', '#07392a', '#e8b84a'],
  'table-majorelle': ['#2f45c9', '#121a63', '#f4d03f'],
  'table-chefchaouen': ['#4f8fd0', '#1d4f91', '#eef6ff'],
  'table-sahara': ['#c9803a', '#6e3a12', '#f7dc94'],
  'table-nuit': ['#22325e', '#080d1f', '#c7a24a'],
  'table-palais': ['#9b2318', '#3f0c07', '#f2c75c'],
};

function ItemPreview({ item }: { item: ShopItem }) {
  if (item.category === 'cardBack') {
    return (
      <div style={{ width: 64, height: 100 }}>
        <CardBack back={item.id} />
      </div>
    );
  }
  if (item.category === 'table') {
    const [a, b, edge] = TABLE_PREVIEW[item.id] ?? TABLE_PREVIEW['table-riad'];
    return (
      <div
        className="table-preview"
        style={{ background: `radial-gradient(circle at 50% 40%, ${a}, ${b})`, ['--edge' as string]: edge }}
      />
    );
  }
  return <FramedAvatar index={useSettings.getState().avatar} size={70} frame={item.id} />;
}

export function Shop({ tab: initialTab }: { tab?: Tab }) {
  const t = useT();
  const nav = useNav();
  const lang = useSettings((s) => s.lang);
  const settings = useSettings();
  const profile = useSession((s) => s.profile);
  const status = useSession((s) => s.status);
  const [tab, setTab] = useState<Tab>(initialTab ?? 'coins');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const online = status === 'online' && !!profile;
  const level = profile ? levelForXp(profile.xp) : 1;
  const today = new Date(connection.serverNow()).toISOString().slice(0, 10);
  const adsLeft = profile ? (profile.ads.date === today ? ADS_PER_DAY - profile.ads.count : ADS_PER_DAY) : 0;

  useEffect(() => {
    if (profile && purchasesAvailable()) void loadPrices(profile.id).then(setPrices);
  }, [profile?.id]);

  async function purchase(productId: string) {
    if (!profile) return toast(t('err.offline'), 'error');
    if (!purchasesAvailable()) return toast(t('shop.only_app'));
    setBusy(true);
    try {
      if (await buyProduct(profile.id, productId)) toast(t('shop.thanks'), 'success');
    } catch {
      toast(t('err.generic'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function watchAd() {
    setBusy(true);
    const ok = await showRewardedAd();
    setBusy(false);
    if (ok) connection.send({ t: 'claim', kind: 'ad' });
    else toast(t('err.ads_unavailable'), 'error');
  }

  function itemAction(item: ShopItem) {
    const owned = profile?.owned.includes(item.id) || (item.price === 0 && !item.exclusive);
    if (!online) {
      // Hors ligne : seuls les articles gratuits ou déjà achetés peuvent être choisis.
      if (!owned) return toast(t('err.offline'), 'error');
      if (item.category === 'cardBack') settings.set({ cardBack: item.id });
      if (item.category === 'table') settings.set({ table: item.id });
      return;
    }
    if (owned) {
      connection.send({ t: 'shop.equip', itemId: item.id });
      if (item.category === 'cardBack') settings.set({ cardBack: item.id });
      if (item.category === 'table') settings.set({ table: item.id });
    } else {
      connection.send({ t: 'shop.buy', itemId: item.id });
    }
  }

  const equipped = (item: ShopItem) =>
    profile ? profile.equipped[item.category] === item.id : item.category === 'cardBack' ? settings.cardBack === item.id : item.category === 'table' ? settings.table === item.id : item.id === 'frame-none';

  return (
    <div className="screen">
      <TopBar title={t('shop.title')} onBack={nav.pop} right={<Coins amount={profile?.coins ?? null} />} />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'coins', label: t('shop.coins') },
          { value: 'cardBack', label: t('shop.backs_short') },
          { value: 'table', label: t('shop.tables') },
          { value: 'frame', label: t('shop.frames') },
        ]}
      />

      {tab === 'coins' ? (
        <div className="col" style={{ marginTop: 14, gap: 10 }}>
          {!purchasesAvailable() && <div className="panel small muted">{t('shop.only_app')}</div>}
          {rewardedAvailable() && (
            <div className="pack">
              <Clapperboard color="var(--gold-2)" size={30} />
              <div className="amount">
                {t('shop.watch_ad')}
                <div className="small muted" style={{ fontFamily: 'var(--font-ui)', fontWeight: 700 }}>
                  {t('shop.watch_ad_sub', { n: AD_REWARD, left: adsLeft })}
                </div>
              </div>
              <button className="btn btn-green btn-sm" disabled={busy || adsLeft <= 0 || !online} onClick={watchAd}>
                ▶
              </button>
            </div>
          )}
          {IAP_PRODUCTS.map((p) => {
            const price = prices[p.id] ?? p.fallbackPrice;
            const title =
              p.id === 'ronda_starter'
                ? t('shop.starter')
                : p.id === 'ronda_no_ads'
                  ? t('shop.no_ads')
                  : p.id === 'ronda_vip_month'
                    ? t('shop.vip')
                    : `${formatCoins(p.coins, lang)}`;
            const sub =
              p.id === 'ronda_starter'
                ? t('shop.starter_desc')
                : p.id === 'ronda_vip_month'
                  ? t('shop.vip_desc')
                  : p.id === 'ronda_no_ads'
                    ? ''
                    : t('common.coins');
            const alreadyNoAds = p.id === 'ronda_no_ads' && profile?.noAds;
            return (
              <div key={p.id} className="pack">
                {p.badge && <span className="tag">{p.badge === 'popular' ? t('shop.popular') : t('shop.best')}</span>}
                {p.vipDays ? <Crown color="var(--gold-2)" size={30} /> : <CoinIcon size={30} />}
                <div className="amount">
                  {title}
                  {sub && (
                    <div className="small muted" style={{ fontFamily: 'var(--font-ui)', fontWeight: 700 }}>
                      {sub}
                    </div>
                  )}
                </div>
                <button className="btn btn-gold btn-sm" disabled={busy || !!alreadyNoAds} onClick={() => purchase(p.id)}>
                  {alreadyNoAds ? '✓' : price}
                </button>
              </div>
            );
          })}
          {purchasesAvailable() && profile && (
            <button className="btn btn-ghost btn-block" onClick={() => void restorePurchases(profile.id)}>
              <RotateCcw size={18} /> {t('shop.restore')}
            </button>
          )}
        </div>
      ) : (
        <div className="shop-grid" style={{ marginTop: 14 }}>
          {SHOP_ITEMS.filter((i) => i.category === tab).map((item) => {
            const owned = profile?.owned.includes(item.id) || (item.price === 0 && !item.exclusive);
            const isEquipped = equipped(item);
            const locked = !owned && (item.minLevel ?? 1) > level;
            return (
              <div key={item.id} className={`shop-item ${isEquipped ? 'equipped' : ''}`}>
                {item.exclusive && !owned && <span className="shop-ribbon">{item.exclusive === 'vip' ? 'VIP' : t('shop.exclusive')}</span>}
                <ItemPreview item={item} />
                <span className="item-name">{t(`item.${item.id}` as TranslationKey)}</span>
                {isEquipped ? (
                  <span className="chip">{t('shop.equipped')}</span>
                ) : owned ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => itemAction(item)}>
                    {t('shop.equip')}
                  </button>
                ) : item.exclusive ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab('coins')}>
                    <Crown size={14} /> {item.exclusive === 'vip' ? 'VIP' : t('shop.starter')}
                  </button>
                ) : locked ? (
                  <span className="chip">
                    <Lock size={13} /> {t('common.locked', { n: item.minLevel ?? 1 })}
                  </span>
                ) : (
                  <button className="btn btn-gold btn-sm" onClick={() => itemAction(item)}>
                    <CoinIcon size={16} /> {formatCoins(item.price, lang)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}

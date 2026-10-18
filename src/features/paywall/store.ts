/**
 * Buying from the App Store and Google Play, with nothing in it that loads a
 * native module, so every rule below is tested in Node (store.test.ts).
 * `./purchases.ts` binds it to expo-iap and to the Supabase session.
 *
 * What a purchase here does and does not do:
 * - It **never makes anyone Pro.** The plan comes from the store's own
 *   notification through the webhooks (supabase/functions/app-store,
 *   supabase/functions/play-rtdn) and reaches the device with the next sync.
 *   A result of `started` means the store took the purchase, nothing more.
 * - It **always carries the Supabase user id** — `appAccountToken` on
 *   StoreKit 2, `obfuscatedAccountId` on Play. The webhooks will not guess an
 *   owner from anything else, so with no backend session there is no
 *   purchase: the answer is `unavailable` before any store sheet opens.
 * - It **finishes every transaction it sees**, including ones replayed from
 *   an earlier launch. Play refunds a purchase not acknowledged within three
 *   days, and StoreKit replays an unfinished one on every launch. Tips are
 *   consumed, so the same tip can be bought again.
 */

import { applePrices, inAppPrices, playPrices, type Money } from './live-prices';

export type Period = 'year' | 'month';
export type TipProduct = 'tip_small' | 'tip_regular' | 'tip_large';
/** The three, in the order the sheet shows them: Small, Regular, Large. */
export const TIP_PRODUCTS: readonly TipProduct[] = ['tip_small', 'tip_regular', 'tip_large'];
export type Platform = 'ios' | 'android';

/** App Store product ids (RELEASE.md § 1.2). */
export const APPLE_PRODUCT: Record<Period, string> = { year: 'pro_yearly', month: 'pro_monthly' };
/**
 * Play sells one subscription product with a base plan per period; the
 * webhook reads the base plan id (store-contract.ts `periodOf`). The product's
 * own id is not fixed by any document, so this one is ours — it must match
 * what is created in the Play Console (BUILD-REVIEW §2.50).
 */
export const PLAY_SUBSCRIPTION = 'pro';
export const PLAY_BASE_PLAN: Record<Period, string> = { year: 'yearly', month: 'monthly' };

export type BuyResult = 'started' | 'cancelled' | 'pending' | 'failed' | 'unavailable';
export type RestoreResult = 'restored' | 'none' | 'failed' | 'unavailable';

/** The slice of a store purchase this file reads. */
export type StorePurchase = {
  productId: string;
  purchaseState: 'pending' | 'purchased' | 'unknown';
};

/** The slice of a store error this file reads. */
export type StoreError = { code: string; productId?: string | null };

export type Offer = {
  basePlanIdAndroid?: string | null;
  offerTokenAndroid?: string | null;
  pricingPhasesAndroid?: { pricingPhaseList: { priceAmountMicros: string }[] } | null;
};

/** The slice of expo-iap this file uses, so the tests can stand in for it. */
export type Iap = {
  initConnection: () => Promise<unknown>;
  fetchProducts: (args: { skus: string[]; type: 'subs' | 'in-app' }) => Promise<unknown>;
  requestPurchase: (args: unknown) => Promise<unknown>;
  finishTransaction: (args: { purchase: never; isConsumable: boolean }) => Promise<unknown>;
  restorePurchases: () => Promise<unknown>;
  getAvailablePurchases: () => Promise<StorePurchase[]>;
  deepLinkToSubscriptions: (args: { skuAndroid?: string; packageNameAndroid?: string }) => Promise<unknown>;
  purchaseUpdatedListener: (fn: (purchase: StorePurchase) => void) => { remove: () => void };
  purchaseErrorListener: (fn: (error: StoreError) => void) => { remove: () => void };
};

export type Deps = {
  /** Null on the web, where there is no store. */
  platform: Platform | null;
  /** Loaded only when a store is used, so the web never touches the module. */
  iap: () => Iap;
  /** The backend session's user id, or null without one. */
  userId: () => Promise<string | null>;
  /** The Android package, for "Manage subscription". */
  androidPackage: string;
  /** How long to wait on a store sheet before giving up on it. */
  timeoutMs?: number;
};

const TIPS: readonly string[] = ['tip_small', 'tip_regular', 'tip_large'];
const isTip = (productId: string) => TIPS.includes(productId);
const isPro = (productId: string) =>
  productId === PLAY_SUBSCRIPTION || Object.values(APPLE_PRODUCT).includes(productId);

/**
 * On Play, the offer to buy a base plan with: the free-trial offer when there
 * is one (a pricing phase at zero), otherwise the base plan itself.
 */
export function pickOffer(offers: Offer[], basePlan: string): string | null {
  const own = offers.filter((o) => o.basePlanIdAndroid === basePlan && o.offerTokenAndroid);
  const free = own.find((o) => o.pricingPhasesAndroid?.pricingPhaseList.some((p) => p.priceAmountMicros === '0'));
  return (free ?? own[0])?.offerTokenAndroid ?? null;
}

export function createStore(deps: Deps) {
  const timeoutMs = deps.timeoutMs ?? 10 * 60_000;
  let connected: Promise<Iap> | null = null;
  /** The one purchase being waited on: a store sheet is modal, so one at a time. */
  let waiting: { productId: string; settle: (r: BuyResult) => void } | null = null;

  const settle = (productId: string | null | undefined, result: BuyResult) => {
    if (!waiting) return;
    if (productId && productId !== waiting.productId) return;
    const { settle: done } = waiting;
    waiting = null;
    done(result);
  };

  /**
   * Connects once, and from then on finishes every purchase the store
   * reports — this launch's and any replayed from before.
   */
  const connect = (): Promise<Iap> => {
    if (!connected) {
      connected = (async () => {
        const iap = deps.iap();
        await iap.initConnection();
        iap.purchaseUpdatedListener((purchase) => {
          if (purchase.purchaseState === 'pending') return settle(purchase.productId, 'pending');
          if (purchase.purchaseState !== 'purchased') return;
          iap
            .finishTransaction({ purchase: purchase as never, isConsumable: isTip(purchase.productId) })
            .catch(() => {});
          settle(purchase.productId, 'started');
        });
        iap.purchaseErrorListener((error) => settle(error.productId, error.code === 'user-cancelled' ? 'cancelled' : 'failed'));
        return iap;
      })();
      // A failed connection is tried again next time rather than kept.
      connected.catch(() => {
        connected = null;
      });
    }
    return connected;
  };

  const buy = async (productId: string, request: (iap: Iap, userId: string) => Promise<unknown>): Promise<BuyResult> => {
    if (!deps.platform) return 'unavailable';
    const userId = await deps.userId();
    if (!userId) return 'unavailable';
    if (waiting) return 'failed';
    let iap: Iap;
    try {
      iap = await connect();
    } catch {
      return 'unavailable';
    }
    const outcome = new Promise<BuyResult>((resolve) => {
      const timer = setTimeout(() => settle(null, 'cancelled'), timeoutMs);
      waiting = {
        productId,
        settle: (r) => {
          clearTimeout(timer);
          resolve(r);
        },
      };
    });
    try {
      await request(iap, userId);
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      settle(null, code === 'user-cancelled' ? 'cancelled' : 'failed');
    }
    return outcome;
  };

  return {
    /** Connect early, so a purchase left unfinished last launch is finished now. */
    start: (): void => {
      if (deps.platform) connect().catch(() => {});
    },

    /**
     * What the store charges for the two periods, in the buyer's currency.
     * `{}` on the web, without a store, or when the products do not exist
     * yet — and the paywall then shows the table it always showed, so a
     * dead network is a stale price rather than a blank card.
     */
    prices: async (): Promise<Partial<Record<Period, Money>>> => {
      if (!deps.platform) return {};
      try {
        const iap = deps.iap();
        await iap.initConnection();
        if (deps.platform === 'android') {
          return playPrices(await iap.fetchProducts({ skus: [PLAY_SUBSCRIPTION], type: 'subs' }), PLAY_SUBSCRIPTION, PLAY_BASE_PLAN);
        }
        return applePrices(await iap.fetchProducts({ skus: [APPLE_PRODUCT.month, APPLE_PRODUCT.year], type: 'subs' }), APPLE_PRODUCT);
      } catch {
        return {};
      }
    },

    /**
     * What the store charges for each tip, in the buyer's own currency.
     * The sheet showed a hand-typed "$0.99" to everyone, including the
     * storefronts that are billed in riyals (BUILD-REVIEW §2.100).
     */
    tipPrices: async (): Promise<Partial<Record<TipProduct, Money>>> => {
      if (!deps.platform) return {};
      try {
        const iap = deps.iap();
        await iap.initConnection();
        return inAppPrices(await iap.fetchProducts({ skus: [...TIP_PRODUCTS], type: 'in-app' }), TIP_PRODUCTS);
      } catch {
        return {};
      }
    },

    /** Starts the 7-day trial on the period chosen on the paywall. */
    startTrial: (period: Period): Promise<BuyResult> =>
      deps.platform === 'android'
        ? buy(PLAY_SUBSCRIPTION, async (iap, userId) => {
            const products = (await iap.fetchProducts({ skus: [PLAY_SUBSCRIPTION], type: 'subs' })) as
              | { id: string; subscriptionOffers?: Offer[] }[]
              | null;
            const offers = products?.find((p) => p.id === PLAY_SUBSCRIPTION)?.subscriptionOffers ?? [];
            const offerToken = pickOffer(offers, PLAY_BASE_PLAN[period]);
            if (!offerToken) throw { code: 'sku-not-found' };
            await iap.requestPurchase({
              type: 'subs',
              request: {
                google: {
                  skus: [PLAY_SUBSCRIPTION],
                  subscriptionOffers: [{ sku: PLAY_SUBSCRIPTION, offerToken }],
                  obfuscatedAccountId: userId,
                },
              },
            });
          })
        : buy(APPLE_PRODUCT[period], async (iap, userId) => {
            // StoreKit needs the product loaded before it will sell it.
            await iap.fetchProducts({ skus: [APPLE_PRODUCT[period]], type: 'subs' });
            await iap.requestPurchase({
              type: 'subs',
              request: { apple: { sku: APPLE_PRODUCT[period], appAccountToken: userId } },
            });
          }),

    /** One of the three consumable tips. */
    /**
     * `quantity` is iOS only, and not an oversight: StoreKit takes it on the
     * request, while Play's `RequestPurchaseAndroidProps` has no such field —
     * multi-quantity there is a Play Console setting that puts a stepper in
     * Google's own sheet. Passing it on Android would charge for one and
     * say three, so the counter is not offered there at all
     * (BUILD-REVIEW §2.100).
     */
    buyTip: (product: TipProduct, quantity = 1): Promise<BuyResult> =>
      buy(product, async (iap, userId) => {
        await iap.fetchProducts({ skus: [product], type: 'in-app' });
        await iap.requestPurchase({
          type: 'in-app',
          request: {
            apple: { sku: product, appAccountToken: userId, quantity: Math.max(1, Math.trunc(quantity)) },
            google: { skus: [product], obfuscatedAccountId: userId },
          },
        });
      }),

    /**
     * Asks the store for what this store account already owns. The plan is
     * still the server's word; this only answers whether there was anything
     * to restore, and finishes what is found.
     */
    restore: async (): Promise<RestoreResult> => {
      if (!deps.platform || !(await deps.userId())) return 'unavailable';
      try {
        const iap = await connect();
        await iap.restorePurchases();
        const owned = (await iap.getAvailablePurchases()).filter((p) => isPro(p.productId));
        return owned.length > 0 ? 'restored' : 'none';
      } catch {
        return 'failed';
      }
    },

    /** The store's own subscription screen. False when there is no store. */
    manage: async (): Promise<boolean> => {
      if (!deps.platform) return false;
      try {
        const iap = await connect();
        await iap.deepLinkToSubscriptions(
          deps.platform === 'android'
            ? { skuAndroid: PLAY_SUBSCRIPTION, packageNameAndroid: deps.androidPackage }
            : {}
        );
        return true;
      } catch {
        return false;
      }
    },
  };
}

export type Store = ReturnType<typeof createStore>;

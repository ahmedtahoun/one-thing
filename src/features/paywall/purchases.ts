/**
 * Starting the Pro trial, buying a tip, restoring and managing — StoreKit 2
 * and Play Billing through expo-iap (DATA_MODEL § Integrations).
 *
 * The rules live in `./store.ts`, where they are tested; this file only binds
 * them to the real store and the real session. Two things to know:
 *
 * - **Nobody becomes Pro here.** The plan comes from the store's receipt
 *   through the webhooks (supabase/functions/app-store,
 *   supabase/functions/play-rtdn) and arrives with the next sync. The
 *   prototype flips the plan and says "Welcome to Pro 🎉"; that would be a
 *   purchase the server never heard of.
 * - **Every purchase carries the backend user id** (`appAccountToken` /
 *   `obfuscatedAccountId`), which is the only way the webhooks know whose
 *   purchase it is. It is the backend session's id (`db.auth.getSession()`),
 *   not `session.userId` from `src/lib/session.tsx`, which is a device-local
 *   placeholder until the first sync. Without a backend session nothing is
 *   sold, and the answer is `unavailable`.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { createStore, type Iap, type Period } from './store';

export type { BuyResult, Period, RestoreResult, TipProduct } from './store';

/** The product each plan card names, for the `purchase` analytics event. */
export const PRODUCT: Record<Period, string> = { year: 'pro_yearly', month: 'pro_monthly' };

/**
 * The tip jar's three consumables, in the order the sheet shows them
 * (DATA_MODEL § Integrations: tip_small 0.99, tip_regular 2.99, tip_large 4.99).
 */
export const TIP_PRODUCTS = ['tip_small', 'tip_regular', 'tip_large'] as const;

const store = createStore({
  platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null,
  // Required here and not imported above: the module is native, and the web
  // build must never load it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  iap: () => require('expo-iap') as Iap,
  userId: async () => {
    const db = supabase();
    if (!db) return null;
    const { data } = await db.auth.getSession();
    return data.session?.user.id ?? null;
  },
  androidPackage: Constants.expoConfig?.android?.package ?? 'app.onlyonething',
});

export const startPurchases = store.start;
export const storePrices = store.prices;
export const startTrial = store.startTrial;
export const buyTip = store.buyTip;
export const restorePurchases = store.restore;
export const manageSubscription = store.manage;

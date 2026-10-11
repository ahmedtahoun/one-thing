/**
 * The purchase rules, with a pretend store standing in for expo-iap.
 * `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createStore, pickOffer, type Iap, type Platform, type StoreError, type StorePurchase } from './store';

const USER = '00000000-0000-4000-8000-000000000001';

/** A store that records what it is asked, and answers the way it is told. */
function fakeStore(answer: (request: any) => StorePurchase | StoreError | 'throw-cancel' | 'silent') {
  const calls: { name: string; args?: any }[] = [];
  let onPurchase: (p: StorePurchase) => void = () => {};
  let onError: (e: StoreError) => void = () => {};
  let owned: StorePurchase[] = [];
  const iap: Iap = {
    initConnection: async () => void calls.push({ name: 'init' }),
    fetchProducts: async (args) => {
      calls.push({ name: 'fetch', args });
      return [
        {
          id: 'pro',
          subscriptionOffers: [
            { basePlanIdAndroid: 'monthly', offerTokenAndroid: 'm-base', pricingPhasesAndroid: { pricingPhaseList: [{ priceAmountMicros: '4990000' }] } },
            { basePlanIdAndroid: 'yearly', offerTokenAndroid: 'y-base', pricingPhasesAndroid: { pricingPhaseList: [{ priceAmountMicros: '35880000' }] } },
            { basePlanIdAndroid: 'yearly', offerTokenAndroid: 'y-trial', pricingPhasesAndroid: { pricingPhaseList: [{ priceAmountMicros: '0' }, { priceAmountMicros: '35880000' }] } },
          ],
        },
      ];
    },
    requestPurchase: async (args) => {
      calls.push({ name: 'request', args });
      const result = answer(args);
      if (result === 'throw-cancel') throw { code: 'user-cancelled' };
      if (result === 'silent') return;
      // The store answers through its listeners, after the call returns.
      setTimeout(() => ('purchaseState' in result ? onPurchase(result) : onError(result)), 0);
    },
    finishTransaction: async (args) => void calls.push({ name: 'finish', args }),
    restorePurchases: async () => void calls.push({ name: 'restore' }),
    getAvailablePurchases: async () => owned,
    deepLinkToSubscriptions: async (args) => void calls.push({ name: 'manage', args }),
    purchaseUpdatedListener: (fn) => ((onPurchase = fn), { remove() {} }),
    purchaseErrorListener: (fn) => ((onError = fn), { remove() {} }),
  };
  return {
    iap,
    calls,
    own: (list: StorePurchase[]) => (owned = list),
    replay: (p: StorePurchase) => onPurchase(p),
    names: () => calls.map((c) => c.name),
  };
}

const store = (platform: Platform | null, fake: ReturnType<typeof fakeStore>, userId: string | null = USER, timeoutMs?: number) =>
  createStore({ platform, iap: () => fake.iap, userId: async () => userId, androidPackage: 'app.onlyonething', timeoutMs });

const bought = (productId: string): StorePurchase => ({ productId, purchaseState: 'purchased' });

describe('purchases', () => {
  it('sends the Supabase user id with every StoreKit purchase', async () => {
    const fake = fakeStore(() => bought('pro_yearly'));
    assert.equal(await store('ios', fake).startTrial('year'), 'started');
    const request = fake.calls.find((c) => c.name === 'request')!.args;
    assert.deepEqual(request, { type: 'subs', request: { apple: { sku: 'pro_yearly', appAccountToken: USER } } });
    // Finished, and not consumed: it is a subscription.
    assert.deepEqual(fake.calls.find((c) => c.name === 'finish')!.args.isConsumable, false);
  });

  it('buys the yearly base plan through its free-trial offer on Play, with the account id', async () => {
    const fake = fakeStore(() => bought('pro'));
    assert.equal(await store('android', fake).startTrial('year'), 'started');
    assert.deepEqual(fake.calls.find((c) => c.name === 'request')!.args, {
      type: 'subs',
      request: { google: { skus: ['pro'], subscriptionOffers: [{ sku: 'pro', offerToken: 'y-trial' }], obfuscatedAccountId: USER } },
    });
  });

  it('opens no store sheet without a backend session, or on the web', async () => {
    const fake = fakeStore(() => bought('pro_yearly'));
    assert.equal(await store('ios', fake, null).startTrial('year'), 'unavailable');
    assert.equal(await store(null, fake).buyTip('tip_small'), 'unavailable');
    assert.equal(await store(null, fake).manage(), false);
    assert.deepEqual(fake.calls, []);
  });

  it('tells a cancel from a failure, and a pending payment from both', async () => {
    assert.equal(await store('ios', fakeStore(() => ({ code: 'user-cancelled', productId: 'pro_monthly' }))).startTrial('month'), 'cancelled');
    assert.equal(await store('ios', fakeStore(() => 'throw-cancel')).startTrial('month'), 'cancelled');
    assert.equal(await store('ios', fakeStore(() => ({ code: 'network-error' }))).startTrial('month'), 'failed');
    const pending = fakeStore(() => ({ productId: 'pro_monthly', purchaseState: 'pending' }));
    assert.equal(await store('ios', pending).startTrial('month'), 'pending');
    // A payment still waiting on the bank is not finished.
    assert.equal(pending.names().includes('finish'), false);
  });

  it('gives up on a store sheet that never answers', async () => {
    assert.equal(await store('ios', fakeStore(() => 'silent'), USER, 20).startTrial('month'), 'cancelled');
  });

  it('consumes a tip, so it can be bought again', async () => {
    const fake = fakeStore(() => bought('tip_regular'));
    assert.equal(await store('android', fake).buyTip('tip_regular'), 'started');
    const request = fake.calls.find((c) => c.name === 'request')!.args;
    assert.equal(request.request.google.obfuscatedAccountId, USER);
    assert.equal(request.request.apple.appAccountToken, USER);
    assert.equal(fake.calls.find((c) => c.name === 'finish')!.args.isConsumable, true);
  });

  it('finishes a purchase replayed from an earlier launch', async () => {
    const fake = fakeStore(() => 'silent');
    store('ios', fake).start();
    await new Promise((r) => setTimeout(r, 0));
    fake.replay(bought('pro_monthly'));
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(fake.names(), ['init', 'finish']);
  });

  it('restores only what is ours to restore', async () => {
    const fake = fakeStore(() => 'silent');
    const s = store('ios', fake);
    assert.equal(await s.restore(), 'none');
    fake.own([bought('tip_small')]);
    assert.equal(await s.restore(), 'none', 'a consumed tip is not something to restore');
    fake.own([bought('pro_yearly')]);
    assert.equal(await s.restore(), 'restored');
  });

  it('opens Play’s subscription screen at this app’s product', async () => {
    const fake = fakeStore(() => 'silent');
    assert.equal(await store('android', fake).manage(), true);
    assert.deepEqual(fake.calls.find((c) => c.name === 'manage')!.args, { skuAndroid: 'pro', packageNameAndroid: 'app.onlyonething' });
  });

  it('picks the base plan when there is no trial offer', () => {
    assert.equal(pickOffer([{ basePlanIdAndroid: 'monthly', offerTokenAndroid: 'm' }], 'monthly'), 'm');
    assert.equal(pickOffer([{ basePlanIdAndroid: 'monthly', offerTokenAndroid: 'm' }], 'yearly'), null);
  });
});

/**
 * 24 · Paywall. SCREENS.md § 24.
 *
 * Close and Restore; the badge and the title with the person's first name;
 * a Yearly / Monthly switch; then one card per tier — Free, Pro, Pro+ — and
 * the trial button with the required fine print for what is selected.
 *
 * **Three cards stacked, not three columns.** At 402 pt a three-column
 * price table is unreadable, and three tiers across two periods is six
 * prices. The switch takes the period out of the cards so each one shows a
 * single number.
 *
 * **Every number here is derived** from src/features/paywall/plans.ts —
 * the per-month figure, the annual total in the fine print, and the saving.
 * The saving used to be the typed string "Save 40%", which was right for
 * $4.99 / $35.88 and silently wrong at any other price. It also differs by
 * tier (Pro saves more than Pro+), so one badge for the screen could not
 * have been true anyway.
 *
 * **Pro+ is shown and cannot be bought.** Its three features do not exist,
 * so `isForSale` leaves it out, the card says so plainly, and nothing takes
 * money for it. Listing a tier whose bullets are not built is the Weekly
 * recap mistake (§2.56) at $12.99 a month; showing it as coming is how the
 * price gets seen without anyone paying for air.
 */
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { track } from '@/lib/analytics/track';
import { restorePurchases, startTrial, storePrices, type Period } from '@/features/paywall/purchases';
import {
  fallbackPrices,
  PRODUCT_ID,
  isForSale,
  type Tier,
} from '@/features/paywall/plans';
import { formatMoney, perMonthOf, resolvePrices, savingsOf, type Money } from '@/features/paywall/live-prices';
import { added } from '@/content/additions';
import { BalancedText } from '@/ui/BalancedText';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { LTRText, Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { type IconName } from '@/design/icon-paths';
import { ink, paywallFeature, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useSession } from '@/lib/session';

/** Free first, so the person reads what they already have before a price. */
const CARDS = ['free', 'pro', 'pro_plus'] as const;
type CardKey = (typeof CARDS)[number];

export default function Paywall() {
  const { setx, acc, inline, a11y, lang } = useLanguage();
  const dir = useDirection();
  const { session } = useSession();
  const toast = useToast();
  const pw = setx.pw;

  // Yearly is the default (SCREENS.md § 24).
  const [period, setPeriod] = useState<Period>('year');
  // The tier the button would buy. Only one is on sale today, so this never
  // changes by itself — it exists so that selling Pro+ is a change to
  // FOR_SALE and nothing here.
  const [tier, setTier] = useState<Tier>('pro');

  const first = session?.firstName?.trim() ?? '';
  const title = pw.title.replace('{n}', first ? inline.paywallName.replace('{n}', first) : '');

  // Once per opening, not once per render: the funnel step is "saw the
  // paywall", and a re-render is not a second view.
  useEffect(() => track({ name: 'paywall_viewed' }), []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const start = async () => {
    // The trial starts in the store's own sheet, and Pro arrives with the
    // receipt through the webhooks — never from this answer (purchases.ts).
    // Cancel and a payment still pending say nothing; the store's own sheet
    // has already said it. Without a store or a backend session nothing
    // opens at all.
    const result = await startTrial(period);
    if (result === 'failed') toast.show(added(lang).storeFailed, { undo: false });
    if (result === 'started') {
      // Both, because DATA_MODEL asks for the trial and the purchase
      // separately and the store reports one event: the trial is the start of
      // the subscription, and `purchase` names which product it was.
      track({ name: 'trial_started', period });
      track({ name: 'purchase', product: PRODUCT_ID[tier][period] });
      close();
    }
  };

  const restore = async () => {
    const result = await restorePurchases();
    const message = result === 'restored' ? added(lang).restored : result === 'failed' ? added(lang).storeFailed : pw.toastRestore;
    toast.show(message, { undo: false });
  };

  /**
   * What the store charges, fetched once. Until it answers — and on the
   * web, and before the products exist — the cards show the table in
   * `plans.ts`, which is what they always showed. A price is never blank
   * and never half-live: `resolvePrices` takes the store's pair or none of
   * it (src/features/paywall/live-prices.ts).
   */
  const [fromStore, setFromStore] = useState<Partial<Record<Period, Money>>>({});
  useEffect(() => {
    let gone = false;
    void storePrices()
      .then((found) => !gone && setFromStore(found))
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, []);

  const priceOf = (key: Tier) => resolvePrices(fallbackPrices(key), key === tier ? fromStore : {});
  const show = (m: Money) => formatMoney(m, lang === 'ar' ? 'ar' : 'en');

  const periods: { key: Period; name: string }[] = [
    { key: 'year', name: pw.year },
    { key: 'month', name: pw.month },
  ];

  const shown = priceOf(tier).prices;
  const fine = period === 'year'
    ? pw.fineY.replace('{price}', show(shown.year))
    : pw.fineM.replace('{price}', show(shown.month));

  // Purchasable tiers sit above the button and anything not yet on sale
  // below it. The redesign had pushed the button to 1153 pt on an 874 pt
  // screen — a paywall whose buy button is off-screen, with a card nobody
  // can act on sitting between the offer and the action. Driven by
  // `isForSale`, so Pro+ moves up on its own the day it ships.
  const offered = CARDS.filter((key) => key === 'free' || isForSale(key));
  const coming = CARDS.filter((key) => key !== 'free' && !isForSale(key));

  const card = (key: CardKey) => {
          const paid = key !== 'free';
          const sellable = paid && isForSale(key);
          const chosen = paid && key === tier && sellable;
          const feats = key === 'free' ? pw.freeFeats : key === 'pro' ? pw.feats : pw.plusFeats;
          const name = key === 'free' ? pw.tierFree : key === 'pro' ? pw.tierPro : pw.tierPlus;
          // Free has no price; Pro+ has one and no way to pay it.
          const sub = key === 'free'
            ? pw.current
            : period === 'year'
              ? pw.yearSub.replace('{price}', show(priceOf(key).prices.year))
              : pw.monthSub;

          return (
            <Pressable
              key={key}
              testID={`paywall-tier-${key}`}
              onPress={sellable ? () => setTier(key) : undefined}
              accessibilityRole={sellable ? 'radio' : undefined}
              aria-checked={sellable ? chosen : undefined}
              // Dimmed rather than hidden: the point of showing Pro+ is
              // that the price is seen. Not pressable, so nothing suggests
              // it can be bought.
              style={{
                gap: 14,
                padding: 18,
                borderWidth: 2,
                borderColor: chosen ? ink.base : surface.line,
                borderRadius: 18,
                backgroundColor: surface.white,
                opacity: paid && !sellable ? 0.72 : 1,
              }}
            >
              <View style={{ flexDirection: dir.row, alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
                    <Text token="bodyL" weight="600">
                      {name}
                    </Text>
                    {paid && !sellable ? (
                      <View
                        testID={`paywall-soon-${key}`}
                        style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: surface.fill }}
                      >
                        <Text size={11} weight="600" color={ink.s4}>
                          {pw.soon}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text token="caption" color={ink.s4}>
                    {paid && !sellable ? pw.soonSub : sub}
                  </Text>
                </View>
                {paid ? (
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <LTRText token="title" testID={`paywall-price-${key}`}>
                      {show(perMonthOf(priceOf(key).prices, period))}
                    </LTRText>
                    <Text token="micro" color={ink.s4}>
                      {pw.per}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Free is context, not an offer, so it gets one line instead of
                  three rows. Three full cards put the button a whole screen
                  below the fold, and the comparison that matters is Pro
                  against Pro+. */}
              {key === 'free' ? (
                <Text token="caption" lh={19} color={ink.s4}>
                  {feats.map(([, featName]) => featName).join(' · ')}
                </Text>
              ) : null}

              <View style={{ gap: 12, display: key === 'free' ? 'none' : 'flex' }}>
                {feats.map(([icon, featName, featSub], i) => {
                  const colour = paywallFeature[i] ?? paywallFeature[0];
                  return (
                    <View key={featName} style={{ flexDirection: dir.row, gap: 12, alignItems: 'flex-start' }}>
                      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: colour.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={icon as IconName} size={16} color={colour.fg} strokeWidth={1.9} />
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text token="bodyS" weight="600">
                          {featName}
                        </Text>
                        <Text token="micro" lh={17} color={ink.s4}>
                          {featSub}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Per tier, because Pro and Pro+ do not discount by the same
                  amount — which is exactly why one typed badge was wrong.
                  Only on a tier you can actually buy: a saving advertised
                  on something not for sale is an offer that is not open. */}
              {sellable && period === 'year' && savingsOf(priceOf(key).prices) !== null ? (
                <View
                  testID={`paywall-save-${key}`}
                  style={{
                    position: 'absolute',
                    top: -11,
                    // The inline end, set physically: React Native Web reads
                    // `end` from the app-wide direction (§2.19).
                    ...(dir.isRTL ? { left: 16 } : { right: 16 }),
                    paddingVertical: 4,
                    paddingHorizontal: 9,
                    borderRadius: 999,
                    backgroundColor: status.saveTag,
                  }}
                >
                  <Text size={11} weight="600" color={surface.white}>
                    {pw.save.replace('{n}', String(savingsOf(priceOf(key).prices)))}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
  };

  return (
    <>
      <Screen scroll paddingX={22} paddingTop={4} paddingBottom={36} style={{ gap: 22 }}>
        <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable
            testID="paywall-close"
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={a11y.close}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: surface.fill, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="x" size={18} strokeWidth={2} />
          </Pressable>
          {/* As on Settings. With no store, "No previous purchases found"
              is the true answer. */}
          <Pressable testID="paywall-restore" onPress={restore} accessibilityRole="button">
            <Text token="bodyS" color={ink.s4}>
              {pw.restore}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: surface.fill }}>
            <Text token="eyebrow">{pw.k}</Text>
          </View>
          <BalancedText token="h1" size={30} lh={34.5} style={{ letterSpacing: -0.3 }} testID="paywall-title">
            {title}
          </BalancedText>
          <Text token="body" lh={22.5} color={ink.s3}>
            {pw.sub}
          </Text>
        </View>

        {/* The period once, instead of once per card: three tiers across two
            periods is six prices, and only one of them is being compared. */}
        <View
          style={{
            flexDirection: dir.row,
            gap: 4,
            padding: 4,
            borderRadius: 14,
            backgroundColor: surface.fill,
          }}
        >
          {periods.map((p) => {
            const on = p.key === period;
            return (
              <Pressable
                key={p.key}
                testID={`paywall-plan-${p.key}`}
                onPress={() => setPeriod(p.key)}
                accessibilityRole="radio"
                aria-checked={on}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? surface.white : 'transparent',
                }}
              >
                <Text token="body" weight={on ? '600' : '400'} color={on ? ink.base : ink.s4}>
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 12 }}>{offered.map(card)}</View>

        <View style={{ gap: 10 }}>
          <Pressable
            testID="paywall-start"
            onPress={start}
            accessibilityRole="button"
            style={({ pressed }) => ({
              height: 56,
              borderRadius: 28,
              backgroundColor: ink.solid,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text token="title" weight="500" color={surface.white} align="center">
              {pw.cta}
            </Text>
          </Pressable>
          {/* Required wording, for the plan selected — SCREENS.md § 24. */}
          <Text token="micro" lh={18} color={ink.s4} align="center" testID="paywall-fine">
            {fine}
          </Text>
        </View>

        {coming.length ? <View style={{ gap: 12 }}>{coming.map(card)}</View> : null}

        <View>
          <View style={{ flexDirection: dir.row, justifyContent: 'center', gap: 16 }}>
            <Pressable testID="paywall-terms" onPress={() => router.push('/legal?tab=terms')} accessibilityRole="link">
              <Text token="micro" color={ink.s4} style={{ textDecorationLine: 'underline' }}>
                {acc.si.termsL}
              </Text>
            </Pressable>
            <Pressable testID="paywall-privacy" onPress={() => router.push('/legal?tab=privacy')} accessibilityRole="link">
              <Text token="micro" color={ink.s4} style={{ textDecorationLine: 'underline' }}>
                {acc.si.privL}
              </Text>
            </Pressable>
          </View>
        </View>
      </Screen>
      <Toast />
    </>
  );
}

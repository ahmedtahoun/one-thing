/**
 * 24 · Paywall. SCREENS.md § 24.
 *
 * 4 / 22 / 36 with a 22 pt gap. Close and Restore; the badge, the title with
 * the person's first name, and the six features; the two plans, Yearly
 * selected and tagged "Save 40%"; the trial button, the required fine print
 * for the selected plan, and Terms / Privacy.
 *
 * All six features are listed as designed, Weekly recap included, though no
 * recap exists (BUILD-REVIEW.md §2.2): the product owner has kept the line
 * for now, to be designed or dropped before submission (§2.34). Nothing here
 * routes to it — `can(plan, 'weeklyRecap')` is false for everyone.
 */
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { track } from '@/lib/analytics/track';
import { PRODUCT, startTrial, type Period } from '@/features/paywall/purchases';
import { BalancedText } from '@/ui/BalancedText';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { LTRText, Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { type IconName } from '@/design/icon-paths';
import { ink, paywallFeature, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useSession } from '@/lib/session';

/** Per-month prices as the plan cards show them. The store's localised prices replace these once products exist. */
const PRICE: Record<Period, string> = { year: '$2.99', month: '$4.99' };

export default function Paywall() {
  const { setx, acc, inline, a11y } = useLanguage();
  const dir = useDirection();
  const { session } = useSession();
  const toast = useToast();
  const pw = setx.pw;

  // Yearly is the default (SCREENS.md § 24).
  const [period, setPeriod] = useState<Period>('year');

  const first = session?.firstName?.trim() ?? '';
  const title = pw.title.replace('{n}', first ? inline.paywallName.replace('{n}', first) : '');

  // Once per opening, not once per render: the funnel step is "saw the
  // paywall", and a re-render is not a second view.
  useEffect(() => track({ name: 'paywall_viewed' }), []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const start = async () => {
    // "unavailable" until the store accounts exist — see purchases.ts. Then
    // the trial starts in the store's own sheet, and Pro arrives with the
    // receipt.
    const result = await startTrial(period);
    if (result === 'started') {
      // Both, because DATA_MODEL asks for the trial and the purchase
      // separately and the store reports one event: the trial is the start of
      // the subscription, and `purchase` names which product it was.
      track({ name: 'trial_started', period });
      track({ name: 'purchase', product: PRODUCT[period] });
      close();
    }
  };

  const plans: { key: Period; name: string; sub: string; tag?: string }[] = [
    { key: 'year', name: pw.year, sub: pw.yearSub, tag: pw.save },
    { key: 'month', name: pw.month, sub: pw.monthSub },
  ];

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
          {/* As on Settings: restoring needs the store SDKs (StoreKit
              `AppStore.sync()`, Play `queryPurchasesAsync`); with no store,
              "No previous purchases found" is the true answer. */}
          <Pressable testID="paywall-restore" onPress={() => toast.show(pw.toastRestore, { undo: false })} accessibilityRole="button">
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

        <View style={{ gap: 14 }}>
          {pw.feats.map(([icon, name, sub], i) => {
            const colour = paywallFeature[i] ?? paywallFeature[0];
            return (
              <View key={name} style={{ flexDirection: dir.row, gap: 14, alignItems: 'flex-start' }}>
                <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colour.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={icon as IconName} size={18} color={colour.fg} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text token="body" weight="600">
                    {name}
                  </Text>
                  <Text token="caption" lh={18.85} color={ink.s4}>
                    {sub}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ gap: 10 }}>
          {plans.map((plan) => {
            const on = plan.key === period;
            const edge = on ? ink.base : surface.line;
            return (
              <Pressable
                key={plan.key}
                testID={`paywall-plan-${plan.key}`}
                onPress={() => setPeriod(plan.key)}
                accessibilityRole="radio"
                aria-checked={on}
                style={{
                  flexDirection: dir.row,
                  alignItems: 'center',
                  gap: 14,
                  padding: 16,
                  borderWidth: 2,
                  borderColor: edge,
                  borderRadius: 18,
                  backgroundColor: surface.white,
                }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: edge, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: on ? ink.base : 'transparent' }} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text token="bodyL" weight="600">
                    {plan.name}
                  </Text>
                  <Text token="caption" color={ink.s4}>
                    {plan.sub}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <LTRText token="title">{PRICE[plan.key]}</LTRText>
                  <Text token="micro" color={ink.s4}>
                    {pw.per}
                  </Text>
                </View>
                {plan.tag ? (
                  <View
                    testID={`paywall-tag-${plan.key}`}
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
                      {plan.tag}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 10 }}>
          <Pressable
            testID="paywall-start"
            onPress={start}
            accessibilityRole="button"
            style={({ pressed }) => ({
              height: 56,
              borderRadius: 28,
              backgroundColor: ink.base,
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
            {period === 'year' ? pw.fineY : pw.fineM}
          </Text>
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

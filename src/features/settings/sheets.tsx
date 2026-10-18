/**
 * The two sheets Settings opens: "Buy us a coffee" and "Delete your account?".
 * SCREENS.md § 21–23. Neither draws a grab handle; the delete sheet also
 * ignores a tap on the scrim, so leaving it is always a choice of button.
 */
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { formatMoney } from '@/features/paywall/live-prices';
import type { Money } from '@/features/paywall/live-prices';
import { TIP_PRODUCTS, tipPrices } from '@/features/paywall/purchases';
import { canCount, clampCups, MAX_CUPS, tipPrice, totalOf } from './tip-sheet';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { LTRText, Text } from '@/ui/Text';
import { ink, settingsTile, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

const SHEET_PADDING = { paddingTop: 24, paddingHorizontal: 22, paddingBottom: 40 } as const;

/**
 * The prices are the store's own, in the buyer's currency, asked for when
 * the sheet opens; `./tip-sheet.ts` falls back per tier to the documented
 * dollar amounts when a store says nothing. Until 18 October this sheet
 * printed `$0.99` at everybody, riyal storefronts included — the constant
 * its own comment promised would be replaced once the purchase was wired
 * in, which it was (BUILD-REVIEW §2.100).
 */

function SheetTile({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <View
      style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </View>
  );
}

/** One side of the counter. Disabled at its end rather than hidden, so the row does not jump. */
function Stepper({ testID, icon, label, on, off }: { testID: string; icon: 'minus' | 'plus'; label: string; on: () => void; off: boolean }) {
  return (
    <Pressable
      testID={testID}
      onPress={on}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      hitSlop={8}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1.5,
        borderColor: surface.line,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: off ? 0.4 : 1,
      }}
    >
      <Icon name={icon} size={16} strokeWidth={2.2} />
    </Pressable>
  );
}

export function TipSheet({
  open,
  onClose,
  onBuy,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * The tip size, 0–2, and how many of them. A consumable in-app purchase
   * — never an external link.
   */
  onBuy: (size: number, cups: number) => void;
}) {
  const { setx, lang } = useLanguage();
  const dir = useDirection();
  const st = setx.st;
  const [size, setSize] = useState(0);
  const [cups, setCups] = useState(1);
  const [live, setLive] = useState<Partial<Record<string, Money>>>({});
  const counting = canCount(Platform.OS);

  // Asked each time it opens, not once at launch: a storefront can change
  // under a signed-in person, and an answer that never comes leaves the
  // documented dollars in place rather than an empty tile.
  useEffect(() => {
    if (!open) return;
    let gone = false;
    setSize(0);
    setCups(1);
    void tipPrices().then((prices) => {
      if (!gone) setLive(prices);
    });
    return () => {
      gone = true;
    };
  }, [open]);

  const price = tipPrice(size, live, TIP_PRODUCTS);
  const total = totalOf(price, counting ? cups : 1);
  const locale = lang === 'ar' ? 'ar' : 'en';
  const step = (by: number) => setCups((n) => clampCups(n + by));

  return (
    <Sheet testID="tip-sheet" open={open} onClose={onClose} handle={false} padding={SHEET_PADDING} gap={16}>
      <SheetTile bg={settingsTile.coffee.bg}>
        <Icon name="coffee" size={24} color={settingsTile.coffee.fg} strokeWidth={1.9} />
      </SheetTile>
      <View style={{ gap: 6 }}>
        <Text token="h3">{st.tipT}</Text>
        <Text token="bodyS" lh={21.7} color={ink.s3}>
          {st.tipS}
        </Text>
      </View>
      <View style={{ flexDirection: dir.row, gap: 8 }}>
        {st.tipSizes.map((label, i) => {
          const on = i === size;
          return (
            <Pressable
              key={label}
              testID={`tip-${i}`}
              onPress={() => setSize(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 4,
                paddingVertical: 14,
                paddingHorizontal: 6,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: on ? ink.solid : surface.line,
                backgroundColor: surface.white,
              }}
            >
              <Text token="caption" color={ink.s4} align="center">
                {label}
              </Text>
              <LTRText token="title" align="center">
                {formatMoney(tipPrice(i, live, TIP_PRODUCTS), locale)}
              </LTRText>
            </Pressable>
          );
        })}
      </View>

      {counting ? (
        <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
          <Text token="bodyS" color={ink.s3}>
            {st.tipCups}
          </Text>
          <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 6 }}>
            <Stepper testID="tip-fewer" icon="minus" label={st.tipFewer} on={() => step(-1)} off={cups <= 1} />
            <LTRText testID="tip-cups" token="body" weight="600" style={{ minWidth: 28, textAlign: 'center' }}>
              {String(cups)}
            </LTRText>
            <Stepper testID="tip-more" icon="plus" label={st.tipMore} on={() => step(1)} off={cups >= MAX_CUPS} />
          </View>
        </View>
      ) : null}

      <Button testID="tip-buy" label={st.tipBuy.replace('{p}', formatMoney(total, locale))} onPress={() => onBuy(size, counting ? cups : 1)} />

      <Text token="micro" lh={18} color={ink.s5} align="center">
        {st.tipNote}
      </Text>
    </Sheet>
  );
}

export function DeleteSheet({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { setx } = useLanguage();
  const dir = useDirection();
  const st = setx.st;

  return (
    <Sheet
      testID="delete-sheet"
      open={open}
      onClose={onCancel}
      handle={false}
      dismissOnScrim={false}
      padding={SHEET_PADDING}
      gap={16}
    >
      <SheetTile bg={status.dangerTile}>
        <Icon name="trash" size={22} color={status.danger} strokeWidth={1.9} />
      </SheetTile>
      <View style={{ gap: 8 }}>
        <Text token="h3">{st.delT}</Text>
        <Text token="bodyS" lh={21.7} color={ink.s3}>
          {st.delS}
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        {st.delList.map((line) => (
          <View key={line} style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: ink.solid }} />
            <Text token="caption" color={ink.s2} style={{ flexShrink: 1 }}>
              {line}
            </Text>
          </View>
        ))}
      </View>
      <Text token="micro" lh={18} color={ink.s5}>
        {st.delNote}
      </Text>
      <Pressable
        testID="delete-confirm"
        onPress={onConfirm}
        accessibilityRole="button"
        style={{ height: 54, borderRadius: 27, backgroundColor: status.danger, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text token="bodyL" weight="600" color={surface.white} align="center">
          {st.delCta}
        </Text>
      </Pressable>
      <Pressable
        testID="delete-keep"
        onPress={onCancel}
        accessibilityRole="button"
        style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text token="body" align="center">
          {st.keep}
        </Text>
      </Pressable>
    </Sheet>
  );
}

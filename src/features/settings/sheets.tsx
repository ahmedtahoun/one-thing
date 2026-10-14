/**
 * The two sheets Settings opens: "Buy us a coffee" and "Delete your account?".
 * SCREENS.md § 21–23. Neither draws a grab handle; the delete sheet also
 * ignores a tap on the scrim, so leaving it is always a choice of button.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { LTRText, Text } from '@/ui/Text';
import { ink, settingsTile, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

const SHEET_PADDING = { paddingTop: 24, paddingHorizontal: 22, paddingBottom: 40 } as const;

/**
 * Prices are the store products' (DATA_MODEL § Integrations: tip_small 0.99,
 * tip_regular 2.99, tip_large 4.99). Once the in-app purchase is wired in,
 * the store's own localised price string replaces these.
 */
const TIP_PRICES = ['$0.99', '$2.99', '$4.99'] as const;

function SheetTile({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <View
      style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </View>
  );
}

export function TipSheet({
  open,
  onClose,
  onBuy,
}: {
  open: boolean;
  onClose: () => void;
  /** The tip size, 0–2. A consumable in-app purchase — never an external link. */
  onBuy: (size: number) => void;
}) {
  const { setx } = useLanguage();
  const dir = useDirection();
  const st = setx.st;

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
        {st.tipSizes.map((label, i) => (
          <Pressable
            key={label}
            testID={`tip-${i}`}
            onPress={() => onBuy(i)}
            accessibilityRole="button"
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 4,
              paddingVertical: 14,
              paddingHorizontal: 6,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: surface.line,
              backgroundColor: surface.white,
            }}
          >
            <Text token="caption" color={ink.s4} align="center">
              {label}
            </Text>
            <LTRText token="title" align="center">
              {TIP_PRICES[i]}
            </LTRText>
          </Pressable>
        ))}
      </View>
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

/**
 * The normal One Thing card on Today: `fill` background, radius 26, the day's
 * priority, the focus-session meta and the Lock In button. SCREENS.md § 06.
 */
import { Pressable, View } from 'react-native';

import { BalancedText } from '@/ui/BalancedText';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export function OneThingCard({
  title,
  focusMinutes,
  done,
  onEdit,
  onLockIn,
  onShrink,
}: {
  title: string;
  focusMinutes: number;
  done: boolean;
  onEdit: () => void;
  onLockIn: () => void;
  onShrink: () => void;
}) {
  const { t } = useLanguage();
  const dir = useDirection();

  return (
    <View
      testID="one-thing-card"
      style={{
        backgroundColor: surface.fill,
        borderRadius: radius.oneThing,
        paddingTop: 24,
        paddingHorizontal: 22,
        paddingBottom: 20,
        gap: 16,
      }}
    >
      <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'center' }}>
        <Text token="eyebrow" color={ink.s4}>
          {t.h_k}
        </Text>
        <Pressable testID="one-thing-edit" onPress={onEdit} accessibilityRole="button" hitSlop={10}>
          <Text token="caption" weight="500" color={ink.s3}>
            {t.edit}
          </Text>
        </Pressable>
      </View>

      <BalancedText token="h1" testID="one-thing-title" style={{ letterSpacing: -0.28 }}>
        {title}
      </BalancedText>

      {done ? (
        <View
          testID="one-thing-done"
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 8,
            backgroundColor: surface.white,
            borderRadius: radius.small,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Icon name="check" size={16} strokeWidth={2.4} />
          <Text token="bodyS" weight="500">
            {t.doneToday}
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 6 }}>
            <Icon name="clock" size={16} color={ink.s3} strokeWidth={1.8} />
            <Text token="bodyS" color={ink.s3}>
              {t.focusMeta.replace('{n}', String(focusMinutes))}
            </Text>
          </View>

          <Button testID="lock-in" label={t.lockin} onPress={onLockIn} style={{ height: 54, borderRadius: 27 }} />

          <Pressable
            testID="shrink-it"
            onPress={onShrink}
            accessibilityRole="button"
            style={{
              alignSelf: 'center',
              // The prototype grows the tap target with padding and pulls it
              // back with negative margins, so the link keeps its 44 pt target
              // without adding height to the card.
              paddingVertical: 10,
              paddingHorizontal: 8,
              marginTop: -6,
              marginBottom: -10,
            }}
          >
            <Text token="caption" color={ink.s3} align="center">
              {t.stuckLink}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

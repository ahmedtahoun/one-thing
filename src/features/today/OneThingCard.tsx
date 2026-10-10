/**
 * The normal One Thing card on Today: `fill` background, radius 26, the day's
 * priority, the focus-session meta and the Lock In button. SCREENS.md § 06.
 */
import { Pressable, View } from 'react-native';

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
    <View style={{ backgroundColor: surface.fill, borderRadius: radius.oneThing, padding: 22, gap: 14 }}>
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

      <Text token="h1" testID="one-thing-title">
        {title}
      </Text>

      {done ? (
        <View
          testID="one-thing-done"
          style={{
            alignSelf: dir.isRTL ? 'flex-end' : 'flex-start',
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 6,
            backgroundColor: surface.white,
            borderRadius: radius.pill,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
        >
          <Icon name="check" size={14} strokeWidth={2.4} />
          <Text token="caption" weight="600">
            {t.doneToday}
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 7 }}>
            <Icon name="clock" size={15} color={ink.s4} strokeWidth={1.8} />
            <Text token="caption" color={ink.s4}>
              {t.focusMeta.replace('{n}', String(focusMinutes))}
            </Text>
          </View>

          <Button testID="lock-in" label={t.lockin} onPress={onLockIn} style={{ height: 54 }} />

          <Pressable testID="shrink-it" onPress={onShrink} accessibilityRole="button" hitSlop={8}>
            <Text token="caption" color={ink.s4} align="center">
              {t.stuckLink}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

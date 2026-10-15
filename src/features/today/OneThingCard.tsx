/**
 * Today's normal state: the One Thing card. SCREENS.md § 06.
 *
 * `#F3F2EE`, radius 26. Eyebrow + Edit, the title at 28/600, the focus
 * session line, Lock In, and the way out when it is too big to start.
 *
 * It is also the only thing in the app that links to Focus and Overwhelm.
 * The redesign dropped this card and left those two screens reachable only
 * from each other — a closed pair nothing else pointed at (BUILD-REVIEW.md
 * § 2.66). So the two links below are load-bearing, not decoration.
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
  /** What they said they would do today. */
  title: string;
  /** The focus session's length, as the meta line reads it. */
  focusMinutes: number;
  /** Done turns the button into a pill: there is nothing left to start. */
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
        gap: 14,
      }}
    >
      <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
        <Text token="eyebrow" color={ink.s4}>
          {t.h_k}
        </Text>
        {/* The only way to change your One Thing after the first run. */}
        <Pressable testID="one-thing-edit" onPress={onEdit} accessibilityRole="button" hitSlop={10}>
          <Text token="caption" weight="600" color={ink.s4}>
            {t.edit}
          </Text>
        </Pressable>
      </View>

      {/* 28 / 1.2, balanced — the same treatment the evening card gives its title. */}
      <BalancedText token="h1" lh={33.6}>
        {title}
      </BalancedText>

      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 6 }}>
        <Icon name="clock" size={14} color={ink.s4} strokeWidth={1.9} />
        <Text token="bodyS" color={ink.s4}>
          {t.focusMeta.replace('{n}', String(focusMinutes))}
        </Text>
      </View>

      {done ? (
        <View
          testID="one-thing-done"
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 54,
            borderRadius: radius.card,
            backgroundColor: surface.white,
          }}
        >
          <Icon name="check" size={16} strokeWidth={2.2} />
          <Text token="body" weight="600">
            {t.doneToday}
          </Text>
        </View>
      ) : (
        <>
          {/* Ink, not the primary green: SCREENS.md § 06 specifies ink here and
              the prototype renders it black. Button's primary is #008069. */}
          <Button
            testID="one-thing-lock-in"
            label={t.lockin}
            onPress={onLockIn}
            style={{ height: 54, backgroundColor: ink.base }}
          />
          <Pressable testID="one-thing-shrink" onPress={onShrink} accessibilityRole="button" hitSlop={8}>
            <Text token="bodyS" color={ink.s4} style={{ textAlign: 'center' }}>
              {t.stuckLink}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

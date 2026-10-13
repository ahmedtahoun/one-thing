/**
 * Two quiet lines on Today that protect the habit: the streak, worded to
 * encourage rather than to shame, and — only when reminders are off — the one
 * thing that makes the rest of the app unreliable, with a button to fix it.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ink, surface } from '@/design/tokens';
import { added } from '@/content/additions';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import type { Streak } from '@/lib/streak';

export function HabitRow({ streak, nudgesOff, onTurnOn }: { streak: Streak; nudgesOff: boolean; onTurnOn: () => void }) {
  const { lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).habit;

  const line =
    streak.current > 0
      ? streak.doneToday
        ? copy.streak.replace('{n}', String(streak.current))
        : copy.streakKeep.replace('{n}', String(streak.current))
      : streak.total > 0 && !streak.doneToday
        ? copy.streakFresh
        : null;

  if (!line && !nudgesOff) return null;
  return (
    <View style={{ gap: 8 }}>
      {line ? (
        <View testID="today-streak" style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
          <Icon name="star" size={15} color={streak.doneToday ? ink.base : ink.s4} strokeWidth={1.7} />
          <Text token="caption" color={streak.doneToday ? ink.base : ink.s3} weight={streak.doneToday ? '600' : '400'} style={{ flex: 1 }}>
            {line}
          </Text>
        </View>
      ) : null}
      {nudgesOff ? (
        <View
          testID="today-nudges-off"
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 10,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 14,
            backgroundColor: surface.langTrack,
          }}
        >
          <Text token="caption" style={{ flex: 1 }}>
            {copy.nudgesOff}
          </Text>
          <Pressable
            testID="today-nudges-on"
            onPress={onTurnOn}
            accessibilityRole="button"
            style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: ink.base }}
          >
            <Text token="caption" weight="600" color={surface.white}>
              {copy.nudgesTurnOn}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

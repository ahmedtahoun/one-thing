/**
 * Today's quick-action grid: 4 × 2 tiles, 76 pt tall, radius 18, filled with
 * the type's tile colour. SCREENS.md § 06.
 *
 * Routing (ACCEPTANCE § Core): Call / Email / WhatsApp open the contact picker
 * and then Compose; Remind opens Quick capture; the four event types open the
 * event form.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, radius, space, typeColour, type TaskType } from '@/design/tokens';
import { useLanguage } from '@/i18n/LanguageProvider';

/** Grid order, left to right then down, exactly as the design lays it out. */
export const QUICK_ACTION_ORDER: TaskType[] = [
  'call',
  'email',
  'whatsapp',
  'reminder',
  'visit',
  'meeting',
  'webinar',
  'course',
];

/** The grid is 4 x 2; rows are explicit so a tile can never wrap. */
const ROWS: TaskType[][] = [QUICK_ACTION_ORDER.slice(0, 4), QUICK_ACTION_ORDER.slice(4)];

export function QuickActions({ onPress }: { onPress: (type: TaskType) => void }) {
  const { t } = useLanguage();

  return (
    <View style={{ gap: 10 }}>
      <Text token="eyebrow" color={ink.s4}>
        {t.q_k}
      </Text>
      {/* The grid's own gap is 8 in both axes; the 10 above separates it
          from the eyebrow. */}
      <View style={{ gap: space.gridGap }}>
        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: space.gridGap }}>
            {row.map((type) => {
              const colour = typeColour[type];
              const label = type === 'reminder' ? t.q_rem : t.types[type];
              return (
                <Pressable
                  key={type}
                  testID={`quick-action-${type}`}
                  onPress={() => onPress(type)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 76,
                    borderRadius: radius.card,
                    backgroundColor: colour.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Icon name={TYPE_ICON[type]} size={22} color={colour.fg} strokeWidth={1.9} />
                  <Text token="micro" weight="600" color={colour.fg} align="center" numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

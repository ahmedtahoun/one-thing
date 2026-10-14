/**
 * Home's quick actions: four round buttons in one light row. Call / Email /
 * WhatsApp ask who in a sheet over Home (PickSheet) and go straight to the
 * draft; Remind opens Quick capture.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, typeColour, type TaskType } from '@/design/tokens';
import { useLanguage } from '@/i18n/LanguageProvider';

/**
 * The four things people do every day, in one row. The handoff has eight —
 * visit, meeting, webinar and course as well — but eight tiles is a menu to
 * choose from before anything is done. Those four types still exist and open
 * wherever they already are; only the way in from here is gone.
 */
export const QUICK_ACTION_ORDER: TaskType[] = ['call', 'email', 'whatsapp', 'reminder'];

export function QuickActions({ onPress }: { onPress: (type: TaskType) => void }) {
  const { t } = useLanguage();

  return (
    <View testID="quick-actions" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {QUICK_ACTION_ORDER.map((type) => {
        const colour = typeColour[type];
        const label = type === 'reminder' ? t.q_rem : t.types[type];
        return (
          <Pressable
            key={type}
            testID={`quick-action-${type}`}
            onPress={() => onPress(type)}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colour.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={TYPE_ICON[type]} size={22} color={colour.fg} strokeWidth={1.9} />
            </View>
            <Text token="micro" weight="600" color={ink.s2} align="center" numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The "Add a task" sheet on Tasks. SCREENS.md § 07 — `08-tasks-add-sheet.png`.
 *
 * Same eight actions as Today's quick-action grid, in the same order, but as
 * 58 pt tiles with the label beneath rather than inside. "Or just say it"
 * goes to Quick capture.
 */
import { Pressable, View } from 'react-native';

import { QUICK_ACTION_ORDER } from '@/features/today/QuickActions';
import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, radius, space, surface, typeColour, type TaskType } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

const ROWS: TaskType[][] = [QUICK_ACTION_ORDER.slice(0, 4), QUICK_ACTION_ORDER.slice(4)];

export function AddSheet({
  open,
  onClose,
  onPick,
  onVoice,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: TaskType) => void;
  onVoice: () => void;
}) {
  const { t, evx, a11y } = useLanguage();
  const dir = useDirection();

  return (
    <Sheet
      testID="add-sheet"
      open={open}
      onClose={onClose}
      padding={{ paddingTop: 12, paddingHorizontal: space.screenX, paddingBottom: 40 }}
      gap={18}
    >
      <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'center' }}>
        <Text token="h3" size={20}>
          {evx.addT}
        </Text>
        <Pressable
          testID="add-sheet-close"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={a11y.close}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: surface.fill,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="x" size={18} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={{ gap: 14 }}>
        {ROWS.map((row, i) => (
          <View key={i} style={{ flexDirection: dir.row, gap: space.gridGap }}>
            {row.map((type) => {
              const colour = typeColour[type];
              const label = type === 'reminder' ? t.q_rem : t.types[type];
              return (
                <Pressable
                  key={type}
                  testID={`add-${type}`}
                  onPress={() => onPick(type)}
                  accessibilityRole="button"
                  style={{ flex: 1, alignItems: 'center', gap: 8 }}
                >
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: radius.card,
                      backgroundColor: colour.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={TYPE_ICON[type]} size={22} color={colour.fg} strokeWidth={1.9} />
                  </View>
                  <Text token="micro" weight="500" align="center" numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Pressable
        testID="add-sheet-voice"
        onPress={onVoice}
        accessibilityRole="button"
        style={{
          height: 52,
          borderRadius: 26,
          borderWidth: 1.5,
          borderColor: surface.line,
          flexDirection: dir.row,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Icon name="mic" size={18} color={ink.base} strokeWidth={1.9} />
        <Text token="body" weight="500">
          {evx.addVoice}
        </Text>
      </Pressable>
    </Sheet>
  );
}

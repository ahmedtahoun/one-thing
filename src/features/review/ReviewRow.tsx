/**
 * One promise in the evening review: Kept · Tomorrow · ✕ Not needed.
 * SCREENS.md § 20.
 *
 * The mark is a decision, not an action — nothing happens to the task until
 * "Close the day".
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, radius, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import type { Task } from '@/lib/model-types';

/** What the person decided about a promise, before anything acts on it. */
export type ReviewMark = 'kept' | 'tomorrow' | 'dropped';

export function ReviewRow({
  task,
  mark,
  onMark,
}: {
  task: Task;
  mark: ReviewMark | null;
  onMark: (mark: ReviewMark) => void;
}) {
  const { t, inline } = useLanguage();
  const dir = useDirection();
  const colour = typeColour[task.type];
  const dropped = mark === 'dropped';

  return (
    <View
      testID={`review-row-${task.id}`}
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: surface.line,
        borderRadius: radius.input,
      }}
    >
      <Icon name={TYPE_ICON[task.type]} size={18} color={colour.fg} strokeWidth={1.9} />
      <Text token="bodyS" weight="500" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
        {task.title}
      </Text>

      <Pill label={t.kept} on={mark === 'kept'} onPress={() => onMark('kept')} testID={`review-keep-${task.id}`} />
      <Pill label={t.tomorrow} on={mark === 'tomorrow'} onPress={() => onMark('tomorrow')} testID={`review-move-${task.id}`} />

      <Pressable
        testID={`review-drop-${task.id}`}
        onPress={() => onMark('dropped')}
        accessibilityRole="button"
        accessibilityLabel={inline.notNeeded}
        accessibilityState={{ selected: dropped }}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: dropped ? ink.base : surface.line,
          backgroundColor: dropped ? ink.base : surface.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="x" size={14} color={dropped ? surface.white : ink.s4} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

function Pill({
  label,
  on,
  onPress,
  testID,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: ink.base,
        backgroundColor: on ? ink.base : surface.white,
      }}
    >
      <Text token="micro" color={on ? surface.white : ink.base}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * One row in the Tasks list. SCREENS.md § 07.
 *
 * Three columns: an 82 pt time column that is itself a button (it opens the
 * reminder sheet), the title and its meta line, and a 54 pt check column.
 * Unlike Today's row this one does not swipe — the time column needs the
 * horizontal gesture.
 */
import { clockOf } from '@/lib/clock-format';
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, radius, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { isOverdue, type Task } from '@/lib/model-types';
import { remindTinyLabel } from '@/lib/reminders';
import { dayLabel } from '@/lib/task-labels';

/**
 * `later` rows swap their two left-hand lines: the day ("Mon 13") sits where
 * the time normally does, and the time moves to the line below.
 */
export type RowMode = 'normal' | 'later';

export function TaskListRow({
  task,
  mode,
  faded,
  now,
  onOpen,
  onToggle,
  onReminder,
}: {
  task: Task;
  mode: RowMode;
  /** True for the moment after it is ticked, while it holds its place. */
  faded: boolean;
  now: Date;
  onOpen: () => void;
  onToggle: () => void;
  onReminder: () => void;
}) {
  const { t, inline } = useLanguage();
  const dir = useDirection();
  const colour = typeColour[task.type];
  const done = task.status === 'done';
  const later = mode === 'later';

  // A later row puts the day where the time goes, and the time underneath.
  const lead = later && task.dueAt ? dayLabel(task.dueAt, t) : clockOf(task.dueAt);
  const hasReminder = task.remind !== null;
  const mini = later ? clockOf(task.dueAt) : remindTinyLabel(t, task.remind);
  const miniColour = later ? ink.s4 : typeColour.reminder.fg;

  const pill = done
    ? null
    : task.status === 'snoozed'
      ? { label: inline.snoozed, bg: typeColour.reminder.bg, fg: status.snoozeFg }
      : !later && isOverdue(task, now)
        ? { label: inline.overdue, bg: status.dangerBg, fg: status.overdueFg }
        : null;

  return (
    <View
      testID={`task-row-${task.id}`}
      style={{
        flexDirection: dir.row,
        alignItems: 'stretch',
        backgroundColor: surface.fill2,
        borderRadius: radius.input,
        opacity: faded ? 0.45 : 1,
      }}
    >
      <Pressable
        testID={`task-reminder-${task.id}`}
        onPress={onReminder}
        accessibilityRole="button"
        accessibilityLabel={t.rem_t}
        style={{
          width: 82,
          paddingVertical: 12,
          paddingStart: 12,
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 3,
        }}
      >
        {/* A bare "10:00" needs no LTR island — digits and the colon form
            their own run inside Arabic text. A later row's lead is Arabic
            words, so forcing LTR here would be wrong. */}
        <Text token="bodyS" weight="600" tabular numberOfLines={1}>
          {lead}
        </Text>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 3 }}>
          {/* A reminder shows a solid bell in reminder purple; a task without
              one still shows a faint bell, which is what makes the row's
              time column look tappable. A later row shows neither. */}
          {hasReminder ? (
            <Icon name="bell" size={11} color={typeColour.reminder.fg} strokeWidth={2.4} />
          ) : later ? null : (
            <Icon name="bell" size={11} color={ink.s7} strokeWidth={2} />
          )}
          {mini ? (
            <Text
              token="tab"
              weight="600"
              color={miniColour}
              numberOfLines={1}
              style={{ letterSpacing: 0 }}
            >
              {mini}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        testID={`task-open-${task.id}`}
        onPress={onOpen}
        accessibilityRole="button"
        style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 6, justifyContent: 'center', gap: 3 }}
      >
        <Text
          token="body"
          weight="500"
          numberOfLines={1}
          color={done ? ink.muted : ink.base}
          style={done ? { textDecorationLine: 'line-through' } : undefined}
        >
          {task.title}
        </Text>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 5, minWidth: 0 }}>
          {pill ? (
            <View style={{ backgroundColor: pill.bg, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 7 }}>
              <Text token="eyebrow" weight="600" color={pill.fg} style={{ letterSpacing: 0 }}>
                {pill.label}
              </Text>
            </View>
          ) : null}
          <Icon name={TYPE_ICON[task.type]} size={13} color={colour.fg} strokeWidth={2.2} />
          {task.who ? (
            <Text token="micro" color={ink.s4} numberOfLines={1} style={{ flexShrink: 1 }}>
              {task.who}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        testID={`task-check-${task.id}`}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        style={{ width: 54, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1.5,
            borderColor: done ? ink.solid : ink.s6,
            backgroundColor: done ? ink.solid : surface.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done ? <Icon name="check" size={14} color={surface.white} strokeWidth={2.4} /> : null}
        </View>
      </Pressable>
    </View>
  );
}

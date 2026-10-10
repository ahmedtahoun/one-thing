/**
 * The reminder sheet, opened by tapping a task row's time column.
 * SCREENS.md § 07.
 *
 * SCREENS summarises the options as "At time · 10 min before · 1 hr before ·
 * custom date/time · None". The handoff's own copy (app-content.js → remOpts)
 * carries two more — "30 minutes before" and "Morning of · 08:00" — so all
 * five are offered, plus None and the custom picker.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { ink, radius, space, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import type { RemindOffset, Task } from '@/lib/model-types';
import { remindOptionLabel, SHEET_OFFSETS } from '@/lib/reminders';
import { whenLabel } from '@/lib/task-labels';
import { timeLabel } from '@/lib/model-types';

export function ReminderSheet({
  task,
  now,
  onClose,
  onPick,
  onCustom,
}: {
  /** Null when the sheet is closed. */
  task: Task | null;
  now: Date;
  onClose: () => void;
  /** Null clears the reminder. */
  onPick: (offset: RemindOffset | null) => void;
  onCustom: () => void;
}) {
  const { t, inline } = useLanguage();
  const dir = useDirection();

  const subtitle = task ? `${task.title} · ${whenLabel(task, t, inline, now) || timeLabel(task.dueAt)}` : '';

  const options: { key: string; label: string; chosen: boolean; pick: () => void }[] = task
    ? [
        ...SHEET_OFFSETS.map((offset) => ({
          key: offset,
          label: remindOptionLabel(t, offset),
          chosen: task.remind === offset,
          pick: () => onPick(offset),
        })),
        { key: 'none', label: t.remNone, chosen: task.remind === null, pick: () => onPick(null) },
      ]
    : [];

  return (
    <Sheet
      testID="reminder-sheet"
      open={task !== null}
      onClose={onClose}
      scrimOpacity={0.32}
      handleColour={surface.handle}
      padding={{ paddingTop: 10, paddingHorizontal: space.screenX, paddingBottom: 40 }}
      gap={14}
    >
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.small,
            backgroundColor: typeColour.reminder.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="bell" size={18} color={typeColour.reminder.fg} strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text token="h3" size={21}>
            {t.rem_t}
          </Text>
          <Text token="caption" color={ink.s4} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={{ borderWidth: 1, borderColor: surface.line, borderRadius: radius.cardTight, overflow: 'hidden' }}>
        {options.map((option) => (
          <Pressable
            key={option.key}
            testID={`reminder-${option.key}`}
            onPress={option.pick}
            accessibilityRole="button"
            accessibilityState={{ selected: option.chosen }}
            style={{
              height: 50,
              paddingHorizontal: 16,
              flexDirection: dir.row,
              alignItems: 'center',
              justifyContent: 'space-between',
              // Every row carries the divider, the last one included — that
              // is what the prototype draws, and it shows as a hairline just
              // inside the rounded bottom edge (BUILD-REVIEW.md §2.15).
              borderBottomWidth: 1,
              borderBottomColor: surface.lineSoft,
            }}
          >
            <Text token="body">{option.label}</Text>
            {option.chosen ? (
              <Icon
                name="check"
                size={18}
                color={option.key === 'none' ? ink.base : typeColour.reminder.fg}
                strokeWidth={2.4}
              />
            ) : null}
          </Pressable>
        ))}
      </View>

      <Pressable
        testID="reminder-custom"
        onPress={onCustom}
        accessibilityRole="button"
        style={{
          height: 50,
          borderRadius: 25,
          borderWidth: 1,
          borderColor: ink.base,
          flexDirection: dir.row,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Icon name="clock" size={15} strokeWidth={1.7} />
        <Text token="body">{t.remCustom}</Text>
      </Pressable>
    </Sheet>
  );
}

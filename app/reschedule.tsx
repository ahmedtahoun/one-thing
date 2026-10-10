/**
 * Reschedule — the sheet behind "swipe left" on a task, the clock button on
 * Up next, and the reminder sheet's "Pick a date & time".
 *
 * SCREENS.md never gives it a number of its own: § 06 and § 07 reach it, and
 * § 07 describes its calendar as part of the reminder sheet. It is built as
 * its own route because three screens open it.
 *
 * One sheet, two jobs. `mode=move` changes when the task is due; `mode=remind`
 * sets a custom reminder and leaves the task where it is. The title and the
 * button say which.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Calendar } from '@/features/reschedule/Calendar';
import { Sheet } from '@/ui/Sheet';
import { LTRText, Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { ink, radius, space, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { dateKey, timeLabel } from '@/lib/model-types';
import { dayLabel } from '@/lib/task-labels';
import { useTasks } from '@/lib/tasks';

/** Half-hours from 08:00 to 21:30, as the prototype builds them. */
const TIMES = Array.from({ length: 14 * 2 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  return `${String(hour).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

const PAST = '#CFCFCB';

export default function Reschedule() {
  const { t } = useLanguage();
  const dir = useDirection();
  const { tasks, updateTask } = useTasks();
  const toast = useToast();

  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const remindMode = params.mode === 'remind';
  const task = tasks.find((candidate) => candidate.id === params.id) ?? null;

  const [now] = useState(() => new Date());
  const [selected, setSelected] = useState(() => (task?.dueAt ? new Date(task.dueAt) : new Date(now)));
  const [view, setView] = useState(() => ({ year: selected.getFullYear(), month: selected.getMonth() }));
  const [time, setTime] = useState(() => (task?.dueAt ? timeLabel(task.dueAt) : '10:00'));

  const isToday = dateKey(selected) === dateKey(now);
  const nowLabel = timeLabel(now.toISOString());

  /** "Today", "Tomorrow", or "Mon 13" — what the button and toast say. */
  const whenLabel = useMemo(() => {
    const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    if (isToday) return t.today;
    if (dateKey(selected) === tomorrow) return t.tmw;
    return dayLabel(selected.toISOString(), t);
  }, [isToday, selected, now, t]);

  const pickQuick = useCallback(
    (offsetDays: number, at: string) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
      setSelected(date);
      setView({ year: date.getFullYear(), month: date.getMonth() });
      setTime(at);
    },
    [now]
  );

  const close = useCallback(() => router.back(), []);

  const apply = useCallback(() => {
    if (!task) return close();
    const [hour = '10', minute = '00'] = time.split(':');
    const at = new Date(selected);
    at.setHours(Number(hour), Number(minute), 0, 0);
    const label = `${whenLabel} · ${time}`;

    if (remindMode) {
      // A custom reminder moves the reminder, never the task.
      updateTask(task.id, { remind: 'custom', remindAt: at.toISOString() });
      toast.show(t.toastRem.replace('{w}', label), { undo: false });
    } else {
      updateTask(task.id, { dueAt: at.toISOString(), status: 'open', snoozedUntil: null });
      toast.show(t.toastMoved.replace('{w}', label), { undo: false });
    }
    close();
  }, [task, time, selected, whenLabel, remindMode, updateTask, toast, t, close]);

  return (
    <>
      <Sheet
        testID="reschedule-sheet"
        open
        onClose={close}
        scrimOpacity={0.32}
        handleColour={surface.handle}
        padding={{ paddingTop: 10, paddingHorizontal: space.screenX, paddingBottom: 40 }}
        gap={14}
      >
        <View style={{ gap: 2 }}>
          <Text token="h3" size={21}>
            {remindMode ? t.r_remT : t.r_t}
          </Text>
          <Text token="caption" color={ink.s4} numberOfLines={1}>
            {task ? `${task.title} · ${t.types[task.type]}` : ''}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -space.screenX, flexGrow: 0 }}
          contentContainerStyle={{ flexDirection: dir.row, gap: 6, paddingHorizontal: space.screenX }}
        >
          {t.rQuick.map(([label, offset, at]) => {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(offset));
            const on = dateKey(date) === dateKey(selected) && time === at;
            return (
              <Pressable
                key={String(label)}
                testID={`reschedule-quick-${at}`}
                onPress={() => pickQuick(Number(offset), String(at))}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  height: 36,
                  paddingHorizontal: 13,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: on ? ink.base : surface.line,
                  backgroundColor: on ? ink.base : surface.white,
                  justifyContent: 'center',
                }}
              >
                <Text token="caption" color={on ? surface.white : ink.base} numberOfLines={1}>
                  {String(label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Calendar view={view} selected={selected} today={now} onView={setView} onSelect={setSelected} />

        <View style={{ gap: 8 }}>
          <Text token="body" weight="600">
            {t.r_time}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -space.screenX, flexGrow: 0 }}
            contentContainerStyle={{ flexDirection: dir.row, gap: 6, paddingHorizontal: space.screenX, paddingBottom: 2 }}
          >
            {TIMES.map((slot) => {
              // An hour that has already passed today cannot be chosen.
              const gone = isToday && slot <= nowLabel;
              const on = slot === time;
              return (
                <Pressable
                  key={slot}
                  testID={`reschedule-time-${slot}`}
                  onPress={gone ? undefined : () => setTime(slot)}
                  disabled={gone}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: gone }}
                  style={{
                    width: 64,
                    height: 40,
                    borderRadius: radius.small,
                    borderWidth: 1.5,
                    borderColor: on ? ink.base : surface.line,
                    backgroundColor: on ? ink.base : surface.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LTRText token="bodyS" tabular align="center" color={on ? surface.white : gone ? PAST : ink.base}>
                    {slot}
                  </LTRText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <Pressable
          testID="reschedule-apply"
          onPress={apply}
          accessibilityRole="button"
          style={{
            height: 54,
            borderRadius: 27,
            backgroundColor: ink.base,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          <Text token="bodyL" weight="500" color={surface.white}>
            {(remindMode ? t.r_remApply : t.r_move).replace('{d}', whenLabel).replace('{t}', time)}
          </Text>
        </Pressable>
      </Sheet>
      <Toast />
    </>
  );
}

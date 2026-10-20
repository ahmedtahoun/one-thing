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
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { added } from '@/content/additions';
import { Calendar } from '@/features/reschedule/Calendar';
import { Sheet } from '@/ui/Sheet';
import { LTRText, Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { fontFamily, ink, radius, space, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { nextSlot, parseClock } from '@/lib/clock';
import { onDay, toDay } from '@/lib/arabic-day';
import { clockFromHHMM } from '@/lib/clock-format';
import { dateKey, timeLabel } from '@/lib/model-types';
import { dayLabel } from '@/lib/task-labels';
import { useTasks } from '@/lib/tasks';
import { bleed } from '@/ui/bleed';

/** Half-hours from 08:00 to 21:30, as the prototype builds them. */
const TIMES = Array.from({ length: 14 * 2 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  return `${String(hour).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

export default function Reschedule() {
  const { t, lang } = useLanguage();
  const dir = useDirection();
  const { tasks, updateTask } = useTasks();
  const toast = useToast();

  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const remindMode = params.mode === 'remind';
  const task = tasks.find((candidate) => candidate.id === params.id) ?? null;

  const [now] = useState(() => new Date());
  // Open on the task's own time while that is still ahead; otherwise on the
  // next half hour, never on a time that has already gone.
  const [start] = useState(() => {
    if (task?.dueAt && new Date(task.dueAt).getTime() > now.getTime()) {
      return { date: new Date(task.dueAt), time: timeLabel(task.dueAt) };
    }
    const slot = nextSlot(timeLabel(now.toISOString()));
    return { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + slot.dayOffset), time: slot.time };
  });
  const [selected, setSelected] = useState(start.date);
  const [view, setView] = useState(() => ({ year: selected.getFullYear(), month: selected.getMonth() }));
  const [time, setTime] = useState(start.time);
  // What is in the "type a time" box; the chips and the box feed the same `time`.
  const [custom, setCustom] = useState('');

  const isToday = dateKey(selected) === dateKey(now);
  const nowLabel = timeLabel(now.toISOString());
  const timeGone = isToday && time <= nowLabel;
  const typed = parseClock(custom);
  const customBad = custom.trim() !== '' && (typed === null || (isToday && typed <= nowLabel));

  const onCustom = useCallback(
    (text: string) => {
      setCustom(text);
      const parsed = parseClock(text);
      if (parsed && !(isToday && parsed <= nowLabel)) setTime(parsed);
    },
    [isToday, nowLabel]
  );

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
    if (timeGone) return;
    const [hour = '10', minute = '00'] = time.split(':');
    const at = new Date(selected);
    at.setHours(Number(hour), Number(minute), 0, 0);
    // Arabic joins the day to the sentence: لليوم, للجمعة, الجمعة (see arabic-day.ts).
    const clock = clockFromHHMM(time);
    const label = `${lang === 'ar' ? onDay(whenLabel, t.wk) : whenLabel} · ${clock}`;
    const moveLabel = `${lang === 'ar' ? toDay(whenLabel, t.wk) : whenLabel} · ${clock}`;

    if (remindMode) {
      // A custom reminder moves the reminder, never the task.
      updateTask(task.id, { remind: 'custom', remindAt: at.toISOString() });
      toast.show(t.toastRem.replace('{w}', label), { undo: false });
    } else {
      updateTask(task.id, { dueAt: at.toISOString(), status: 'open', snoozedUntil: null });
      toast.show(t.toastMoved.replace(lang === 'ar' ? 'لـ{w}' : '{w}', '{w}').replace('{w}', moveLabel), { undo: false });
    }
    close();
  }, [task, time, timeGone, selected, whenLabel, remindMode, updateTask, toast, t, close, lang]);

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
          style={{ ...bleed(dir.isRTL, space.screenX).style, flexGrow: 0 }}
          contentContainerStyle={{ flexDirection: dir.row, gap: 6, ...bleed(dir.isRTL, space.screenX).content }}
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
                  borderColor: on ? ink.solid : surface.line,
                  backgroundColor: on ? ink.solid : surface.white,
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
            style={{ ...bleed(dir.isRTL, space.screenX).style, flexGrow: 0 }}
            contentContainerStyle={{ flexDirection: dir.row, gap: 6, ...bleed(dir.isRTL, space.screenX).content, paddingBottom: 2 }}
          >
            {TIMES.map((slot) => {
              // An hour that has already passed today cannot be chosen.
              const gone = isToday && slot <= nowLabel;
              const on = slot === time;
              return (
                <Pressable
                  key={slot}
                  testID={`reschedule-time-${slot}`}
                  onPress={
                    gone
                      ? undefined
                      : () => {
                          setTime(slot);
                          setCustom('');
                        }
                  }
                  disabled={gone}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: gone }}
                  style={{
                    minWidth: 80,
                    paddingHorizontal: 8,
                    height: 40,
                    borderRadius: radius.small,
                    borderWidth: 1.5,
                    borderColor: on ? ink.solid : surface.line,
                    backgroundColor: on ? ink.solid : surface.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LTRText token="bodyS" tabular align="center" color={on ? surface.white : gone ? ink.s7 : ink.base}>
                    {clockFromHHMM(slot)}
                  </LTRText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 10 }}>
            <Text token="bodyS" color={ink.s4}>
              {added(lang).customTime}
            </Text>
            <TextInput
              testID="reschedule-custom-time"
              value={custom}
              onChangeText={onCustom}
              placeholder={clockFromHHMM('17:45')}
              placeholderTextColor={ink.s5}
              keyboardType="numbers-and-punctuation"
              maxLength={8}
              returnKeyType="done"
              autoCorrect={false}
              style={{
                width: 96,
                height: 40,
                borderRadius: radius.small,
                borderWidth: 1.5,
                borderColor: customBad ? status.invalid : custom && typed ? ink.solid : surface.line,
                paddingHorizontal: 12,
                fontFamily: `${fontFamily}_400Regular`,
                fontSize: 16,
                color: ink.base,
                textAlign: 'center',
                writingDirection: 'ltr',
              }}
            />
          </View>
          {customBad ? (
            <Text token="micro" color={status.invalid} testID="reschedule-custom-bad">
              {typed === null ? added(lang).customTimeBad : added(lang).customTimePast}
            </Text>
          ) : null}
        </View>

        <Pressable
          testID="reschedule-apply"
          onPress={apply}
          disabled={timeGone}
          accessibilityRole="button"
          style={{
            height: 54,
            borderRadius: 27,
            backgroundColor: timeGone ? ink.disabledBtn : ink.solid,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          <Text token="bodyL" weight="500" color={surface.white}>
            {(remindMode ? t.r_remApply : t.r_move).replace(lang === 'ar' && !remindMode ? 'لـ{d}' : '{d}', '{d}').replace('{d}', lang === 'ar' ? (remindMode ? onDay(whenLabel, t.wk) : toDay(whenLabel, t.wk)) : whenLabel).replace('{t}', clockFromHHMM(time))}
          </Text>
        </Pressable>
      </Sheet>
      <Toast />
    </>
  );
}

/**
 * 20 · Daily review. SCREENS.md § 20.
 *
 * "Nothing moves automatically" is the rule the screen is built around: every
 * open task gets a mark — Kept, Tomorrow, or Not needed — and the marks are
 * only applied when "Close the day" is pressed. Until then nothing in the
 * task list has changed.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { recordReview } from '@/lib/activity';
import { track } from '@/lib/analytics/track';
import { ReviewRow, type ReviewMark } from '@/features/review/ReviewRow';
import { BackButton } from '@/ui/BackButton';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { dateKey, isOnDay, type Task } from '@/lib/model-types';
import { useTasks } from '@/lib/tasks';

/** SCREENS.md § 20: up to four, then "Show all". */
const VISIBLE_ROWS = 4;

export default function DailyReview() {
  const { t, inline, a11y } = useLanguage();
  const dir = useDirection();
  const { tasks, oneThing, setOneThingDone, patchMany } = useTasks();

  const [marks, setMarks] = useState<Record<string, ReviewMark>>({});
  const [showAll, setShowAll] = useState(false);
  const [closed, setClosed] = useState(false);

  const today = dateKey();
  const todaysTasks = useMemo(
    () =>
      tasks
        .filter((task) => isOnDay(task, today) && task.status !== 'cancelled')
        // By time, so the day reads back in the order it happened.
        .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')),
    [tasks, today]
  );
  const open = useMemo(() => todaysTasks.filter((task) => task.status !== 'done'), [todaysTasks]);

  /** A finished task counts as kept without being marked. */
  const markFor = useCallback(
    (task: Task): ReviewMark | null => marks[task.id] ?? (task.status === 'done' ? 'kept' : null),
    [marks]
  );

  const keptCount = todaysTasks.filter((task) => markFor(task) === 'kept').length;
  const summary = t.rv_sum
    .replace('{a}', String(keptCount))
    .replace('{b}', String(todaysTasks.length));

  const visible = showAll ? open : open.slice(0, VISIBLE_ROWS);

  const setMark = useCallback((id: string, mark: ReviewMark) => {
    setMarks((current) => ({ ...current, [id]: mark }));
  }, []);

  /** "Rest → tomorrow": everything not already decided. */
  const restToTomorrow = useCallback(() => {
    setMarks((current) => {
      const next = { ...current };
      for (const task of open) if (!next[task.id]) next[task.id] = 'tomorrow';
      return next;
    });
  }, [open]);

  /**
   * The one place anything moves. The prototype collects these marks and
   * then discards them — closing the day only flips a flag there — but a
   * screen that asks "Kept or Tomorrow?" and then does neither is theatre.
   * BUILD-REVIEW.md §2.29.
   */
  const closeDay = useCallback(() => {
    patchMany(Object.keys(marks), (task) => {
      const mark = marks[task.id];
      if (mark === 'kept') return { status: 'done' as const };
      if (mark === 'dropped') return { status: 'cancelled' as const };
      const at = new Date(task.dueAt ?? Date.now());
      at.setDate(at.getDate() + 1);
      return { dueAt: at.toISOString() };
    });
    // One per task the user confirmed they kept, which `toggleDone` cannot
    // see: closing the day marks several at once through `patchMany`.
    for (const mark of Object.values(marks)) if (mark === 'kept') track({ name: 'task_done' });
    track({ name: 'review_closed' });
    recordReview({
      date: today,
      // The screen shows "Not yet" as chosen until Yes is pressed, so a One
      // Thing that is not done is the answer "not yet" rather than no answer.
      oneThingDone: oneThing ? oneThing.done : null,
      closedAt: new Date().toISOString(),
      items: Object.entries(marks).map(([taskId, mark]) => ({ taskId, decision: mark === 'dropped' ? 'drop' : mark })),
    });
    setClosed(true);
  }, [marks, patchMany, today, oneThing]);

  if (closed) {
    return (
      <Screen paddingX={24} paddingTop={0} paddingBottom={60} style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: ink.solid,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="moon" size={18} color={surface.white} strokeWidth={1.7} />
        </View>
        <Text token="h1" align="center">
          {t.rv_end}
        </Text>
        <Text token="bodyL" color={ink.s3} align="center">
          {t.rv_end2}
        </Text>
        <Text token="caption" color={ink.s4} align="center" style={{ marginTop: 6 }}>
          {summary}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll paddingTop={4} paddingBottom={44} style={{ gap: 20 }}>
      <BackButton testID="review-back" onPress={() => router.back()} />

      <View style={{ gap: 8 }}>
        <Text token="eyebrow" color={ink.s4}>
          {t.rv_k}
        </Text>
        <Text token="h1">{t.rv_t}</Text>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: surface.line,
          borderRadius: radius.card,
          padding: 16,
          gap: 12,
        }}
      >
        <Text token="micro" color={ink.s4}>
          {t.rv_one}
        </Text>
        <Text token="bodyL" size={18} weight="600">
          {oneThing?.title ?? ''}
        </Text>
        <View style={{ flexDirection: dir.row, gap: 8 }}>
          <Choice label={t.yes} testID="review-one-done" on={oneThing?.done === true} onPress={() => setOneThingDone(true)} />
          <Choice label={t.notYet} testID="review-one-not-yet" on={oneThing?.done === false} onPress={() => setOneThingDone(false)} />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: dir.row, justifyContent: 'space-between' }}>
          <Text token="body" weight="600">
            {t.rv_list}
          </Text>
          <Text token="caption" color={ink.s4}>
            {summary}
          </Text>
        </View>

        {visible.map((task) => (
          <ReviewRow key={task.id} task={task} mark={markFor(task)} onMark={(mark) => setMark(task.id, mark)} />
        ))}

        <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'center' }}>
          {/* An empty slot rather than nothing, so "Rest → tomorrow" is still
              pushed to the far end when there is no "Show all". The
              prototype uses `margin-inline-start: auto` for this; that maps
              to the wrong side in Arabic here and left the two labels
              touching. */}
          {!showAll && open.length > VISIBLE_ROWS ? (
            <Pressable testID="review-show-all" onPress={() => setShowAll(true)} accessibilityRole="button" style={{ paddingVertical: 6 }}>
              <Text token="caption" color={ink.s3}>
                {inline.showAll}
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            testID="review-rest-tomorrow"
            onPress={restToTomorrow}
            accessibilityRole="button"
            style={{ paddingVertical: 6 }}
          >
            <Text token="caption" weight="600">
              {inline.restToTomorrow}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <Pressable
        testID="review-close-day"
        onPress={closeDay}
        accessibilityRole="button"
        style={{
          height: 56,
          borderRadius: radius.button,
          backgroundColor: ink.solid,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text token="title" weight="500" color={surface.white}>
          {t.rv_close}
        </Text>
      </Pressable>
    </Screen>
  );
}

/** One of the two 44 pt answers under the One Thing. */
function Choice({
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
        flex: 1,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: ink.base,
        backgroundColor: on ? ink.solid : surface.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text token="bodyS" color={on ? surface.white : ink.base}>
        {label}
      </Text>
    </Pressable>
  );
}

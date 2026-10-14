/**
 * The "All" views on Home: everything on the list, grouped by when, narrowed
 * by the channel buttons (Call, Email, WhatsApp, Reminder) or showing what is
 * Done. SCREENS.md § 07.
 *
 * What makes it more than a list is the "Up next" card, the bulk "Add
 * reminders to these" hint, and the reminder sheet behind each row's time
 * column. The title, the Add button and the buttons that choose the view are
 * Home's own, above this.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { buildTaskGroups, type GroupAction, type TaskFilter } from '@/features/tasks/groups';
import { ReminderSheet } from '@/features/tasks/ReminderSheet';
import { TaskListRow } from '@/features/tasks/TaskListRow';
import { UpNextCard } from '@/features/tasks/UpNextCard';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { ink, motion, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import type { Task } from '@/lib/model-types';
import { remindAt, remindShortLabel } from '@/lib/reminders';
import { useTasks } from '@/lib/tasks';

export function AllTasks({ filter, now }: { filter: TaskFilter; now: Date }) {
  const { t, theme } = useLanguage();
  const dir = useDirection();
  const { tasks, toggleDone, updateTask, patchMany, restore } = useTasks();
  const toast = useToast();

  const [showLater, setShowLater] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [reminderFor, setReminderFor] = useState<string | null>(null);
  // Ticked a moment ago: the row stays where it is, faded, so the list does
  // not jump away from the finger before the eye has followed it.
  const [justDone, setJustDone] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
    };
  }, []);

  const { groups, upNext, progress, withoutReminder, empty } = useMemo(
    // The groups carry colours, so a change of theme builds them again.
    () => buildTaskGroups({ tasks, filter, now, justDone, showLater, showDone, t }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, filter, now, justDone, showLater, showDone, t, theme]
  );

  const onToggle = useCallback(
    (task: Task) => {
      const before = tasks;
      const next = toggleDone(task.id);
      if (next !== 'done') return;

      toast.show(t.toastDone, { undo: () => restore(before) });
      setJustDone((set) => new Set(set).add(task.id));
      timers.current.push(
        setTimeout(() => {
          setJustDone((set) => {
            const copy = new Set(set);
            copy.delete(task.id);
            return copy;
          });
        }, motion.doneRowLinger)
      );
    },
    [tasks, toggleDone, toast, t.toastDone, restore]
  );

  /** "Add reminders to these" — only tasks that have none are touched. */
  const addReminders = useCallback(() => {
    const before = tasks;
    const ids = withoutReminder.map((task) => task.id);
    patchMany(ids, (task) => ({ remind: 'at', remindAt: remindAt(task, 'at') }));
    toast.show(t.toastRemAll.replace('{n}', String(ids.length)), { undo: () => restore(before) });
  }, [tasks, withoutReminder, patchMany, toast, t.toastRemAll, restore]);

  const groupAction = useCallback(
    (kind: GroupAction, items: Task[]) => {
      if (kind === 'toggleLater') return setShowLater((v) => !v);
      if (kind === 'toggleDone') return setShowDone((v) => !v);

      const before = tasks;
      const ids = items.map((task) => task.id);
      patchMany(ids, (task) => {
        // Keep the time of day; move the day on by one.
        const at = new Date(task.dueAt as string);
        at.setDate(at.getDate() + 1);
        return { dueAt: at.toISOString(), remindAt: remindAt({ ...task, dueAt: at.toISOString() }) };
      });
      toast.show(t.toastMovedN.replace('{n}', String(ids.length)), { undo: () => restore(before) });
    },
    [tasks, patchMany, toast, t.toastMovedN, restore]
  );

  const setReminder = useCallback(
    (offset: Parameters<typeof remindAt>[1]) => {
      const task = tasks.find((candidate) => candidate.id === reminderFor);
      setReminderFor(null);
      if (!task) return;
      updateTask(task.id, { remind: offset, remindAt: remindAt(task, offset) });
      toast.show(offset ? t.toastRem.replace('{w}', remindShortLabel(t, offset)) : t.remNone, { undo: false });
    },
    [tasks, reminderFor, updateTask, toast, t]
  );

  const openTask = useCallback((task: Task) => router.push(`/compose?id=${task.id}`), []);
  const reminderTask = tasks.find((task) => task.id === reminderFor) ?? null;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 10 }}>
        <Text token="caption" color={ink.s4} tabular numberOfLines={1}>
          {t.tk_prog.replace('{a}', String(progress.done)).replace('{b}', String(progress.total))}
        </Text>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: surface.progressTrack, overflow: 'hidden' }}>
          <View
            testID="tasks-progress"
            style={{ height: '100%', width: `${percent}%`, borderRadius: 2, backgroundColor: ink.solid }}
          />
        </View>

        {withoutReminder.length > 0 && filter !== 'done' ? (
          <View style={{ flexDirection: dir.row, alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Icon name="bell" size={14} color={ink.s5} strokeWidth={1.9} />
            <Text token="caption" color={ink.s4}>
              {t.noRemB.replace('{n}', String(withoutReminder.length))}
            </Text>
            <Pressable
              testID="tasks-remind-all"
              onPress={addReminders}
              accessibilityRole="button"
              hitSlop={6}
              style={{ paddingVertical: 6 }}
            >
              <Text token="caption" weight="600" color={typeColour.reminder.fg}>
                {t.remAll}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {upNext ? (
        <UpNextCard
          task={upNext}
          now={now}
          onOpen={() => openTask(upNext)}
          onReschedule={() => router.push(`/reschedule?id=${upNext.id}`)}
          onToggle={() => onToggle(upNext)}
        />
      ) : null}

      {groups.map((group) => {
        const action = group.action;
        return (
          <View key={group.key} style={{ gap: 6 }}>
            <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8, minHeight: 32, paddingHorizontal: 2 }}>
              <Text token="caption" weight="600" color={group.colour ?? ink.base}>
                {group.label}
              </Text>
              <Text token="micro" color={ink.s5}>
                {group.items.length}
              </Text>
              <View style={{ flex: 1 }} />
              {action ? (
                <Pressable
                  testID={`group-action-${group.key}`}
                  onPress={() => groupAction(action.kind, group.items)}
                  accessibilityRole="button"
                  hitSlop={6}
                  style={{ paddingVertical: 6 }}
                >
                  <Text token="caption" weight="600" color={action.colour}>
                    {action.label}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {group.open
              ? group.items.map((task) => (
                  <TaskListRow
                    key={task.id}
                    task={task}
                    mode={group.mode}
                    faded={justDone.has(task.id)}
                    now={now}
                    onOpen={() => openTask(task)}
                    onToggle={() => onToggle(task)}
                    onReminder={() => setReminderFor(task.id)}
                  />
                ))
              : null}
          </View>
        );
      })}

      {empty ? (
        <View testID="tasks-empty" style={{ paddingVertical: 40, paddingHorizontal: 10 }}>
          <Text token="bodyS" color={ink.s4} align="center">
            {t.tk_empty}
          </Text>
        </View>
      ) : null}

      <ReminderSheet
        task={reminderTask}
        now={now}
        onClose={() => setReminderFor(null)}
        onPick={setReminder}
        onCustom={() => {
          const id = reminderFor;
          setReminderFor(null);
          if (id) router.push(`/reschedule?id=${id}&mode=remind`);
        }}
      />
    </View>
  );
}

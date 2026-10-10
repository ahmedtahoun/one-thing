/**
 * Tasks and the day's One Thing.
 *
 * Held in React state and mirrored to device storage, behind one provider so
 * every screen reads the same list. The backend is not wired in yet; when it
 * is, only the persistence calls here change — screens talk to this hook, not
 * to storage or to Supabase.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { newId } from './ids';
import { dateKey, type OneThing, type Task } from './model-types';
import { remindAt } from './reminders';

const TASKS_KEY = 'ot.tasks';
const ONE_THING_KEY = 'ot.oneThing';

/** The focus length a One Thing gets when the caller does not pass Settings' own. */
const DEFAULT_FOCUS_MINUTES = 45;

type NewTask = Pick<Task, 'type' | 'title' | 'createdVia'> & Partial<Omit<Task, 'id' | 'createdAt'>>;

type TasksValue = {
  tasks: Task[];
  oneThing: OneThing | null;
  ready: boolean;
  addTask: (task: NewTask) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  /** Check-off and un-check. Returns the status it moved to. */
  toggleDone: (id: string) => 'open' | 'done';
  /**
   * Applies a patch to several tasks at once — the bulk actions on Tasks
   * ("Add reminders to these", "Move to tomorrow"). The patch is a function
   * so it can depend on the task, e.g. keeping its time while changing day.
   */
  patchMany: (ids: string[], patch: (task: Task) => Partial<Task>) => void;
  snooze: (id: string, until: string) => void;
  cancel: (id: string) => void;
  /** Replaces the whole list — used by Undo, which restores a snapshot. */
  restore: (tasks: Task[]) => void;
  setOneThing: (title: string, focusMinutes?: number) => void;
  setOneThingDone: (done: boolean) => void;
  /** Settings' default focus length also applies to today's One Thing. */
  setFocusMinutes: (minutes: number) => void;
  /** Everything gone, from memory and the device — Delete account. */
  reset: () => void;
  /**
   * For the sync engine only: applies what a sync decided against the lists
   * as they are now, which may have moved on while it ran.
   */
  applySync: (update: { tasks?: (current: Task[]) => Task[]; oneThing?: (current: OneThing | null) => OneThing | null }) => void;
};

const TasksContext = createContext<TasksValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [oneThing, setOneThingState] = useState<OneThing | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([AsyncStorage.getItem(TASKS_KEY), AsyncStorage.getItem(ONE_THING_KEY)])
      .then(([rawTasks, rawOne]) => {
        if (cancelled) return;
        if (rawTasks) {
          try {
            setTasks(JSON.parse(rawTasks) as Task[]);
          } catch {
            // A corrupt blob starts empty rather than crashing the app.
          }
        }
        if (rawOne) {
          try {
            const parsed = JSON.parse(rawOne) as OneThing;
            // Yesterday's One Thing does not carry over: a new day asks again
            // on the Morning priority screen (SCREENS.md § 05).
            if (parsed.date === dateKey()) setOneThingState(parsed);
          } catch {
            // Same again.
          }
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Every mutation goes through here, and it takes an updater rather than a
   * list so that two calls in the same event compose instead of the second
   * overwriting the first. Reading `tasks` from the closure and writing the
   * result looks fine and is not: add a task and then patch it, or apply
   * three groups of review marks in a row, and only the last call survives.
   */
  const persistTasks = useCallback((update: (current: Task[]) => Task[]) => {
    setTasks((current) => {
      const next = update(current);
      if (next === current) return current;
      AsyncStorage.setItem(TASKS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const persistOneThing = useCallback((next: OneThing | null | ((current: OneThing | null) => OneThing | null)) => {
    setOneThingState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      if (resolved === current) return current;
      if (resolved) AsyncStorage.setItem(ONE_THING_KEY, JSON.stringify(resolved)).catch(() => {});
      else AsyncStorage.removeItem(ONE_THING_KEY).catch(() => {});
      return resolved;
    });
  }, []);

  const addTask = useCallback<TasksValue['addTask']>(
    (input) => {
      const task: Task = {
        contactIds: [],
        dueAt: null,
        remind: null,
        status: 'open',
        points: [],
        ...input,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      // A reminder's instant is derived from the task's own time, so it is
      // worked out here rather than by every caller in a second write.
      if (task.remind && task.dueAt && !task.remindAt) task.remindAt = remindAt(task);
      persistTasks((current) => [...current, task]);
      return task;
    },
    [persistTasks]
  );

  const updateTask = useCallback<TasksValue['updateTask']>(
    (id, patch) => {
      persistTasks((current) => current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [persistTasks]
  );

  const patchMany = useCallback<TasksValue['patchMany']>(
    (ids, patch) => {
      const set = new Set(ids);
      persistTasks((current) => current.map((t) => (set.has(t.id) ? { ...t, ...patch(t) } : t)));
    },
    [persistTasks]
  );

  const toggleDone = useCallback<TasksValue['toggleDone']>(
    (id) => {
      // The caller needs to know which way it went — for the toast — so the
      // decision is made from the list as it is read, and applied inside the
      // updater against the list as it will be.
      const next = tasks.find((t) => t.id === id)?.status === 'done' ? 'open' : 'done';
      persistTasks((current) => current.map((t) => (t.id === id ? { ...t, status: next } : t)));
      return next;
    },
    [tasks, persistTasks]
  );

  const snooze = useCallback<TasksValue['snooze']>(
    (id, until) => {
      updateTask(id, { status: 'snoozed', snoozedUntil: until });
    },
    [updateTask]
  );

  const cancel = useCallback<TasksValue['cancel']>(
    (id) => {
      updateTask(id, { status: 'cancelled' });
    },
    [updateTask]
  );

  const setOneThing = useCallback<TasksValue['setOneThing']>(
    (title, focusMinutes = DEFAULT_FOCUS_MINUTES) => {
      persistOneThing({ date: dateKey(), title, done: false, focusMinutes });
    },
    [persistOneThing]
  );

  const setOneThingDone = useCallback<TasksValue['setOneThingDone']>(
    (done) => {
      persistOneThing(oneThing ? { ...oneThing, done } : null);
    },
    [oneThing, persistOneThing]
  );

  const setFocusMinutes = useCallback<TasksValue['setFocusMinutes']>(
    (focusMinutes) => {
      if (oneThing) persistOneThing({ ...oneThing, focusMinutes });
    },
    [oneThing, persistOneThing]
  );

  const reset = useCallback(() => {
    setTasks([]);
    setOneThingState(null);
    AsyncStorage.multiRemove([TASKS_KEY, ONE_THING_KEY]).catch(() => {});
  }, []);

  const applySync = useCallback<TasksValue['applySync']>(
    ({ tasks: nextTasks, oneThing: nextOne }) => {
      if (nextTasks) persistTasks(nextTasks);
      if (nextOne) persistOneThing(nextOne);
    },
    [persistTasks, persistOneThing]
  );

  const value = useMemo<TasksValue>(
    () => ({
      tasks,
      oneThing,
      ready,
      addTask,
      updateTask,
      patchMany,
      toggleDone,
      snooze,
      cancel,
        // Undo hands back a whole list, so it ignores what is current.
      restore: (next: Task[]) => persistTasks(() => next),
      setOneThing,
      setOneThingDone,
      setFocusMinutes,
      reset,
      applySync,
    }),
    [
      tasks,
      oneThing,
      ready,
      addTask,
      updateTask,
      patchMany,
      toggleDone,
      snooze,
      cancel,
      persistTasks,
      setOneThing,
      setOneThingDone,
      setFocusMinutes,
      reset,
      applySync,
    ]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside <TasksProvider>');
  return ctx;
}

export type { NewTask };

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

import { dateKey, type OneThing, type Task } from './model-types';

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

  const persistTasks = useCallback((next: Task[]) => {
    setTasks(next);
    AsyncStorage.setItem(TASKS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const persistOneThing = useCallback((next: OneThing | null) => {
    setOneThingState(next);
    if (next) AsyncStorage.setItem(ONE_THING_KEY, JSON.stringify(next)).catch(() => {});
    else AsyncStorage.removeItem(ONE_THING_KEY).catch(() => {});
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
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      persistTasks([...tasks, task]);
      return task;
    },
    [tasks, persistTasks]
  );

  const updateTask = useCallback<TasksValue['updateTask']>(
    (id, patch) => {
      persistTasks(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [tasks, persistTasks]
  );

  const patchMany = useCallback<TasksValue['patchMany']>(
    (ids, patch) => {
      const set = new Set(ids);
      persistTasks(tasks.map((t) => (set.has(t.id) ? { ...t, ...patch(t) } : t)));
    },
    [tasks, persistTasks]
  );

  const toggleDone = useCallback<TasksValue['toggleDone']>(
    (id) => {
      const current = tasks.find((t) => t.id === id);
      const next = current?.status === 'done' ? 'open' : 'done';
      persistTasks(tasks.map((t) => (t.id === id ? { ...t, status: next } : t)));
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
      restore: persistTasks,
      setOneThing,
      setOneThingDone,
      setFocusMinutes,
      reset,
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

/**
 * The Tasks screen's grouping, kept pure so it can be read (and later tested)
 * on its own. SCREENS.md § 07.
 *
 * SCREENS lists "This morning / This afternoon / This evening / Later"; the
 * prototype builds three more — a red "Slipped" group with a "Move to
 * tomorrow" action, a "Tomorrow" group, and a collapsed "Done today". All
 * seven are here, in the prototype's order.
 */
import type { Copy } from '@/content/strings';
import { dateKey, type Task } from '@/lib/model-types';
import { ink, status, type TaskType } from '@/design/tokens';

/** The filter chips, in the order they appear. */
export const TASK_FILTERS = ['all', 'call', 'email', 'whatsapp', 'reminder', 'done'] as const;
export type TaskFilter = (typeof TASK_FILTERS)[number];

/**
 * `later` rows swap their two left-hand lines: the day ("Mon 13") sits where
 * the time normally does, and the time moves to the line below.
 */
export type RowMode = 'normal' | 'later';

/** What a group's right-hand text button does. The screen supplies the action. */
export type GroupAction = 'moveTomorrow' | 'toggleLater' | 'toggleDone';

export type TaskGroup = {
  key: string;
  label: string;
  /** Group label colour; the Slipped group is red, the rest are ink. */
  colour?: string;
  items: Task[];
  mode: RowMode;
  open: boolean;
  action?: { label: string; colour: string; kind: GroupAction };
};

/** Where the day boundaries fall, from the prototype's own time comparisons. */
const AFTERNOON_FROM = 12;
const EVENING_FROM = 17;

const hour = (task: Task) => new Date(task.dueAt as string).getHours();

function byTime(a: Task, b: Task) {
  return (a.dueAt ?? '').localeCompare(b.dueAt ?? '');
}

export type GroupedTasks = {
  groups: TaskGroup[];
  /** The dark "Up next" card's task, or null when there is nothing ahead. */
  upNext: Task | null;
  /** Today's totals, for the header line and the progress bar. */
  progress: { done: number; total: number };
  /** Open tasks with no reminder at all — the "🔔 9 without a reminder" hint. */
  withoutReminder: Task[];
  empty: boolean;
};

export function buildTaskGroups({
  tasks,
  filter,
  now,
  justDone,
  showLater,
  showDone,
  t,
}: {
  tasks: Task[];
  filter: TaskFilter;
  now: Date;
  /** Tasks ticked in the last moment, which hold their place before moving. */
  justDone: ReadonlySet<string>;
  showLater: boolean;
  showDone: boolean;
  t: Copy;
}): GroupedTasks {
  const today = dateKey(now);
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const live = (task: Task) => task.status !== 'done' || justDone.has(task.id);
  const typeOk = (task: Task) =>
    filter === 'all' || filter === 'done' || task.type === (filter as TaskType);
  const dated = tasks.filter((task) => task.status !== 'cancelled' && task.dueAt !== null);
  const dayOf = (task: Task) => dateKey(new Date(task.dueAt as string));

  const todays = dated.filter((task) => dayOf(task) === today && typeOk(task));
  const pending = todays.filter(live).sort(byTime);

  // Anything already past counts as slipped — including a task left over from
  // an earlier day, which the prototype's single demo day cannot produce.
  const earlier = dated
    .filter((task) => dayOf(task) < today && typeOk(task) && live(task))
    .sort(byTime);
  const slipped = [...earlier, ...pending.filter((task) => new Date(task.dueAt as string) < now)];
  const ahead = pending.filter((task) => new Date(task.dueAt as string) >= now);

  const upNext = filter === 'done' ? null : ahead.find((task) => task.status !== 'done') ?? null;
  const rest = ahead.filter((task) => task !== upNext);

  const allToday = dated.filter((task) => dayOf(task) === today);
  const progress = { done: allToday.filter((task) => task.status === 'done').length, total: allToday.length };
  const withoutReminder = tasks.filter((task) => task.status === 'open' && !task.remind);

  const groups: TaskGroup[] = [];
  const add = (group: TaskGroup) => {
    if (group.items.length) groups.push(group);
  };

  if (filter === 'done') {
    add({ key: 'done', label: t.doneF, items: dated.filter((task) => task.status === 'done').sort(byTime), mode: 'normal', open: true });
  } else {
    add({
      key: 'slipped',
      label: t.slipped,
      colour: status.dangerFg,
      items: slipped,
      mode: 'normal',
      open: true,
      action: { label: t.moveTmw, colour: status.dangerFg, kind: 'moveTomorrow' },
    });

    add({ key: 'morning', label: t.pMorning, items: rest.filter((task) => hour(task) < AFTERNOON_FROM), mode: 'normal', open: true });
    add({
      key: 'afternoon',
      label: t.pAfternoon,
      items: rest.filter((task) => hour(task) >= AFTERNOON_FROM && hour(task) < EVENING_FROM),
      mode: 'normal',
      open: true,
    });
    add({ key: 'evening', label: t.pEvening, items: rest.filter((task) => hour(task) >= EVENING_FROM), mode: 'normal', open: true });

    add({
      key: 'tomorrow',
      label: t.tmw,
      items: dated.filter((task) => dayOf(task) === tomorrow && typeOk(task) && live(task)).sort(byTime),
      mode: 'normal',
      open: true,
    });

    add({
      key: 'later',
      label: t.later,
      items: dated.filter((task) => dayOf(task) > tomorrow && typeOk(task) && live(task)).sort(byTime),
      mode: 'later',
      open: showLater,
      action: { label: showLater ? t.hide : t.show, colour: ink.s3, kind: 'toggleLater' },
    });

    if (filter === 'all') {
      add({
        key: 'doneToday',
        label: t.doneToday2,
        items: todays.filter((task) => task.status === 'done' && !justDone.has(task.id)).sort(byTime),
        mode: 'normal',
        open: showDone,
        action: { label: showDone ? t.hide : t.show, colour: ink.s3, kind: 'toggleDone' },
      });
    }
  }

  return { groups, upNext, progress, withoutReminder, empty: groups.length === 0 && !upNext };
}

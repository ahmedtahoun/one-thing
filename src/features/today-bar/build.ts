/**
 * The Lock Screen bar: today's timed tasks laid out on one line, from the
 * first to the last, like a fasting timer. What it shows is worked out here,
 * in plain data; targets/today-bar draws it, and the system moves it along
 * with the clock between updates. Each open task turns red on its own once
 * its time passes, so nothing needs to wake the app for that.
 */
import { clockText } from '@/lib/clock-format';
import { dateKey, isOnDay, type Task } from '@/lib/model-types';
import type { TaskType } from '@/design/tokens';

/** The ActivityKit payload is capped at 4 KB, so the bar keeps it short. */
export const MAX_ITEMS = 12;
const MAX_TITLE = 40;
const HOUR = 3600;

export type BarItem = {
  id: string;
  type: TaskType;
  title: string;
  /** Due, in seconds since 1970. */
  at: number;
  done: boolean;
};

/** Mirrors TodayBarAttributes.ContentState in targets/today-bar and modules/today-bar. */
export type BarState = {
  start: number;
  end: number;
  items: BarItem[];
  heading: string;
  next: string;
  nextTime: string;
  startLabel: string;
  endLabel: string;
  rtl: boolean;
};

export type BarCopy = {
  /** "Today · {done} of {total} done" */
  heading: string;
  /** "Next: {title}" */
  next: string;
  /** "Late: {title}" */
  late: string;
  allDone: string;
};

const secs = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const short = (title: string) => {
  const one = title.replace(/\s+/g, ' ').trim();
  return one.length > MAX_TITLE ? `${one.slice(0, MAX_TITLE - 1)}…` : one;
};
const clockAt = (s: number) => {
  const d = new Date(s * 1000);
  return clockText(d.getHours(), d.getMinutes());
};

/** Today's bar, or null when nothing today has a time (the bar then goes away). */
export function buildBar(tasks: Task[], now: Date, copy: BarCopy, rtl: boolean): BarState | null {
  const today = dateKey(now);
  const items: BarItem[] = tasks
    .filter((task) => task.status !== 'cancelled' && isOnDay(task, today))
    .map((task) => ({ id: task.id, type: task.type, title: short(task.title), at: secs(task.dueAt!), done: task.status === 'done' }))
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_ITEMS);
  if (items.length === 0) return null;

  const nowS = Math.floor(now.getTime() / 1000);
  // Whole hours either side, so the ends read as round times.
  const hourOf = (s: number) => {
    const d = new Date(s * 1000);
    d.setMinutes(0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  };
  const first = items[0]!.at;
  const last = items[items.length - 1]!.at;
  const start = hourOf(Math.min(first, nowS));
  let end = hourOf(last) + HOUR;
  if (end - start < 2 * HOUR) end = start + 2 * HOUR;

  const done = items.filter((i) => i.done).length;
  const open = items.filter((i) => !i.done);
  const upcoming = open.find((i) => i.at >= nowS);
  const late = open.find((i) => i.at < nowS);
  const pick = upcoming ?? late;
  const next = pick ? (upcoming ? copy.next : copy.late).replace('{title}', pick.title) : copy.allDone;

  return {
    start,
    end,
    items,
    heading: copy.heading.replace('{done}', String(done)).replace('{total}', String(items.length)),
    next,
    nextTime: pick ? clockAt(pick.at) : '',
    startLabel: clockAt(start),
    endLabel: clockAt(end),
    rtl,
  };
}

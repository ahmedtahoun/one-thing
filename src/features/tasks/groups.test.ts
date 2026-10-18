/**
 * The Tasks screen's seven groups. Run with `npm test`.
 *
 * `groups.ts` said at the top that it was "kept pure so it can be read (and
 * later tested) on its own". It was the largest piece of decision-making in
 * the app with nothing importing it from a test — 162 lines deciding what a
 * person sees when they open Tasks (BUILD-REVIEW §2.99).
 *
 * The clock matters here more than anywhere else in the app: "slipped" is
 * `dueAt < now`, and three of the groups are divided by the hour, so every
 * fixture is built around a fixed `NOW` of 08:00 local — early enough that
 * morning, afternoon and evening are all still ahead and therefore all
 * reachable.
 *
 * Most fixtures carry a `__next` task at 08:30. The soonest task still ahead
 * becomes the Up next card and is taken *out* of its group, so without a
 * decoy to absorb that, every "what is in the morning group" assertion would
 * be testing the card instead.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildTaskGroups, TASK_FILTERS, type TaskFilter } from './groups';
import { C } from '@/content/strings';
import type { Task, TaskStatus } from '@/lib/model-types';
import type { TaskType } from '@/design/tokens';

const t = C.en;
/** 08:00 on a Tuesday, before all three of the day's boundaries. */
const NOW = new Date(2026, 9, 13, 8, 0, 0);

/** A local time on a day relative to NOW, as the screen's own dates are local. */
const at = (dayOffset: number, hour: number, minute = 0): string =>
  new Date(2026, 9, 13 + dayOffset, hour, minute, 0).toISOString();

const task = (id: string, dueAt: string | null, over: Partial<Task> = {}): Task =>
  ({
    id,
    type: 'call' as TaskType,
    title: id,
    contactIds: [],
    dueAt,
    remind: null,
    status: 'open' as TaskStatus,
    points: [],
    studyDays: [],
    createdVia: 'quick',
    createdAt: '2026-10-01T09:00:00.000Z',
    ...over,
  }) as Task;

const build = (tasks: Task[], over: Partial<Parameters<typeof buildTaskGroups>[0]> = {}) =>
  buildTaskGroups({
    tasks,
    filter: 'all',
    now: NOW,
    justDone: new Set<string>(),
    showLater: false,
    showDone: false,
    t,
    ...over,
  });

/** The soonest thing ahead, so Up next takes this and leaves the groups alone. */
const NEXT = () => task('__next', at(0, 8, 30));

const keys = (tasks: Task[], over = {}) => build(tasks, over).groups.map((g) => g.key);
const itemsIn = (key: string, tasks: Task[], over = {}) =>
  (build(tasks, over).groups.find((g) => g.key === key)?.items ?? []).map((task) => task.id);

describe('which group a task lands in', () => {
  it('puts the day in order: slipped, morning, afternoon, evening, tomorrow, later', () => {
    const tasks = [
      NEXT(),
      task('slipped', at(0, 7)),
      task('morning', at(0, 10)),
      task('afternoon', at(0, 15)),
      task('evening', at(0, 19)),
      task('tomorrow', at(1, 10)),
      task('later', at(3, 10)),
    ];
    assert.deepEqual(keys(tasks), ['slipped', 'morning', 'afternoon', 'evening', 'tomorrow', 'later']);
  });

  it('counts anything already past today as slipped', () => {
    assert.deepEqual(itemsIn('slipped', [NEXT(), task('a', at(0, 7)), task('b', at(0, 15))]), ['a']);
  });

  it('counts a task left over from an earlier day as slipped, oldest first', () => {
    const tasks = [NEXT(), task('yesterday', at(-1, 15)), task('lastWeek', at(-7, 9)), task('today', at(0, 7))];
    assert.deepEqual(itemsIn('slipped', tasks), ['lastWeek', 'yesterday', 'today']);
  });

  it('divides the rest of today at noon and five', () => {
    const tasks = [NEXT(), task('am', at(0, 11, 59)), task('pm', at(0, 14)), task('eve', at(0, 17))];
    assert.deepEqual(itemsIn('morning', tasks), ['am']);
    assert.deepEqual(itemsIn('afternoon', tasks), ['pm']);
    // 17:00 exactly is evening, not afternoon.
    assert.deepEqual(itemsIn('evening', tasks), ['eve']);
  });

  it('keeps an empty group off the screen entirely', () => {
    assert.deepEqual(keys([NEXT(), task('only', at(0, 15))]), ['afternoon']);
  });

  it('leaves out a task with no date, and a cancelled one', () => {
    const tasks = [NEXT(), task('nodate', null), task('gone', at(0, 15), { status: 'cancelled' }), task('real', at(0, 15))];
    assert.deepEqual(itemsIn('afternoon', tasks), ['real']);
  });
});

describe('the Up next card', () => {
  it('takes the soonest task still ahead, and the group does not repeat it', () => {
    const tasks = [task('soon', at(0, 14)), task('later', at(0, 15))];
    const built = build(tasks);
    assert.equal(built.upNext?.id, 'soon');
    assert.deepEqual(itemsIn('afternoon', tasks), ['later']);
  });

  it('is empty when everything left today has slipped', () => {
    assert.equal(build([task('a', at(0, 7))]).upNext, null);
  });

  it('is never shown under the Done filter', () => {
    const built = build([task('a', at(0, 15))], { filter: 'done' });
    assert.equal(built.upNext, null);
  });
});

describe('done, and just done', () => {
  it('drops a done task out of the day', () => {
    assert.deepEqual(itemsIn('afternoon', [NEXT(), task('a', at(0, 15), { status: 'done' }), task('b', at(0, 15))]), ['b']);
  });

  it('holds a just-ticked task in place, so it does not vanish under the finger', () => {
    const tasks = [task('ticked', at(0, 15), { status: 'done' })];
    assert.deepEqual(itemsIn('afternoon', tasks, { justDone: new Set(['ticked']) }), ['ticked']);
  });

  it('keeps a just-ticked task out of Done today, which is where it goes next', () => {
    const tasks = [task('ticked', at(0, 15), { status: 'done' }), task('earlier', at(0, 16), { status: 'done' })];
    assert.deepEqual(itemsIn('doneToday', tasks, { justDone: new Set(['ticked']), showDone: true }), ['earlier']);
  });

  it('shows Done today only under All', () => {
    const tasks = [task('a', at(0, 15), { status: 'done' })];
    assert.ok(keys(tasks).includes('doneToday'));
    assert.ok(!keys(tasks, { filter: 'call' as TaskFilter }).includes('doneToday'));
  });

  it('under the Done filter shows the done ones and nothing else', () => {
    const tasks = [task('done', at(0, 15), { status: 'done' }), task('open', at(0, 16))];
    assert.deepEqual(keys(tasks, { filter: 'done' as TaskFilter }), ['done']);
    assert.deepEqual(itemsIn('done', tasks, { filter: 'done' as TaskFilter }), ['done']);
  });
});

describe('the chips', () => {
  it('shows only that kind, and never filters the Done group by kind', () => {
    // A decoy of each kind, since the chip filters before Up next is chosen:
    // without one the only matching task would become the card.
    const tasks = [
      NEXT(),
      task('__nextMail', at(0, 9), { type: 'email' }),
      task('call', at(0, 15)),
      task('mail', at(0, 16), { type: 'email' }),
    ];
    assert.deepEqual(itemsIn('afternoon', tasks, { filter: 'call' as TaskFilter }), ['call']);
    assert.deepEqual(itemsIn('afternoon', tasks, { filter: 'email' as TaskFilter }), ['mail']);
  });

  it('offers the six the screen draws', () => {
    assert.deepEqual([...TASK_FILTERS], ['all', 'call', 'email', 'whatsapp', 'reminder', 'done']);
  });
});

describe('what the header reads off', () => {
  it('counts today only, done against all of it, ignoring the chip', () => {
    const tasks = [
      task('a', at(0, 9), { status: 'done' }),
      task('b', at(0, 15)),
      task('c', at(1, 10)),
      task('d', at(0, 16), { type: 'email' }),
    ];
    assert.deepEqual(build(tasks, { filter: 'call' as TaskFilter }).progress, { done: 1, total: 3 });
  });

  it('lists the open tasks with no reminder, whatever day they are on', () => {
    const tasks = [
      task('none', at(0, 15)),
      task('set', at(0, 16), { remind: 'at' }),
      task('faraway', at(9, 10)),
      task('finished', at(0, 17), { status: 'done' }),
    ];
    assert.deepEqual(
      build(tasks).withoutReminder.map((task) => task.id),
      ['none', 'faraway']
    );
  });

  it('is empty only when there is nothing at all to show', () => {
    assert.equal(build([]).empty, true);
    assert.equal(build([task('a', at(0, 15))]).empty, false);
    // One task ahead and nothing else is still not empty: it is the card.
    assert.equal(build([task('a', at(0, 14))]).empty, false);
  });
});

describe('the groups that fold', () => {
  it('follows showLater and showDone, and names the button accordingly', () => {
    const tasks = [task('far', at(4, 10)), task('done', at(0, 15), { status: 'done' })];
    const shut = build(tasks);
    const open = build(tasks, { showLater: true, showDone: true });
    assert.equal(shut.groups.find((g) => g.key === 'later')?.open, false);
    assert.equal(open.groups.find((g) => g.key === 'later')?.open, true);
    assert.equal(shut.groups.find((g) => g.key === 'later')?.action?.label, t.show);
    assert.equal(open.groups.find((g) => g.key === 'later')?.action?.label, t.hide);
    assert.equal(open.groups.find((g) => g.key === 'doneToday')?.open, true);
  });

  it('writes Later rows in the other mode, so the day sits where the time does', () => {
    const built = build([NEXT(), task('far', at(4, 10)), task('tmw', at(1, 10))]);
    assert.equal(built.groups.find((g) => g.key === 'later')?.mode, 'later');
    assert.equal(built.groups.find((g) => g.key === 'tomorrow')?.mode, 'normal');
  });

  it('gives Slipped the red label and its Move to tomorrow', () => {
    const slipped = build([task('a', at(0, 7))]).groups.find((g) => g.key === 'slipped');
    assert.equal(slipped?.action?.kind, 'moveTomorrow');
    assert.ok(slipped?.colour);
  });
});

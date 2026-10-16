import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Task } from '@/lib/model-types';

import { buildBar, MAX_ITEMS, type BarCopy } from './build';

const copy: BarCopy = { heading: 'Today · {done} of {total} done', next: 'Next: {title}', late: 'Late: {title}', allDone: 'All done today' };

function at(h: number, m = 0, day = 14): string {
  return new Date(2026, 9, day, h, m).toISOString();
}

function task(id: string, dueAt: string | null, extra: Partial<Task> = {}): Task {
  return { id, type: 'email', title: `Task ${id}`, contactIds: [], dueAt, remind: null, status: 'open', points: [], createdVia: 'manual', createdAt: at(8), ...extra } as Task;
}

const s = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe('the Lock Screen bar', () => {
  it('lays out today’s timed tasks in order, from the hour before to the hour after', () => {
    const now = new Date(2026, 9, 14, 10, 15);
    const bar = buildBar([task('b', at(14)), task('a', at(9, 30)), task('none', null), task('tomorrow', at(9, 0, 15))], now, copy, false)!;
    assert.deepEqual(bar.items.map((i) => i.id), ['a', 'b']);
    assert.equal(bar.start, s(at(9)));
    assert.equal(bar.end, s(at(15)));
    assert.equal(bar.startLabel, '9:00 AM');
    assert.equal(bar.endLabel, '3:00 PM');
  });

  it('names what is next, else what is late, else says all done', () => {
    const now = new Date(2026, 9, 14, 12, 0);
    const late = task('a', at(9), { title: 'Email Sara' });
    const next = task('b', at(14), { title: 'Call Omar' });
    assert.equal(buildBar([late, next], now, copy, false)!.next, 'Next: Call Omar');
    assert.equal(buildBar([late, next], now, copy, false)!.nextTime, '2:00 PM');
    assert.equal(buildBar([late, { ...next, status: 'done' }], now, copy, false)!.next, 'Late: Email Sara');
    const all = buildBar([{ ...late, status: 'done' }, { ...next, status: 'done' }], now, copy, false)!;
    assert.equal(all.next, 'All done today');
    assert.equal(all.heading, 'Today · 2 of 2 done');
  });

  it('starts at now when now is before the first task, and is never under two hours', () => {
    const now = new Date(2026, 9, 14, 7, 40);
    const bar = buildBar([task('a', at(8))], now, copy, false)!;
    assert.equal(bar.start, s(at(7)));
    assert.equal(bar.end, s(at(9)));
  });

  it('is nothing on a day with no timed task, and leaves cancelled ones out', () => {
    const now = new Date(2026, 9, 14, 9);
    assert.equal(buildBar([task('a', null), task('b', at(11), { status: 'cancelled' })], now, copy, false), null);
  });

  it('keeps the payload small: a dozen tasks, short titles', () => {
    const now = new Date(2026, 9, 14, 6);
    const many = Array.from({ length: 20 }, (_, i) => task(String(i), at(8, i), { title: 'x'.repeat(80) }));
    const bar = buildBar(many, now, copy, false)!;
    assert.equal(bar.items.length, MAX_ITEMS);
    assert.ok(bar.items.every((i) => i.title.length <= 40));
    assert.ok(JSON.stringify(bar).length < 4000);
  });
});

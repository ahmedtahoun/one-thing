import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hasAnything, RECAP_DAYS, weekOf, type WeekInput } from './week';
import { dateKey, type Contact, type FollowUp, type HistoryEntry, type Task } from '@/lib/model-types';

const NOW = new Date('2026-10-15T12:00:00');
const DAY = 86_400_000;
/** `n` days before now, as an ISO instant. */
const ago = (n: number): string => new Date(NOW.getTime() - n * DAY).toISOString();
const agoKey = (n: number): string => dateKey(new Date(NOW.getTime() - n * DAY));

const person = (id: string, name: string): Contact => ({ id, name, createdAt: ago(30) });

const entry = (id: string, contactId: string, kind: HistoryEntry['kind'], daysAgo: number): HistoryEntry => ({
  id,
  contactId,
  kind,
  text: 'x',
  at: ago(daysAgo),
});

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  type: 'call',
  title: `Task ${id}`,
  contactIds: [],
  dueAt: ago(1),
  remind: null,
  status: 'open',
  points: [],
  createdVia: 'quick',
  createdAt: ago(10),
  ...over,
});

const followUp = (id: string, over: Partial<FollowUp> = {}): FollowUp => ({
  id,
  channel: 'whatsapp',
  who: 'Someone',
  what: 'The quote',
  status: 'waiting',
  since: 'Sent',
  nextAt: ago(-1),
  ...over,
});

const input = (over: Partial<WeekInput> = {}): WeekInput => ({
  tasks: [],
  followUps: [],
  contacts: [person('c1', 'Sara Haddad'), person('c2', 'Omar Khalid')],
  history: [],
  wins: [],
  now: NOW,
  ...over,
});

describe('the week it covers', () => {
  it('is seven days ending today', () => {
    const week = weekOf(input());
    assert.equal(week.to, dateKey(NOW));
    assert.equal(week.from, agoKey(RECAP_DAYS - 1));
  });

  it('leaves out what happened before it, and what is dated in the future', () => {
    const history = [entry('old', 'c1', 'call', 30), entry('in', 'c1', 'call', 2), entry('ahead', 'c1', 'call', -5)];
    assert.equal(weekOf(input({ history })).sent.calls, 1);
  });
});

describe('what went out', () => {
  it('counts each kind as what it was, and a visit as a meeting', () => {
    const history = [
      entry('a', 'c1', 'call', 1),
      entry('b', 'c1', 'whatsapp', 2),
      entry('c', 'c2', 'email', 3),
      entry('d', 'c2', 'meeting', 4),
      entry('e', 'c2', 'visit', 5),
      entry('f', 'c1', 'note', 6),
    ];
    const week = weekOf(input({ history }));
    assert.deepEqual(week.sent, { calls: 1, messages: 1, emails: 1, meetings: 2, notes: 1 });
    assert.equal(week.sentTotal, 6);
  });

  it('does not count a closed follow-up as something sent', () => {
    const history = [entry('a', 'c1', 'followup_closed', 1)];
    const week = weekOf(input({ history }));
    assert.equal(week.sentTotal, 0);
    assert.deepEqual(week.reached, []);
  });
});

describe('who was reached', () => {
  it('counts each person once per thing sent, most often first', () => {
    const history = [entry('a', 'c2', 'call', 1), entry('b', 'c1', 'call', 2), entry('c', 'c1', 'email', 3)];
    const week = weekOf(input({ history }));
    assert.deepEqual(week.reached.map((r) => [r.contact.id, r.times]), [['c1', 2], ['c2', 1]]);
  });

  it('leaves out somebody since deleted, rather than showing a blank row', () => {
    const history = [entry('a', 'gone', 'call', 1), entry('b', 'c1', 'call', 1)];
    assert.deepEqual(weekOf(input({ history })).reached.map((r) => r.contact.id), ['c1']);
  });
});

describe('the days and the streak', () => {
  it('counts the days in the week something was finished', () => {
    const wins = [agoKey(0), agoKey(1), agoKey(3), agoKey(20)];
    const week = weekOf(input({ wins }));
    assert.equal(week.activeDays, 3, 'the 20-day-old win is outside the week');
  });

  it('carries the streak as the streak module reads it', () => {
    const wins = [agoKey(0), agoKey(1), agoKey(2)];
    const week = weekOf(input({ wins }));
    assert.equal(week.streak.current, 3);
    assert.equal(week.streak.doneToday, true);
  });
});

describe('follow-ups', () => {
  it('counts the ones closed inside the week only', () => {
    const followUps = [
      followUp('a', { status: 'done', lastAction: 'closed', lastActionAt: ago(2) }),
      followUp('b', { status: 'done', lastAction: 'closed', lastActionAt: ago(40) }),
      followUp('c', { status: 'done', lastAction: 'nudged', lastActionAt: ago(2) }),
    ];
    assert.equal(weekOf(input({ followUps })).closed, 1);
  });

  it('counts who is still waiting as the week ends', () => {
    const followUps = [followUp('a'), followUp('b', { status: 'done' }), followUp('c')];
    assert.equal(weekOf(input({ followUps })).waiting, 2);
  });
});

describe('what carries over', () => {
  it('is the open tasks already past their time, soonest first', () => {
    const tasks = [
      task('late2', { dueAt: ago(1) }),
      task('late1', { dueAt: ago(5) }),
      task('ahead', { dueAt: ago(-2) }),
      task('done', { dueAt: ago(3), status: 'done' }),
      task('undated', { dueAt: null }),
    ];
    assert.deepEqual(weekOf(input({ tasks })).carrying.map((t) => t.id), ['late1', 'late2']);
  });
});

describe('hasAnything', () => {
  it('is false for a week where nothing happened, so it can say so', () => {
    assert.equal(hasAnything(weekOf(input())), false);
  });

  it('is true as soon as any one of the five has something', () => {
    assert.equal(hasAnything(weekOf(input({ wins: [agoKey(1)] }))), true);
    assert.equal(hasAnything(weekOf(input({ history: [entry('a', 'c1', 'call', 1)] }))), true);
    assert.equal(hasAnything(weekOf(input({ followUps: [followUp('a')] }))), true);
    assert.equal(hasAnything(weekOf(input({ tasks: [task('late')] }))), true);
  });

  it('a week with only a future task still reads as empty', () => {
    assert.equal(hasAnything(weekOf(input({ tasks: [task('ahead', { dueAt: ago(-3) })] }))), false);
  });
});

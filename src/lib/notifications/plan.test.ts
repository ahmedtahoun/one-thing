/**
 * The notification rules, checked against SCREENS.md § Notifications.
 *
 * Delivery needs a device; these are the decisions that lead up to it, which
 * do not. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { eveningNudgeAt, inQuietHours, planNotifications, shouldAlert } from './plan';
import { DEFAULT_PREFS } from '@/lib/prefs';
import type { FollowUp, Prefs, Task } from '@/lib/model-types';

const NOW = new Date('2026-10-10T09:20:00');

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    type: 'call',
    title: 'Contract terms',
    contactIds: [],
    dueAt: new Date('2026-10-10T11:00:00').toISOString(),
    remind: 'min_10',
    status: 'open',
    points: [],
    createdVia: 'quick',
    createdAt: NOW.toISOString(),
    ...over,
  };
}

function prefs(over: Partial<Prefs> = {}): Prefs {
  return { ...DEFAULT_PREFS, ...over };
}

const at = (iso: string) => new Date(iso);

/** Just the task reminders, where the evening nudge is beside the point. */
const reminders = (plan: { kind: string }[]) =>
  plan.filter((n) => n.kind === 'task' || n.kind === 'task_repeat');

describe('quiet hours', () => {
  const quiet = { start: '22:00', end: '08:00' };

  it('wraps midnight', () => {
    assert.equal(inQuietHours(at('2026-10-10T23:30:00'), quiet), true);
    assert.equal(inQuietHours(at('2026-10-10T03:00:00'), quiet), true);
    assert.equal(inQuietHours(at('2026-10-10T07:59:00'), quiet), true);
  });

  it('ends exactly at the end, which is when a Morning-of reminder fires', () => {
    assert.equal(inQuietHours(at('2026-10-10T08:00:00'), quiet), false);
    assert.equal(inQuietHours(at('2026-10-10T12:00:00'), quiet), false);
  });

  it('handles a window that does not wrap', () => {
    const daytime = { start: '09:00', end: '17:00' };
    assert.equal(inQuietHours(at('2026-10-10T12:00:00'), daytime), true);
    assert.equal(inQuietHours(at('2026-10-10T20:00:00'), daytime), false);
  });
});

describe('the Quiet style', () => {
  it('never alerts, whatever the hour', () => {
    assert.equal(shouldAlert(at('2026-10-10T12:00:00'), prefs({ nudgeStyle: 'quiet' })), false);
  });

  it('is separate from quiet hours, which silence the other styles too', () => {
    assert.equal(shouldAlert(at('2026-10-10T23:00:00'), prefs({ nudgeStyle: 'gentle' })), false);
    assert.equal(shouldAlert(at('2026-10-10T12:00:00'), prefs({ nudgeStyle: 'gentle' })), true);
  });
});

describe('task reminders', () => {
  it('fires at the offset, not at the task time', () => {
    const [first] = planNotifications({ tasks: [task()], followUps: [], prefs: prefs(), now: NOW });
    assert.equal(first?.at, new Date('2026-10-10T10:50:00').toISOString());
  });

  it('ignores a task with no reminder, and one already done', () => {
    const plan = planNotifications({
      tasks: [task({ id: 'a', remind: null }), task({ id: 'b', status: 'done' })],
      followUps: [],
      prefs: prefs(),
      now: NOW,
    });
    // The day still earns its evening nudge — there is something to review.
    assert.deepEqual(reminders(plan), []);
  });

  it('ignores a reminder that has already passed', () => {
    const plan = planNotifications({
      tasks: [task({ dueAt: new Date('2026-10-10T08:00:00').toISOString() })],
      followUps: [],
      prefs: prefs(),
      now: NOW,
    });
    assert.deepEqual(reminders(plan), []);
  });

  it('takes a custom reminder from its own instant', () => {
    const custom = task({
      remind: 'custom',
      remindAt: new Date('2026-10-10T10:00:00').toISOString(),
    });
    const [first] = planNotifications({ tasks: [custom], followUps: [], prefs: prefs(), now: NOW });
    assert.equal(first?.at, new Date('2026-10-10T10:00:00').toISOString());
  });

  it('gives a stable id, so an unchanged reminder is not rescheduled', () => {
    const input = { tasks: [task()], followUps: [], prefs: prefs(), now: NOW };
    assert.deepEqual(
      planNotifications(input).map((n) => n.id),
      planNotifications(input).map((n) => n.id)
    );
  });
});

describe('the Firm style', () => {
  it('repeats every 10 minutes, three times', () => {
    const plan = planNotifications({ tasks: [task()], followUps: [], prefs: prefs({ nudgeStyle: 'firm' }), now: NOW });
    const times = plan.filter((n) => n.taskId === 't1').map((n) => n.at);
    assert.deepEqual(times, [
      new Date('2026-10-10T10:50:00').toISOString(),
      new Date('2026-10-10T11:00:00').toISOString(),
      new Date('2026-10-10T11:10:00').toISOString(),
      new Date('2026-10-10T11:20:00').toISOString(),
    ]);
  });

  it('drops the reminder and its repeats once the task is no longer open', () => {
    const plan = planNotifications({
      tasks: [task({ status: 'snoozed' })],
      followUps: [],
      prefs: prefs({ nudgeStyle: 'firm' }),
      now: NOW,
    });
    assert.deepEqual(reminders(plan), []);
  });

  it('does not repeat under Gentle', () => {
    const plan = planNotifications({ tasks: [task()], followUps: [], prefs: prefs(), now: NOW });
    assert.equal(plan.filter((n) => n.kind === 'task_repeat').length, 0);
  });
});

describe('follow-ups', () => {
  const followUp = (over: Partial<FollowUp> = {}): FollowUp => ({
    id: 'f1',
    channel: 'whatsapp',
    who: 'Noura · Designer',
    what: 'Logo final files',
    status: 'waiting',
    since: 'Sent Sunday',
    nextAt: new Date('2026-10-11T09:00:00').toISOString(),
    ...over,
  });

  it('fires when a waiting follow-up comes due', () => {
    const plan = planNotifications({ tasks: [], followUps: [followUp()], prefs: prefs(), now: NOW });
    assert.equal(plan.length, 1);
    assert.equal(plan[0]?.followUpId, 'f1');
  });

  it('leaves closed ones alone, and ones with no date', () => {
    const plan = planNotifications({
      tasks: [],
      followUps: [followUp({ id: 'a', status: 'done' }), followUp({ id: 'b', nextAt: null })],
      prefs: prefs(),
      now: NOW,
    });
    assert.deepEqual(plan, []);

  });
});

describe('the evening nudge', () => {
  it('is at 18:30', () => {
    const evening = eveningNudgeAt(NOW);
    assert.equal(evening.getHours(), 18);
    assert.equal(evening.getMinutes(), 30);
  });

  it('is only scheduled for a day that has something on it', () => {
    const plan = planNotifications({ tasks: [task()], followUps: [], prefs: prefs(), now: NOW });
    const evenings = plan.filter((n) => n.kind === 'evening');
    assert.equal(evenings.length, 1);
    assert.equal(evenings[0]?.at, eveningNudgeAt(NOW).toISOString());
  });

  it('is not scheduled on an empty day', () => {
    const plan = planNotifications({ tasks: [], followUps: [], prefs: prefs(), now: NOW });
    assert.equal(plan.filter((n) => n.kind === 'evening').length, 0);
  });

  it('is silent under the Quiet style, but still scheduled', () => {
    const plan = planNotifications({
      tasks: [task()],
      followUps: [],
      prefs: prefs({ nudgeStyle: 'quiet' }),
      now: NOW,
    });
    assert.equal(plan.every((n) => n.alert === false), true);
    assert.ok(plan.length > 0);
  });
});

describe('the pending cap', () => {
  it('keeps the soonest, because iOS allows only 64', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      task({
        id: `t${i}`,
        dueAt: new Date(NOW.getTime() + (i + 1) * 3600000).toISOString(),
      })
    );
    const plan = planNotifications({ tasks: many, followUps: [], prefs: prefs(), now: NOW });
    assert.ok(plan.length <= 60);
    const times = plan.map((n) => n.at);
    assert.deepEqual([...times].sort(), times);
  });
});

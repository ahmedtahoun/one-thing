import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Contact, FollowUp, Task } from '@/lib/model-types';

import { buildNext, COLD_DAYS, MAX_COLD, tomorrowMorning } from './build';

const now = new Date('2026-10-14T12:00:00');
const iso = (d: Date) => d.toISOString();
const ago = (days: number, hours = 0) => iso(new Date(now.getTime() - days * 86400000 - hours * 3600000));
const ahead = (hours: number) => iso(new Date(now.getTime() + hours * 3600000));

const task = (id: string, patch: Partial<Task> = {}): Task => ({
  id,
  type: 'call',
  title: `Task ${id}`,
  contactIds: [],
  dueAt: null,
  remind: null,
  status: 'open',
  points: [],
  createdVia: 'quick',
  createdAt: ago(3),
  ...patch,
});
const person = (id: string, patch: Partial<Contact> = {}): Contact => ({
  id,
  name: `Person ${id}`,
  createdAt: ago(60),
  ...patch,
});
const followUp = (id: string, patch: Partial<FollowUp> = {}): FollowUp => ({
  id,
  channel: 'whatsapp',
  who: 'Sara · Buyer',
  what: 'Quote',
  status: 'waiting',
  since: '',
  nextAt: ago(2),
  createdAt: ago(5),
  ...patch,
});
const run = (over: Partial<Parameters<typeof buildNext>[0]> = {}) =>
  buildNext({ tasks: [], followUps: [], contacts: [], favorites: new Set(), hidden: new Map(), now, ...over });

describe('buildNext', () => {
  it('is empty when nothing needs doing', () => {
    const r = run({ tasks: [task('a', { dueAt: ahead(48) }), task('b')] });
    assert.deepEqual(r.cards, []);
    assert.equal(r.urgent, 0);
  });

  it('puts late work first, the longest slipped highest', () => {
    const r = run({
      tasks: [
        task('today', { dueAt: ahead(2) }),
        task('late1', { dueAt: ago(0, 3) }),
        task('late5', { dueAt: ago(5) }),
      ],
    });
    assert.deepEqual(r.cards.map((c) => c.taskId), ['late5', 'late1', 'today']);
    assert.equal(r.urgent, 2);
  });

  it('keeps tomorrow and done work out', () => {
    const r = run({
      tasks: [task('a', { dueAt: ahead(30) }), task('b', { status: 'done', dueAt: ago(1) }), task('c', { status: 'cancelled', dueAt: ago(1) })],
    });
    assert.equal(r.cards.length, 0);
  });

  it('brings a snoozed task back once its time has passed', () => {
    const r = run({
      tasks: [
        task('wake', { status: 'snoozed', snoozedUntil: ago(0, 1), dueAt: ago(1) }),
        task('sleep', { status: 'snoozed', snoozedUntil: ahead(5), dueAt: ago(1) }),
      ],
    });
    assert.deepEqual(r.cards.map((c) => c.taskId), ['wake']);
  });

  it('shows a follow-up whose wait is over, and says how long', () => {
    const r = run({ followUps: [followUp('f1', { nextAt: ago(3) })] });
    assert.equal(r.cards.length, 1);
    assert.equal(r.cards[0]?.source, 'followup');
    assert.equal(r.cards[0]?.who, 'Sara');
    assert.deepEqual(r.cards[0]?.reason, { kind: 'reply', days: 3 });
    assert.equal(r.urgent, 1);
  });

  it('ignores follow-ups still waiting or closed', () => {
    const r = run({
      followUps: [followUp('w', { nextAt: ahead(24) }), followUp('d', { status: 'done' })],
    });
    assert.equal(r.cards.length, 0);
  });

  it('shows the drafted nudge task instead of the follow-up behind it', () => {
    const nudge = task('n', { dueAt: ago(0, 1), createdVia: 'followup' });
    const r = run({ tasks: [nudge], followUps: [followUp('f', { taskId: 'n' })] });
    assert.deepEqual(r.cards.map((c) => c.id), ['task:n']);
  });

  it('ranks late work, then replies owed, then today, then quiet people', () => {
    const r = run({
      tasks: [task('today', { dueAt: ahead(3) }), task('late', { dueAt: ago(1) })],
      followUps: [followUp('f')],
      contacts: [person('q', { touchedAt: ago(30) })],
      favorites: new Set(['q']),
    });
    assert.deepEqual(r.cards.map((c) => c.source), ['task', 'followup', 'task', 'quiet']);
    assert.equal(r.cards[0]?.taskId, 'late');
  });

  it('shows a favourite going quiet, but nobody else', () => {
    const contacts = [person('fav', { touchedAt: ago(COLD_DAYS + 1) }), person('plain', { touchedAt: ago(90) })];
    const r = run({ contacts, favorites: new Set(['fav']) });
    assert.deepEqual(r.cards.map((c) => c.contactId), ['fav']);
    assert.deepEqual(r.cards[0]?.reason, { kind: 'quiet', days: COLD_DAYS + 1 });
  });

  it('leaves a favourite alone while it is recent or already has something open', () => {
    const contacts = [person('recent', { touchedAt: ago(2) }), person('busy', { touchedAt: ago(40) })];
    const r = run({
      contacts,
      favorites: new Set(['recent', 'busy']),
      tasks: [task('t', { contactIds: ['busy'], dueAt: ahead(48) })],
      followUps: [followUp('f', { contactId: 'busy', nextAt: ahead(48) })],
    });
    assert.deepEqual(r.cards, []);
  });

  it('caps quiet people so they never flood the queue', () => {
    const contacts = Array.from({ length: 6 }, (_, i) => person(`c${i}`, { touchedAt: ago(30 + i) }));
    const r = run({ contacts, favorites: new Set(contacts.map((c) => c.id)) });
    assert.equal(r.cards.length, MAX_COLD);
    assert.equal(r.cards[0]?.contactId, 'c5');
  });

  it('hides a card until the time it was put off to', () => {
    const t = task('a', { dueAt: ago(1) });
    const hidden = new Map([['task:a', ahead(5)]]);
    assert.equal(run({ tasks: [t], hidden }).cards.length, 0);
    assert.equal(run({ tasks: [t], hidden: new Map([['task:a', ago(0, 1)]]) }).cards.length, 1);
  });

  it('matches a task to a person by name when it carries no link', () => {
    const r = run({
      tasks: [task('a', { who: 'Omar · CTO', dueAt: ago(1) })],
      contacts: [person('omar', { name: 'Omar', touchedAt: ago(40) })],
      favorites: new Set(['omar']),
    });
    assert.equal(r.cards.length, 1);
    assert.equal(r.cards[0]?.contactId, 'omar');
  });

  it('uses the task’s channel only for calls, messages and email', () => {
    const r = run({
      tasks: [task('a', { type: 'meeting', dueAt: ago(1) }), task('b', { type: 'whatsapp', dueAt: ago(2) })],
    });
    assert.deepEqual(r.cards.map((c) => c.channel), ['whatsapp', null]);
  });
});

describe('keep-in-touch rhythms', () => {
  it('brings up anyone whose own rhythm has passed, favourite or not', () => {
    const contacts = [person('w', { touchedAt: ago(8) }), person('m', { touchedAt: ago(20) })];
    const r = run({ contacts, cadence: new Map([['w', 7], ['m', 30]]) });
    assert.deepEqual(r.cards.map((c) => c.contactId), ['w']);
    assert.deepEqual(r.cards[0]?.reason, { kind: 'quiet', days: 8 });
  });

  it('lets a rhythm override the favourite default, and 0 switch it off', () => {
    const fav = person('f', { touchedAt: ago(20) });
    assert.equal(run({ contacts: [fav], favorites: new Set(['f']) }).cards.length, 1);
    assert.equal(run({ contacts: [fav], favorites: new Set(['f']), cadence: new Map([['f', 30]]) }).cards.length, 0);
    assert.equal(run({ contacts: [fav], favorites: new Set(['f']), cadence: new Map([['f', 0]]) }).cards.length, 0);
  });

  it('does not nag someone with no rhythm who is not a favourite', () => {
    assert.equal(run({ contacts: [person('x', { touchedAt: ago(200) })] }).cards.length, 0);
  });
});

describe('tomorrowMorning', () => {
  it('is 09:00 the next day', () => {
    const d = tomorrowMorning(new Date('2026-10-14T22:30:00'));
    assert.equal(d.getDate(), 15);
    assert.equal(d.getHours(), 9);
    assert.equal(d.getMinutes(), 0);
  });
});

describe('one card per person', () => {
  it('folds several things with the same person into one card', () => {
    const now = new Date('2026-10-14T09:00:00');
    const late = (id: string, title: string, minsAgo: number) =>
      ({ id, type: 'whatsapp', title, status: 'open', contactIds: ['p1'], who: 'Daina', dueAt: new Date(now.getTime() - minsAgo * 60000).toISOString() }) as never;
    const { cards } = buildNext({
      tasks: [late('a', 'Message Daina', 1500), late('b', 'Email Daina', 3000)],
      followUps: [],
      contacts: [{ id: 'p1', name: 'Daina', createdAt: now.toISOString() }] as never,
      favorites: new Set(),
      hidden: new Map(),
      now,
    });
    assert.equal(cards.length, 1);
    assert.equal(cards[0]?.also, 1);
    assert.equal(cards[0]?.title, 'Email Daina');
  });
});

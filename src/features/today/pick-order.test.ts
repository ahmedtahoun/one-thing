/**
 * The order the "Who?" sheet puts people in. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { COLD_DAYS } from '@/features/next/build';
import type { Contact, FollowUp, HistoryEntry } from '@/lib/model-types';
import { daysSince, orderForPicking, statusOf, type PickContext } from './pick-order';

const NOW = new Date('2026-10-16T09:00:00.000Z');
const ago = (days: number, hours = 0) => new Date(NOW.getTime() - days * 86400000 - hours * 3600000).toISOString();

const person = (id: string, name: string, over: Partial<Contact> = {}): Contact => ({
  id,
  name,
  createdAt: ago(200),
  ...over,
});

const touch = (contactId: string, kind: HistoryEntry['kind'], days: number): HistoryEntry => ({
  id: `h-${contactId}-${days}`,
  contactId,
  kind,
  text: '',
  at: ago(days),
});

const owed = (contactId: string, over: Partial<FollowUp> = {}): FollowUp => ({
  id: `f-${contactId}`,
  contactId,
  channel: 'whatsapp',
  who: 'Someone',
  what: 'the quote',
  status: 'waiting',
  since: '',
  createdAt: ago(3),
  ...over,
});

const context = (over: Partial<PickContext> = {}): PickContext => ({
  followUps: [],
  history: [],
  favorites: new Set<string>(),
  now: NOW,
  ...over,
});

describe('days since', () => {
  it('counts whole days and refuses to go negative', () => {
    assert.equal(daysSince(ago(0, 2), NOW), 0);
    assert.equal(daysSince(ago(1), NOW), 1);
    assert.equal(daysSince(ago(9, 23), NOW), 9, 'part of a day is not a day');
    assert.equal(daysSince(new Date(NOW.getTime() + 86400000).toISOString(), NOW), 0, 'a future date is today');
  });

  it('answers null for nothing it can read', () => {
    for (const bad of [null, undefined, '', 'soon']) assert.equal(daysSince(bad, NOW), null, String(bad));
  });
});

describe('what a row says', () => {
  it('names an open follow-up, and whether it is overdue', () => {
    const sara = person('c1', 'Sara Haddad');
    const waiting = statusOf(sara, context({ followUps: [owed('c1')] }));
    assert.deepEqual(waiting, { kind: 'owed', due: false, what: 'the quote', days: 3 });

    const due = statusOf(sara, context({ followUps: [owed('c1', { nextAt: ago(1) })] }));
    assert.equal(due.kind === 'owed' && due.due, true);
  });

  it('matches a follow-up saved without an id by name, role and all', () => {
    const noura = person('c2', 'Noura Al-Harbi');
    const byName = statusOf(noura, context({ followUps: [owed('c2', { contactId: null, who: 'Noura Al-Harbi · Designer' })] }));
    assert.equal(byName.kind, 'owed');
  });

  it('ignores a follow-up that is already closed', () => {
    const sara = person('c1', 'Sara Haddad');
    const status = statusOf(sara, context({ followUps: [owed('c1', { status: 'done' })], history: [touch('c1', 'call', 2)] }));
    assert.deepEqual(status, { kind: 'reached', how: 'call', days: 2 });
  });

  it('names how you last reached them, and goes cold after a fortnight', () => {
    const omar = person('c3', 'Omar Khalid');
    assert.deepEqual(statusOf(omar, context({ history: [touch('c3', 'email', 5), touch('c3', 'call', 40)] })), {
      kind: 'reached',
      how: 'email',
      days: 5,
    });
    assert.deepEqual(statusOf(omar, context({ history: [touch('c3', 'email', COLD_DAYS)] })), { kind: 'reached', how: 'email', days: COLD_DAYS });
    assert.deepEqual(statusOf(omar, context({ history: [touch('c3', 'email', COLD_DAYS + 1)] })), { kind: 'cold', days: COLD_DAYS + 1 });
  });

  it('falls back to when the contact was last touched, then to never', () => {
    assert.deepEqual(statusOf(person('c4', 'Huda', { touchedAt: ago(2) }), context()), { kind: 'reached', how: 'note', days: 2 });
    assert.deepEqual(statusOf(person('c5', 'Bader', { touchedAt: ago(45) }), context()), { kind: 'cold', days: 45 });
    assert.deepEqual(statusOf(person('c6', 'Al Noor Packaging'), context()), { kind: 'never' });
  });

  it('reads somebody else’s history as nobody’s', () => {
    assert.deepEqual(statusOf(person('c7', 'Reem'), context({ history: [touch('someone-else', 'call', 1)] })), { kind: 'never' });
  });
});

describe('the order', () => {
  const sara = person('c1', 'Sara Haddad');
  const mohammed = person('c2', 'Mohammed Al-Saadi');
  const reem = person('c3', 'Reem Al-Qahtani');
  const omar = person('c4', 'Omar Khalid');
  const bader = person('c5', 'Bader Al-Fahad');
  const noor = person('c6', 'Al Noor Packaging');
  const everyone = [noor, bader, omar, reem, mohammed, sara];

  const ctx = context({
    followUps: [
      owed('c3', { createdAt: ago(6), nextAt: ago(2), what: 'the coffee quote' }),
      owed('c2', { createdAt: ago(3), nextAt: ago(-1), what: 'the price list' }),
    ],
    history: [touch('c1', 'whatsapp', 1), touch('c4', 'email', 5), touch('c5', 'call', 44)],
  });

  it('puts what is owed first, then what is recent, then what is forgotten', () => {
    assert.deepEqual(
      orderForPicking(everyone, ctx).map((r) => r.contact.name),
      [
        'Reem Al-Qahtani', // owed, overdue by two days
        'Mohammed Al-Saadi', // owed, not yet due
        'Sara Haddad', // reached yesterday
        'Omar Khalid', // reached five days ago
        'Bader Al-Fahad', // nothing for six weeks
        'Al Noor Packaging', // never
      ]
    );
  });

  it('puts the longest wait first among the overdue', () => {
    const two = [person('a', 'A'), person('b', 'B')];
    const order = orderForPicking(
      two,
      context({
        followUps: [owed('a', { createdAt: ago(2), nextAt: ago(1) }), owed('b', { createdAt: ago(9), nextAt: ago(8) })],
      })
    );
    assert.deepEqual(order.map((r) => r.contact.name), ['B', 'A']);
  });

  /**
   * The decision worth protecting: a star says "I deal with them often",
   * not "they need me first". Before this, a favourite with nothing owed
   * sat above somebody who had been waiting a week.
   */
  it('does not let a favourite jump the queue', () => {
    const order = orderForPicking(everyone, { ...ctx, favorites: new Set(['c1']) });
    assert.deepEqual(order.slice(0, 3).map((r) => r.contact.name), ['Reem Al-Qahtani', 'Mohammed Al-Saadi', 'Sara Haddad']);
  });

  it('…but a favourite does break a tie inside a group', () => {
    const plain = person('p', 'Zed');
    const starred = person('s', 'Aziz');
    const order = orderForPicking([plain, starred], context({ favorites: new Set(['s']) }));
    assert.deepEqual(order.map((r) => r.contact.name), ['Aziz', 'Zed'], 'both are "never", so the star decides');
  });

  it('is stable by name when nothing else separates two people', () => {
    const order = orderForPicking([person('z', 'Zainab'), person('a', 'Aisha')], context());
    assert.deepEqual(order.map((r) => r.contact.name), ['Aisha', 'Zainab']);
  });

  it('keeps everyone it was given, and invents nobody', () => {
    assert.equal(orderForPicking(everyone, ctx).length, everyone.length);
    assert.deepEqual(orderForPicking([], ctx), []);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countsFor, describe as describeRule, hasCondition, holds, peopleIn, silentFor, type Condition, type ListWorld, type SmartList } from './smart-lists';
import { followUpStates } from './filters';
import type { Contact, FollowUp } from '@/lib/model-types';

const NOW = new Date('2026-10-15T12:00:00');
const DAY = 86_400_000;
const ago = (n: number): string => new Date(NOW.getTime() - n * DAY).toISOString();

const person = (id: string, over: Partial<Contact> = {}): Contact => ({
  id,
  name: `Name ${id}`,
  phone: '501234567',
  email: `${id}@example.com`,
  createdAt: ago(100),
  touchedAt: ago(1),
  ...over,
});

const followUp = (contactId: string): FollowUp => ({
  id: `f-${contactId}`,
  contactId,
  channel: 'whatsapp',
  who: `Name ${contactId}`,
  what: 'The quote',
  status: 'waiting',
  since: 'Sent',
  nextAt: ago(1),
});

const world = (over: Partial<ListWorld> = {}): ListWorld => ({ favorites: new Set(), followUps: [], now: NOW, ...over });

const list = (all: Condition[]): SmartList => ({ id: 'l1', name: 'A list', all, createdAt: ago(1) });

/** `holds` takes the follow-up states so a long list walks them once. */
const check = (condition: Condition, contact: Contact, w: ListWorld = world()): boolean =>
  holds(condition, contact, w, followUpStates([contact], w.followUps, w.now));

describe('silentFor', () => {
  it('counts the days since anything was sent', () => {
    assert.equal(silentFor(person('a', { touchedAt: ago(30) }), NOW), 30);
  });

  it('is null when nothing ever was, which is not the same as a long time', () => {
    assert.equal(silentFor(person('a', { touchedAt: undefined }), NOW), null);
  });
});

describe('each condition', () => {
  it('label matches as typed, and across Arabic spellings', () => {
    const c = person('a', { labels: ['Client'] });
    assert.equal(check({ kind: 'label', label: 'Client' }, c), true);
    assert.equal(check({ kind: 'label', label: 'client' }, c), true);
    assert.equal(check({ kind: 'label', label: 'Lead' }, c), false);
    const ar = person('b', { labels: ['محمّد'] });
    assert.equal(check({ kind: 'label', label: 'محمد' }, ar), true);
  });

  it('favourite reads the device list', () => {
    const c = person('a');
    assert.equal(check({ kind: 'favourite' }, c, world({ favorites: new Set(['a']) })), true);
    assert.equal(check({ kind: 'favourite' }, c), false);
  });

  it('quiet counts from the last thing sent', () => {
    assert.equal(check({ kind: 'quiet', days: 30 }, person('a', { touchedAt: ago(40) })), true);
    assert.equal(check({ kind: 'quiet', days: 30 }, person('a', { touchedAt: ago(10) })), false);
    assert.equal(check({ kind: 'quiet', days: 30 }, person('a', { touchedAt: ago(30) })), true, 'exactly 30 counts');
  });

  it('quiet never catches somebody who has never been written to', () => {
    // They belong in "never", not in a list about going cold: a contact added
    // this morning is not a relationship that has gone quiet.
    assert.equal(check({ kind: 'quiet', days: 30 }, person('a', { touchedAt: undefined })), false);
    assert.equal(check({ kind: 'never' }, person('a', { touchedAt: undefined })), true);
    assert.equal(check({ kind: 'never' }, person('a')), false);
  });

  it('waiting is an open follow-up of theirs', () => {
    const c = person('a');
    assert.equal(check({ kind: 'waiting' }, c, world({ followUps: [followUp('a')] })), true);
    assert.equal(check({ kind: 'waiting' }, c, world({ followUps: [{ ...followUp('a'), status: 'done' }] })), false);
    assert.equal(check({ kind: 'waiting' }, c), false);
  });

  it('a missing number or email counts blank as missing', () => {
    assert.equal(check({ kind: 'noPhone' }, person('a', { phone: undefined })), true);
    assert.equal(check({ kind: 'noPhone' }, person('a', { phone: '   ' })), true);
    assert.equal(check({ kind: 'noPhone' }, person('a')), false);
    assert.equal(check({ kind: 'noEmail' }, person('a', { email: undefined })), true);
    assert.equal(check({ kind: 'noEmail' }, person('a')), false);
  });
});

describe('peopleIn', () => {
  const contacts = [
    person('client-quiet', { labels: ['Client'], touchedAt: ago(40) }),
    person('client-warm', { labels: ['Client'], touchedAt: ago(2) }),
    person('lead-quiet', { labels: ['Lead'], touchedAt: ago(40) }),
    person('client-new', { labels: ['Client'], touchedAt: undefined }),
  ];

  it('joins its conditions with and', () => {
    const quietClients = list([{ kind: 'label', label: 'Client' }, { kind: 'quiet', days: 30 }]);
    assert.deepEqual(peopleIn(quietClients, contacts, world()).map((c) => c.id), ['client-quiet']);
  });

  it('holds nobody when the rule is empty, rather than everybody', () => {
    assert.deepEqual(peopleIn(list([]), contacts, world()), []);
  });

  it('puts the most recently contacted first', () => {
    const clients = list([{ kind: 'label', label: 'Client' }]);
    const ids = peopleIn(clients, contacts, world()).map((c) => c.id);
    assert.deepEqual(ids.slice(0, 2), ['client-warm', 'client-quiet']);
  });

  it('keeps itself up to date: answering a follow-up leaves the list', () => {
    const owing = list([{ kind: 'waiting' }]);
    const open = world({ followUps: [followUp('client-warm')] });
    assert.deepEqual(peopleIn(owing, contacts, open).map((c) => c.id), ['client-warm']);
    const answered = world({ followUps: [{ ...followUp('client-warm'), status: 'done' }] });
    assert.deepEqual(peopleIn(owing, contacts, answered), [], 'the rule re-ran, nothing was filed anywhere');
  });
});

describe('countsFor', () => {
  it('counts every list in one pass over the follow-ups', () => {
    const contacts = [person('a', { labels: ['Client'] }), person('b', { labels: ['Lead'] })];
    const counts = countsFor(
      [list([{ kind: 'label', label: 'Client' }]), { ...list([]), id: 'empty' }],
      contacts,
      world(),
    );
    assert.equal(counts.get('l1'), 1);
    assert.equal(counts.get('empty'), 0);
  });
});

describe('describe', () => {
  const words = { label: 'label', favourite: 'Favourites', quiet: 'No word for', waiting: 'Waiting on a reply', never: 'Never contacted', noPhone: 'No number', noEmail: 'No email' };

  it('reads the rule back as a sentence', () => {
    const rule = list([{ kind: 'label', label: 'Client' }, { kind: 'quiet', days: 30 }]);
    assert.equal(describeRule(rule, words, 'and', '{n} days'), 'Client and No word for 30 days');
  });

  it('says nothing for an empty rule', () => {
    assert.equal(describeRule(list([]), words, 'and', '{n} days'), '');
  });
});

describe('hasCondition', () => {
  it('tells the builder what is already on, so a tap toggles rather than repeats', () => {
    const rule = list([{ kind: 'label', label: 'Client' }, { kind: 'quiet', days: 30 }]);
    assert.equal(hasCondition(rule, { kind: 'label', label: 'Client' }), true);
    assert.equal(hasCondition(rule, { kind: 'label', label: 'Lead' }), false);
    assert.equal(hasCondition(rule, { kind: 'quiet', days: 30 }), true);
    assert.equal(hasCondition(rule, { kind: 'quiet', days: 7 }), false);
    assert.equal(hasCondition(rule, { kind: 'favourite' }), false);
  });
});

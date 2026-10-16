import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { filterCounts, filterPeople, floatFavorites, followUpStates, isRecent, labelFilter, labelsIn } from './filters';
import type { Contact, FollowUp } from '@/lib/model-types';

const NOW = new Date('2026-10-13T09:00:00');
const person = (id: string, name: string, over: Partial<Contact> = {}): Contact => ({
  id,
  name,
  createdAt: '2026-08-01T09:00:00.000Z',
  ...over,
});
const followUp = (id: string, who: string, status: FollowUp['status'], over: Partial<FollowUp> = {}): FollowUp => ({
  id,
  channel: 'whatsapp',
  who,
  what: 'Quote',
  status,
  since: '',
  ...over,
});

const A = person('a', 'Sara Haddad', { touchedAt: '2026-10-12T10:00:00.000Z' });
const B = person('b', 'Omar Khaled', { touchedAt: '2026-09-01T10:00:00.000Z' });
const C = person('c', 'Noura Al-Harbi', { touchedAt: '2026-10-10T10:00:00.000Z' });
const ALL = [A, B, C];

describe('follow-up states', () => {
  it('marks a follow-up that has come due, and one still waiting', () => {
    const states = followUpStates(
      ALL,
      [
        followUp('1', 'Omar Khaled', 'waiting', { contactId: 'b', nextAt: '2026-10-01T09:00:00' }),
        followUp('2', 'Sara Haddad', 'waiting', { contactId: 'a', nextAt: '2026-10-20T09:00:00' }),
      ],
      NOW
    );
    assert.equal(states.get('b'), 'due');
    assert.equal(states.get('a'), 'waiting');
  });
  it('ignores a closed one, and finds an older one by name', () => {
    const states = followUpStates(ALL, [followUp('1', 'Sara · Investor', 'done'), followUp('2', 'Noura Al-Harbi · Designer', 'waiting')], NOW);
    assert.equal(states.has('a'), false);
    assert.equal(states.get('c'), 'waiting');
  });
  it('lets the most urgent one win', () => {
    const states = followUpStates(
      ALL,
      [followUp('1', 'x', 'waiting', { contactId: 'a', nextAt: '2026-10-20T09:00:00' }), followUp('2', 'x', 'waiting', { contactId: 'a', nextAt: '2026-10-01T09:00:00' })],
      NOW
    );
    assert.equal(states.get('a'), 'due');
  });
});

describe('filterPeople', () => {
  const context = {
    followUps: [
      followUp('1', 'Sara Haddad', 'waiting', { contactId: 'a', nextAt: '2026-10-20T09:00:00' }),
      followUp('2', 'Omar Khaled', 'waiting', { contactId: 'b', nextAt: '2026-10-01T09:00:00' }),
    ],
    favorites: new Set(['c']),
    now: NOW,
  };
  it('shows everyone under All', () => assert.deepEqual(filterPeople('all', ALL, context).map((c) => c.id), ['a', 'b', 'c']));
  it('shows those with an open follow-up, the ones to nudge first', () => {
    assert.deepEqual(filterPeople('waiting', ALL, context).map((c) => c.id), ['b', 'a']);
  });
  it('shows the starred', () => assert.deepEqual(filterPeople('favorites', ALL, context).map((c) => c.id), ['c']));
  it('shows the last week, latest first', () => {
    assert.deepEqual(filterPeople('recent', ALL, context).map((c) => c.id), ['a', 'c']);
  });
  it('counts them for the badges', () => {
    assert.deepEqual(filterCounts(ALL, context), { waiting: 2, due: 1, favorites: 1, recent: 2 });
  });
});

describe('isRecent', () => {
  it('falls back to when the contact was added', () => {
    assert.equal(isRecent(person('n', 'New', { createdAt: '2026-10-12T09:00:00.000Z' }), NOW), true);
    assert.equal(isRecent(person('o', 'Old'), NOW), false);
  });
});

describe('floatFavorites', () => {
  it('puts the starred first and keeps the rest in order', () => {
    assert.deepEqual(floatFavorites(ALL, new Set(['c'])).map((c) => c.id), ['c', 'a', 'b']);
  });
});

describe('labels', () => {
  const contacts = [
    person('a', 'Sara', { labels: ['Client', 'VIP'] }),
    person('b', 'Omar', { labels: ['Client'] }),
    person('c', 'Reem', { labels: ['Lead'] }),
    person('d', 'Noura'),
  ];
  const context = { followUps: [], favorites: new Set<string>(), now: NOW };
  it('lists the labels in use, the most used first', () => {
    assert.deepEqual(labelsIn(contacts), ['Client', 'Lead', 'VIP']);
  });
  it('shows everyone with the label, and only them', () => {
    assert.deepEqual(filterPeople(labelFilter('Client'), contacts, context).map((c) => c.name), ['Sara', 'Omar']);
    assert.deepEqual(filterPeople(labelFilter('Nobody'), contacts, context), []);
  });
});

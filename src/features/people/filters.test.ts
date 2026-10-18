import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { actedOn, filterCounts, filterPeople, floatFavorites, followUpStates, isRecent, labelFilter, labelsIn } from './filters';
import type { Contact, FollowUp, HistoryEntry } from '@/lib/model-types';

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
    assert.deepEqual(filterCounts(ALL, context), { waiting: 2, due: 1, favorites: 1, recent: 2, untouched: 0 });
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

describe('who has actually been dealt with', () => {
  const logged = (contactId: string): HistoryEntry => ({ id: `h-${contactId}`, contactId, kind: 'call', text: 'Called', at: '2026-10-11T09:00:00.000Z' });
  /** Straight off a phone: added, and nothing done since. */
  const fresh = (id: string, name: string) => person(id, name);

  it('counts a message that went out', () => {
    assert.deepEqual([...actedOn([A], [], [])], ['a']);
  });

  it('counts something logged against them', () => {
    const d = fresh('d', 'Faisal Noor');
    assert.deepEqual([...actedOn([d], [logged('d')], [])], ['d']);
  });

  it('counts a follow-up, open or closed, and finds an older one by name', () => {
    const d = fresh('d', 'Faisal Noor');
    const e = fresh('e', 'Lina Saad');
    assert.deepEqual([...actedOn([d], [], [followUp('1', 'x', 'waiting', { contactId: 'd' })])], ['d']);
    assert.deepEqual([...actedOn([d], [], [followUp('1', 'x', 'done', { contactId: 'd' })])], ['d']);
    assert.deepEqual([...actedOn([e], [], [followUp('2', 'Lina Saad · Designer', 'waiting')])], ['e']);
  });

  it('does not count merely being added', () => {
    assert.deepEqual([...actedOn([fresh('d', 'Faisal Noor')], [], [])], []);
  });
});

describe('the Not contacted chip', () => {
  const imported = [
    person('d', 'Faisal Noor', { createdAt: '2026-10-13T08:00:00.000Z' }),
    person('e', 'Lina Saad', { createdAt: '2026-10-13T08:30:00.000Z' }),
  ];
  const everyone = [...ALL, ...imported];
  const context = { followUps: [], favorites: new Set<string>(), now: NOW, history: [] as HistoryEntry[] };

  it('shows only the people nothing has happened with', () => {
    assert.deepEqual(filterPeople('untouched', everyone, context).map((c) => c.id), ['e', 'd']);
  });

  it('puts the newest first, since those are the ones being worked through', () => {
    const ids = filterPeople('untouched', everyone, context).map((c) => c.id);
    assert.deepEqual(ids, ['e', 'd']);
  });

  it('drops somebody the moment anything is logged against them', () => {
    const history: HistoryEntry[] = [{ id: 'h1', contactId: 'd', kind: 'note', text: 'Met at the fair', at: '2026-10-13T09:00:00.000Z' }];
    assert.deepEqual(filterPeople('untouched', everyone, { ...context, history }).map((c) => c.id), ['e']);
  });

  it('drops somebody a follow-up was promised to', () => {
    const followUps = [followUp('1', 'Lina Saad', 'waiting', { contactId: 'e' })];
    assert.deepEqual(filterPeople('untouched', everyone, { ...context, followUps }).map((c) => c.id), ['d']);
  });

  it('counts them for the chip', () => {
    assert.equal(filterCounts(everyone, context).untouched, 2);
  });

  it('reads an absent history as nothing logged, for the sheets that never show the chip', () => {
    const { history: _history, ...noHistory } = context;
    assert.equal(filterCounts(everyone, noHistory).untouched, 2);
  });
});

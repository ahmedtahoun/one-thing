import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { answerLine, fileLine } from './answer-line';
import { added } from '@/content/additions';
import { setDialect } from '@/i18n/dialect';
import type { Contact, FollowUp, HistoryEntry, Task } from '@/lib/model-types';
import type { DataAnswer } from '@/lib/parse/ask-data';

const LANGS = ['en', 'ar'] as const;

const person = (over: Partial<Contact> = {}): Contact => ({
  id: 'c1',
  name: 'Sara Haddad',
  dial: '+966',
  phone: '501234567',
  email: 'sara@example.com',
  createdAt: '2026-10-01T09:00:00.000Z',
  ...over,
});
const task: Task = {
  id: 't1',
  type: 'call',
  title: 'Call Sara',
  contactIds: [],
  dueAt: '2026-10-15T16:00:00.000Z',
  remind: null,
  status: 'open',
  points: [],
  createdVia: 'quick',
  createdAt: '2026-10-01T09:00:00.000Z',
};
const followUp: FollowUp = { id: 'f1', channel: 'whatsapp', who: 'Omar', what: 'The quote', status: 'waiting', since: 'Sent Sunday' };
const entry: HistoryEntry = { id: 'h1', contactId: 'c1', kind: 'whatsapp', text: 'Sent the deck', at: '2026-10-12T09:00:00.000Z' };

/** One of every shape, full and empty, so no branch goes unwritten. */
const EVERY: readonly (readonly [string, DataAnswer])[] = [
  ['phone', { kind: 'person', want: 'phone', contact: person() }],
  ['phone, missing', { kind: 'person', want: 'phone', contact: person({ phone: undefined, dial: undefined }) }],
  ['email', { kind: 'person', want: 'email', contact: person() }],
  ['email, missing', { kind: 'person', want: 'email', contact: person({ email: undefined }) }],
  ['work', { kind: 'person', want: 'work', contact: person({ role: 'Northwind Ventures' }) }],
  ['work, missing', { kind: 'person', want: 'work', contact: person() }],
  ['all', { kind: 'person', want: 'all', contact: person({ role: 'Northwind Ventures' }) }],
  ['all, no role', { kind: 'person', want: 'all', contact: person() }],
  ['who', { kind: 'who', name: 'Daina', options: [person(), person({ id: 'c2' })], want: 'phone' }],
  ['nobody', { kind: 'nobody', name: null, want: 'all' }],
  ['history', { kind: 'history', contact: person(), entries: [entry] }],
  ['history, empty', { kind: 'history', contact: person(), entries: [] }],
  ['today', { kind: 'tasks', span: 'today', tasks: [task] }],
  ['today, empty', { kind: 'tasks', span: 'today', tasks: [] }],
  ['tomorrow', { kind: 'tasks', span: 'tomorrow', tasks: [task] }],
  ['tomorrow, empty', { kind: 'tasks', span: 'tomorrow', tasks: [] }],
  ['week', { kind: 'tasks', span: 'week', tasks: [task] }],
  ['week, empty', { kind: 'tasks', span: 'week', tasks: [] }],
  ['late', { kind: 'tasks', span: 'late', tasks: [task] }],
  ['late, empty', { kind: 'tasks', span: 'late', tasks: [] }],
  ['waiting', { kind: 'waiting', items: [followUp] }],
  ['waiting, empty', { kind: 'waiting', items: [] }],
  ['quiet', { kind: 'quiet', items: [{ contact: person(), days: 21 }] }],
  ['quiet, empty', { kind: 'quiet', items: [] }],
  ['label', { kind: 'people', of: 'label', label: 'Client', contacts: [person()] }],
  ['favourites', { kind: 'people', of: 'favorites', label: null, contacts: [person()] }],
  ['all people', { kind: 'people', of: 'all', label: null, contacts: [person()] }],
  ['people, empty', { kind: 'people', of: 'all', label: null, contacts: [] }],
  ['one thing', { kind: 'oneThing', oneThing: { date: '2026-10-15', title: 'Finish the proposal', done: false, focusMinutes: 45 } }],
  ['one thing, done', { kind: 'oneThing', oneThing: { date: '2026-10-15', title: 'Finish the proposal', done: true, focusMinutes: 45 } }],
  ['one thing, none', { kind: 'oneThing', oneThing: null }],
  ['next', { kind: 'next', task }],
  ['next, none', { kind: 'next', task: null }],
  ['log today', { kind: 'log', span: 'today', entries: [entry] }],
  ['log today, empty', { kind: 'log', span: 'today', entries: [] }],
  ['log yesterday', { kind: 'log', span: 'yesterday', entries: [entry] }],
  ['log yesterday, empty', { kind: 'log', span: 'yesterday', entries: [] }],
  ['log week', { kind: 'log', span: 'week', entries: [entry] }],
  ['log week, empty', { kind: 'log', span: 'week', entries: [] }],
  ['with person', { kind: 'withPerson', contact: person(), tasks: [task], followUps: [followUp] }],
  ['with person, nothing', { kind: 'withPerson', contact: person(), tasks: [], followUps: [] }],
  ['found task', { kind: 'findTask', query: 'when is the dentist?', tasks: [task] }],
  ['found tasks', { kind: 'findTask', query: 'the bank', tasks: [task, { ...task, id: 't2' }] }],
  ['unknown', { kind: 'unknown' }],
];

describe('answerLine', () => {
  for (const lang of LANGS) {
    const copy = added(lang).qa;
    for (const [name, answer] of EVERY) {
      it(`${lang}: ${name} reads as a sentence with nothing left to fill in`, () => {
        const line = answerLine(answer, copy);
        assert.ok(line.trim().length > 0, 'empty line');
        assert.ok(!/\{[a-z]+\}/i.test(line), `a placeholder reached the screen: ${line}`);
      });
    }
  }

  /**
   * And in Egyptian, which is a third set of words over the same shapes
   * (src/content/egyptian.ts). The copy has to be read *inside* the test,
   * after the dialect is set, because `added` answers for whichever dialect
   * is current when it is called.
   */
  it('reads as a sentence in Egyptian too, for every shape', () => {
    setDialect('egypt');
    try {
      for (const [name, answer] of EVERY) {
        const line = answerLine(answer, added('ar').qa);
        assert.ok(line.trim().length > 0, `${name}: empty line`);
        assert.ok(!/\{[a-z]+\}/i.test(line), `${name}: a placeholder reached the screen: ${line}`);
      }
    } finally {
      setDialect('gulf');
    }
  });

  it('counts the tasks and the people waiting as one number', () => {
    // The question was about the person, so two tasks and one reply owed is
    // three things open with them, not two lists.
    const answer: DataAnswer = { kind: 'withPerson', contact: person(), tasks: [task, { ...task, id: 't2' }], followUps: [followUp] };
    assert.equal(answerLine(answer, added('en').qa), 'Still open with Sara Haddad: 3');
  });

  it('counts four emails to one person as one person waiting', () => {
    const four: FollowUp[] = [0, 1, 2, 3].map((i) => ({ ...followUp, id: `f${i}` }));
    const answer: DataAnswer = { kind: 'withPerson', contact: person(), tasks: [], followUps: four };
    assert.equal(answerLine(answer, added('en').qa), 'Still open with Sara Haddad: 1');
  });

  it('says there is nothing rather than counting nought', () => {
    const answer: DataAnswer = { kind: 'withPerson', contact: person(), tasks: [], followUps: [] };
    assert.equal(answerLine(answer, added('en').qa), 'Nothing open with Sara Haddad.');
  });

  it('gives the number with its code, as the design shows it', () => {
    const line = answerLine({ kind: 'person', want: 'phone', contact: person() }, added('en').qa);
    assert.equal(line.replace(/[\u2066-\u2069]/g, ''), 'Sara Haddad: +966 501234567');
  });

  /**
   * Found in an Arabic screenshot: "+971 50 331 2045" came out with its
   * groups reordered, because a run of digits and spaces inside an Arabic
   * line is laid out right to left. A number read in the wrong order is
   * worse than an ugly one, so it is isolated — the same mark People and
   * Import use.
   */
  it('keeps a phone number in its own direction, whatever the line around it', () => {
    for (const lang of LANGS) {
      const line = answerLine({ kind: 'person', want: 'phone', contact: person() }, added(lang).qa);
      assert.match(line, /\u2066\+966 501234567\u2069/, `${lang}: ${JSON.stringify(line)}`);
    }
  });

  it('says it has no number rather than showing a blank', () => {
    const line = answerLine({ kind: 'person', want: 'phone', contact: person({ phone: undefined }) }, added('en').qa);
    assert.equal(line, 'I don’t have a number for Sara Haddad.');
  });

  it('counts nothing as a sentence, never as a nought', () => {
    for (const lang of LANGS) {
      const copy = added(lang).qa;
      for (const answer of [
        { kind: 'tasks', span: 'today', tasks: [] },
        { kind: 'waiting', items: [] },
        { kind: 'quiet', items: [] },
        { kind: 'people', of: 'all', label: null, contacts: [] },
      ] as DataAnswer[]) {
        assert.ok(!/\b0\b|٠/.test(answerLine(answer, copy)), `${lang}: ${answerLine(answer, copy)}`);
      }
    }
  });

  it('says the One Thing itself, not only that there is one', () => {
    const one = { date: '2026-10-15', title: 'Finish the investor proposal', done: false, focusMinutes: 45 };
    assert.equal(answerLine({ kind: 'oneThing', oneThing: one }, added('en').qa), 'Your One Thing today: Finish the investor proposal');
    assert.ok(answerLine({ kind: 'oneThing', oneThing: { ...one, done: true } }, added('en').qa).startsWith('Done today'));
    assert.ok(answerLine({ kind: 'oneThing', oneThing: one }, added('ar').qa).includes('شغلك الأساسي اليوم'));
  });

  it('counts an empty day as a sentence here too', () => {
    for (const lang of LANGS) {
      const copy = added(lang).qa;
      for (const answer of [
        { kind: 'log', span: 'today', entries: [] },
        { kind: 'log', span: 'week', entries: [] },
        { kind: 'next', task: null },
        { kind: 'oneThing', oneThing: null },
      ] as DataAnswer[]) {
        assert.ok(!/\b0\b|٠/.test(answerLine(answer, copy)), `${lang}: ${answerLine(answer, copy)}`);
      }
    }
  });

  it('names the label it counted', () => {
    const line = answerLine({ kind: 'people', of: 'label', label: 'Client', contacts: [person(), person({ id: 'c2' })] }, added('en').qa);
    assert.equal(line, '2 tagged Client');
  });
});

describe('fileLine', () => {
  const row = (key: string, over: Record<string, unknown> = {}) => ({ key, name: `Name ${key}`, phone: '501234567', issues: [], ...over }) as never;

  it('counts what one sheet held', () => {
    assert.equal(fileLine({ candidates: [row('a'), row('b')], skipped: 0 }, added('en').clip), 'Found 2 people');
  });

  it('names the sheets when a workbook had more than one', () => {
    const candidates = [row('a', { sheet: 'Leads' }), row('b', { sheet: 'Clients' }), row('c', { sheet: 'Leads' })];
    assert.equal(fileLine({ candidates, skipped: 0 }, added('en').clip), 'Found 3 people in 2 sheets');
  });

  it('says how many were already saved and how many were skipped', () => {
    const candidates = [row('a'), row('b', { duplicateIn: 'people', duplicateOf: 'c1' })];
    assert.equal(fileLine({ candidates, skipped: 2 }, added('en').clip), 'Found 2 people · 1 already saved · 2 skipped');
  });

  it('leaves out what did not happen, rather than counting nought', () => {
    const line = fileLine({ candidates: [row('a')], skipped: 0 }, added('en').clip);
    assert.ok(!/\b0\b/.test(line), line);
    assert.ok(!/already|skipped/.test(line), line);
  });

  it('says a file held nobody rather than reporting nought found', () => {
    for (const lang of LANGS) {
      const line = fileLine({ candidates: [], skipped: 3 }, added(lang).clip);
      assert.equal(line, added(lang).clip.nothing);
    }
  });

  it('reads as a sentence in both languages with nothing left to fill in', () => {
    for (const lang of LANGS) {
      const candidates = [row('a', { sheet: 'A' }), row('b', { sheet: 'B', duplicateIn: 'people', duplicateOf: 'c1' })];
      const line = fileLine({ candidates, skipped: 1 }, added(lang).clip);
      assert.ok(line.trim().length > 0);
      assert.ok(!/\{[a-z]+\}/i.test(line), line);
    }
  });
});

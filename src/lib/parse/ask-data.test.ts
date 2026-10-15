import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { askData, isQuestion, labelIn, quietIn, tasksIn, waitingIn, type DataAnswer, type DataWorld } from './ask-data';
import type { Contact, FollowUp, HistoryEntry, Task } from '@/lib/model-types';

const NOW = new Date('2026-10-15T10:00:00.000Z');

const person = (id: string, name: string, over: Partial<Contact> = {}): Contact => ({
  id,
  name,
  dial: '+966',
  phone: '501234567',
  email: `${id}@example.com`,
  createdAt: '2026-10-01T09:00:00.000Z',
  ...over,
});

const task = (id: string, title: string, dueAt: string | null, over: Partial<Task> = {}): Task => ({
  id,
  type: 'call',
  title,
  contactIds: [],
  dueAt,
  remind: null,
  status: 'open',
  points: [],
  createdVia: 'quick',
  createdAt: '2026-10-01T09:00:00.000Z',
  ...over,
});

const followUp = (id: string, who: string, over: Partial<FollowUp> = {}): FollowUp => ({
  id,
  channel: 'whatsapp',
  who,
  what: 'The quote',
  status: 'waiting',
  since: 'Sent Sunday',
  nextAt: '2026-10-16T09:00:00.000Z',
  createdAt: '2026-10-10T09:00:00.000Z',
  ...over,
});

const entry = (id: string, contactId: string, at: string, text = 'Sent the deck'): HistoryEntry => ({
  id,
  contactId,
  kind: 'whatsapp',
  text,
  at,
});

const world = (over: Partial<DataWorld> = {}): DataWorld => ({
  contacts: [person('c1', 'Sara Haddad'), person('c2', 'Omar Khalid', { role: 'Ledger Co' })],
  tasks: [],
  followUps: [],
  history: [],
  favorites: new Set(),
  cadence: new Map(),
  now: NOW,
  ...over,
});

const kindOf = (answer: DataAnswer | null): string | null => (answer === null ? null : answer.kind);

describe('isQuestion', () => {
  it('reads a question mark in either script', () => {
    assert.equal(isQuestion('Sara'), false);
    assert.equal(isQuestion('Sara?'), true);
    assert.equal(isQuestion('سارة؟'), true);
  });

  it('reads an opening question word without the mark', () => {
    assert.equal(isQuestion("what's late"), true);
    assert.equal(isQuestion('who owes me a reply'), true);
    assert.equal(isQuestion('وش عندي بكرة'), true);
    assert.equal(isQuestion('مين مستني ردي'), true);
  });

  it('reads being asked to show a list', () => {
    assert.equal(isQuestion('show my favourites'), true);
    assert.equal(isQuestion('ورني المفضلة'), true);
  });

  it('is false for a plain instruction', () => {
    assert.equal(isQuestion('Call Sara tomorrow at 4'), false);
    assert.equal(isQuestion('Send Omar the contract'), false);
    assert.equal(isQuestion('كلم سارة بكرة'), false);
    assert.equal(isQuestion('ابعت لعمر العقد'), false);
  });

  it('lets a task verb win over a question word, which is the hard case', () => {
    // "Remind me to ask Sara what the price is" is a task that holds "what".
    assert.equal(isQuestion('Remind me to ask Sara what the price is'), false);
    assert.equal(isQuestion('فكرني اسأل سارة ايش السعر'), false);
  });

  it('…but punctuation still wins, because no instruction ends in a question mark', () => {
    assert.equal(isQuestion('remind me what I owe Sara?'), true);
  });
});

describe('a task is never read as a question', () => {
  for (const said of [
    'Call Sara tomorrow at 4',
    'Email Omar the quote on Thursday',
    'Remind me to pay the invoice by 5',
    'كلم سارة بكرة الساعة ٤',
    'ابعت لعمر العرض الخميس',
    'فكرني ادفع الفاتورة',
  ]) {
    it(`"${said}" goes to the parser`, () => {
      assert.equal(askData(said, world()), null);
    });
  }
});

describe('a person', () => {
  it('answers their number', () => {
    const answer = askData("what's Sara's number?", world());
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.want, 'phone');
    assert.equal(answer.contact.id, 'c1');
  });

  it('answers their email', () => {
    const answer = askData("what is Omar's email?", world());
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.want, 'email');
    assert.equal(answer.contact.id, 'c2');
  });

  it('answers where they work', () => {
    const answer = askData('Where does Omar work?', world());
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.want, 'work');
  });

  it('answers in Arabic, for a person saved in Arabic', () => {
    const w = world({ contacts: [person('ar1', 'سارة حداد')] });
    const answer = askData('رقم سارة؟', w);
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.want, 'phone');
    assert.equal(answer.contact.id, 'ar1');
  });

  it('says nobody when the question is Arabic and the name was saved in Latin letters', () => {
    // Matching across scripts is src/lib/parse/names.ts's business, and it
    // does not claim this one. Recorded so a change there is noticed here.
    assert.equal(kindOf(askData('رقم سارة؟', world())), 'nobody');
  });

  it('matches a name written in the other spelling', () => {
    const ahmed = person('c3', 'أحمد صلاح');
    const answer = askData('رقم احمد؟', world({ contacts: [ahmed] }));
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.contact.id, 'c3');
  });

  it('offers the choice when the name fits several people', () => {
    const two = [person('a', 'Daina Ahmed'), person('b', 'Daina Yousef')];
    const answer = askData("what's Daina's number?", world({ contacts: two }));
    assert.equal(answer?.kind, 'who');
    if (answer?.kind !== 'who') return;
    assert.equal(answer.options.length, 2);
  });

  it('says so when the person is not in People', () => {
    assert.equal(kindOf(askData("what's Khalid's number?", world())), 'nobody');
  });

  it('answers "who is X" with everything', () => {
    const answer = askData('Who is Omar?', world());
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.want, 'all');
  });

  it('answers a bare name followed by a question mark', () => {
    const answer = askData('Sara?', world());
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.contact.id, 'c1');
  });
});

describe('history with a person', () => {
  const history = [entry('h1', 'c1', '2026-10-05T09:00:00.000Z'), entry('h2', 'c1', '2026-10-12T09:00:00.000Z', 'Called'), entry('h3', 'c2', '2026-10-13T09:00:00.000Z')];

  it('answers when I last spoke to them, newest first', () => {
    const answer = askData('When did I last talk to Sara?', world({ history }));
    assert.equal(answer?.kind, 'history');
    if (answer?.kind !== 'history') return;
    assert.equal(answer.contact.id, 'c1');
    assert.deepEqual(answer.entries.map((e) => e.id), ['h2', 'h1']);
  });

  it('answers what I sent them', () => {
    const answer = askData('What did I send Omar?', world({ history }));
    assert.equal(answer?.kind, 'history');
    if (answer?.kind !== 'history') return;
    assert.deepEqual(answer.entries.map((e) => e.id), ['h3']);
  });

  it('answers in Arabic, for a person saved in Arabic', () => {
    const w = world({ contacts: [person('ar1', 'سارة حداد')], history: [entry('h9', 'ar1', '2026-10-12T09:00:00.000Z')] });
    const answer = askData('امتى اخر مرة كلمت سارة؟', w);
    assert.equal(answer?.kind, 'history');
    if (answer?.kind !== 'history') return;
    assert.deepEqual(answer.entries.map((e) => e.id), ['h9']);
  });

  it('comes back empty rather than wrong when there is no history', () => {
    const answer = askData('When did I last talk to Sara?', world());
    assert.equal(answer?.kind, 'history');
    if (answer?.kind !== 'history') return;
    assert.deepEqual(answer.entries, []);
  });
});

describe('the list', () => {
  const tasks = [
    task('t1', 'Yesterday', '2026-10-14T09:00:00.000Z'),
    task('t2', 'Today, early', '2026-10-15T08:00:00.000Z'),
    task('t3', 'Today, later', '2026-10-15T16:00:00.000Z'),
    task('t4', 'Tomorrow', '2026-10-16T09:00:00.000Z'),
    task('t5', 'In five days', '2026-10-20T09:00:00.000Z'),
    task('t6', 'In three weeks', '2026-11-05T09:00:00.000Z'),
    task('t7', 'Done already', '2026-10-15T09:00:00.000Z', { status: 'done' }),
    task('t8', 'No day at all', null),
  ];
  const w = world({ tasks });

  it('answers today, soonest first, and leaves out what is done or undated', () => {
    assert.deepEqual(tasksIn('today', w).map((t) => t.id), ['t2', 't3']);
  });

  it('answers tomorrow', () => {
    assert.deepEqual(tasksIn('tomorrow', w).map((t) => t.id), ['t4']);
  });

  it('answers the week ahead, which does not reach a month out', () => {
    assert.deepEqual(tasksIn('week', w).map((t) => t.id), ['t2', 't3', 't4', 't5']);
  });

  it('answers what is late — everything past, not just today', () => {
    assert.deepEqual(tasksIn('late', w).map((t) => t.id), ['t1', 't2']);
  });

  it('reads the question for each stretch', () => {
    const span = (said: string) => {
      const answer = askData(said, w);
      return answer?.kind === 'tasks' ? answer.span : null;
    };
    assert.equal(span('What do I have today?'), 'today');
    assert.equal(span('What do I have tomorrow?'), 'tomorrow');
    assert.equal(span('What do I have this week?'), 'week');
    assert.equal(span("What's late?"), 'late');
    assert.equal(span('وش عندي بكرة؟'), 'tomorrow');
    assert.equal(span('ايه عندي اليوم؟'), 'today');
    assert.equal(span('ايش متأخر؟'), 'late');
  });

  it('reads "plan my day" as today, so the plan no longer needs the server', () => {
    assert.equal(kindOf(askData("what's on my plate today?", w)), 'tasks');
  });
});

describe('who is waiting', () => {
  const followUps = [followUp('f1', 'Sara'), followUp('f2', 'Omar', { nextAt: '2026-10-14T09:00:00.000Z' }), followUp('f3', 'Noura', { status: 'done' })];

  it('leaves out the ones closed, and puts the most overdue first', () => {
    assert.deepEqual(waitingIn(world({ followUps })).map((f) => f.id), ['f2', 'f1']);
  });

  it('reads the question in both languages', () => {
    assert.equal(kindOf(askData("Who's waiting for my reply?", world({ followUps }))), 'waiting');
    assert.equal(kindOf(askData('Who owes me a reply?', world({ followUps }))), 'waiting');
    assert.equal(kindOf(askData('مين مستني ردي؟', world({ followUps }))), 'waiting');
  });
});

describe('who has gone quiet', () => {
  const old = (id: string, name: string, days: number): Contact =>
    person(id, name, { touchedAt: new Date(NOW.getTime() - days * 86_400_000).toISOString() });

  it('uses the Next queue rule: a rhythm of their own, or a favourite after two weeks', () => {
    const contacts = [old('a', 'Sara Haddad', 30), old('b', 'Omar Khalid', 30), old('c', 'Noura Al-Harbi', 3)];
    const items = quietIn(world({ contacts, favorites: new Set(['b']), cadence: new Map([['a', 7]]) }));
    assert.deepEqual(items.map((q) => q.contact.id), ['a', 'b']);
    assert.equal(items[0]?.days, 30);
  });

  it('counts nobody who has no rhythm and is not a favourite', () => {
    assert.deepEqual(quietIn(world({ contacts: [old('a', 'Sara Haddad', 90)] })), []);
  });

  it('respects a rhythm of nought, which means never remind me', () => {
    const contacts = [old('a', 'Sara Haddad', 90)];
    assert.deepEqual(quietIn(world({ contacts, favorites: new Set(['a']), cadence: new Map([['a', 0]]) })), []);
  });

  it('reads the question in both languages', () => {
    const w = world({ contacts: [old('a', 'Sara Haddad', 30)], favorites: new Set(['a']) });
    assert.equal(kindOf(askData("Who haven't I talked to in a while?", w)), 'quiet');
    assert.equal(kindOf(askData('مين ما كلمته من زمان؟', w)), 'quiet');
  });

  it('is the list even when a name brushes the question, because it opens with "who"', () => {
    const w = world({ contacts: [old('a', 'Sara Haddad', 30)], favorites: new Set(['a']) });
    assert.equal(kindOf(askData("Who haven't I talked to, like Sara?", w)), 'quiet');
  });

  it('…but a question about one person stays about them', () => {
    const w = world({ contacts: [old('a', 'Sara Haddad', 30)], favorites: new Set(['a']) });
    assert.equal(kindOf(askData('When did I last talk to Sara?', w)), 'history');
  });
});

describe('people, labels and counts', () => {
  const contacts = [
    person('c1', 'Sara Haddad', { labels: ['Client'] }),
    person('c2', 'Omar Khalid', { labels: ['Lead'] }),
    person('c3', 'Noura Al-Harbi', { labels: ['Client', 'Lead'] }),
  ];
  const w = world({ contacts, favorites: new Set(['c2']) });

  it('counts the people on a label', () => {
    const answer = askData('How many clients do I have?', w);
    assert.equal(answer?.kind, 'people');
    if (answer?.kind !== 'people') return;
    assert.equal(answer.of, 'label');
    assert.equal(answer.label, 'Client');
    assert.deepEqual(answer.contacts.map((c) => c.id), ['c1', 'c3']);
  });

  it('lists the people on a label', () => {
    const answer = askData("Who's tagged Lead?", w);
    assert.equal(answer?.kind, 'people');
    if (answer?.kind !== 'people') return;
    assert.deepEqual(answer.contacts.map((c) => c.id), ['c2', 'c3']);
  });

  it('shows the favourites', () => {
    const answer = askData('Show my favourites', w);
    assert.equal(answer?.kind, 'people');
    if (answer?.kind !== 'people') return;
    assert.equal(answer.of, 'favorites');
    assert.deepEqual(answer.contacts.map((c) => c.id), ['c2']);
  });

  it('counts everyone', () => {
    const answer = askData('How many contacts do I have?', w);
    assert.equal(answer?.kind, 'people');
    if (answer?.kind !== 'people') return;
    assert.equal(answer.of, 'all');
    assert.equal(answer.contacts.length, 3);
  });

  it('answers in Arabic', () => {
    assert.equal(kindOf(askData('كم عميل عندي؟', w)), 'people');
    assert.equal(kindOf(askData('ورني المفضلة', w)), 'people');
  });

  it('matches the longest label, so one label does not answer for another', () => {
    const two = world({ contacts: [person('a', 'A', { labels: ['Lead'] }), person('b', 'B', { labels: ['Lead East'] })] });
    assert.equal(labelIn('who is tagged Lead East?', two), 'Lead East');
  });
});

describe('a question it cannot answer', () => {
  for (const said of ['What is the capital of France?', 'How do I invoice in euros?', 'Why is the sky blue?', 'ليش السماء زرقاء؟', 'ايش افضل مطعم؟']) {
    it(`"${said}" is a question, not a task`, () => {
      assert.equal(kindOf(askData(said, world())), 'unknown');
    });
  }

  it('never answers "unknown" to something that should become a task', () => {
    assert.equal(askData('Call Sara tomorrow', world()), null);
  });
});

describe('what it leaves to the parser', () => {
  it('answers "Arrange my day", which is an instruction and not a question', () => {
    const answer = askData('Arrange my day', world());
    assert.equal(answer?.kind, 'tasks');
    if (answer?.kind !== 'tasks') return;
    assert.equal(answer.span, 'today');
  });

  it('answers "Who am I waiting on?" — the app\'s own chip', () => {
    assert.equal(kindOf(askData('Who am I waiting on?', world())), 'waiting');
  });

  it('leaves a promise alone: it is something to remember, not to look up', () => {
    assert.equal(askData("I told Omar I'd send the contract Thursday", world()), null);
    assert.equal(askData('قلت لعمر إني أرسل العقد الخميس', world()), null);
  });

  it('leaves a waiting statement alone, so it still becomes a follow-up', () => {
    assert.equal(askData('Waiting for Sara to reply about the quote', world()), null);
    assert.equal(askData('Sara hasn’t answered about the quote', world()), null);
  });

  it('…but still answers the question about who is waiting', () => {
    assert.equal(kindOf(askData('What am I waiting for?', world())), 'waiting');
  });
});

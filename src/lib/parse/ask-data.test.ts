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
  oneThing: null,
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

describe('the ways people actually ask', () => {
  /**
   * Every line here was typed into a real build and came back "I'm best
   * with your people and your follow-ups" — the app saying it cannot read
   * its own list.
   */
  const withTasks = () => world({ tasks: [task('t1', 'Call the lawyer', '2026-10-15T14:00:00.000Z')] });

  for (const said of ['What tasks I have today', 'What tasks do I have?', 'my tasks', "what's on?", 'what do I have', 'وش مهامي؟', 'وش عندي اليوم؟']) {
    it(`answers "${said}" with the day's list`, () => {
      const answer = askData(said, withTasks());
      assert.equal(answer?.kind, 'tasks', said);
      if (answer?.kind !== 'tasks') return;
      assert.equal(answer.span, 'today');
    });
  }

  for (const said of ['What tasks should I have done', 'did I miss anything?', 'what was I supposed to do?', 'وش فاتني؟']) {
    it(`answers "${said}" with what is late`, () => {
      const answer = askData(said, withTasks());
      assert.equal(answer?.kind, 'tasks', said);
      if (answer?.kind !== 'tasks') return;
      assert.equal(answer.span, 'late');
    });
  }

  it('still leaves a task alone, however much it sounds like a list', () => {
    assert.equal(askData('Remind me to do my tasks tomorrow', world()), null);
  });
});

describe('keeping the thread', () => {
  const sara = person('c1', 'Sara Haddad');

  it('answers a detail question about the person the chat is already about', () => {
    const answer = askData('and her email?', world(), { contact: sara });
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.want, 'email');
    assert.equal(answer.contact.id, 'c1');
  });

  it('does the same in Arabic, where the pronoun is inside the word', () => {
    const answer = askData('وش رقمها؟', world(), { contact: sara });
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.want, 'phone');
    assert.equal(answer.contact.id, 'c1');
  });

  /**
   * The failure the whole feature is for. Without a subject the same
   * sentence names nobody, and saying so is right — it is only a
   * conversation when something came before it.
   */
  it('still says it does not know who, with nothing before it', () => {
    assert.equal(kindOf(askData('and her email?', world())), 'nobody');
  });

  /**
   * The one that matters: a question about the person asking must never be
   * answered with the last person's details. What it answers *instead*
   * differs by language and does not matter — "nobody" in English, where
   * "number" is still a detail word, and "I can't answer that" in Arabic,
   * where "رقمي" is one word and no detail word matches. Both are honest;
   * handing over Sara's number would not be.
   */
  it('never reads "my" as the person being talked about', () => {
    for (const said of ["what's my number?", 'وش رقمي؟', 'what is my email?']) {
      const answer = askData(said, world(), { contact: sara });
      assert.notEqual(answer?.kind, 'person', said);
    }
  });

  it('lets a name in the question win over the one remembered', () => {
    const answer = askData("what's Omar's email?", world(), { contact: sara });
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.contact.id, 'c2');
  });

  it('carries the person into a history question', () => {
    const w = world({ history: [entry('h1', 'c1', '2026-10-14T09:00:00.000Z')] });
    const answer = askData('when did I last talk to him?', w, { contact: sara });
    assert.equal(answer?.kind, 'history');
    if (answer?.kind !== 'history') return;
    assert.equal(answer.contact.id, 'c1');
    assert.equal(answer.entries.length, 1);
  });

  it('answers a bare pronoun with the person themselves', () => {
    const answer = askData('what about him?', world(), { contact: sara });
    assert.equal(answer?.kind, 'person');
    if (answer?.kind !== 'person') return;
    assert.equal(answer.want, 'all');
  });

  /**
   * Caught by a browser run: with Sara remembered, "what's Jane's number?"
   * came back with *Sara's* number. A name the app does not know is still
   * a name, and the honest answer is that she is not in People.
   */
  it('does not answer a question about somebody else with the person remembered', () => {
    const answer = askData("what's Jane's number?", world(), { contact: sara });
    assert.equal(answer?.kind, 'nobody');
    if (answer?.kind !== 'nobody') return;
    assert.equal(answer.name, 'Jane');
  });

  it('does not turn a list question into one about the person remembered', () => {
    assert.equal(kindOf(askData("what's late?", world(), { contact: sara })), 'tasks');
    assert.equal(kindOf(askData('who is waiting on me?', world(), { contact: sara })), 'waiting');
  });
});

describe('two people with one name', () => {
  const two = () => world({ contacts: [person('c1', 'Sara Haddad'), person('c9', 'Sara Mansour'), person('c2', 'Omar Khalid')] });

  it('asks which, rather than picking one', () => {
    const answer = askData("what's Sara's number?", two());
    assert.equal(answer?.kind, 'who');
    if (answer?.kind !== 'who') return;
    assert.equal(answer.options.length, 2);
  });

  /**
   * The part that makes choosing worth anything: the question comes with
   * the choice, so picking a Sara answers *the number*, instead of opening
   * her profile and leaving the question behind.
   */
  it('carries what was asked about them', () => {
    for (const [said, want] of [
      ["what's Sara's number?", 'phone'],
      ["what's Sara's email?", 'email'],
      ['where does Sara work?', 'work'],
      ['who is Sara?', 'all'],
    ] as const) {
      const answer = askData(said, two());
      assert.equal(answer?.kind, 'who', said);
      if (answer?.kind !== 'who') continue;
      assert.equal(answer.want, want, said);
    }
  });

  it('carries it for somebody who is not in People either', () => {
    const answer = askData("what's Jane's number?", two());
    assert.equal(answer?.kind, 'nobody');
    if (answer?.kind !== 'nobody') return;
    assert.equal(answer.want, 'phone');
  });
});

describe('the day itself', () => {
  const ONE = { date: '2026-10-15', title: 'Finish the investor proposal', done: false, focusMinutes: 45 };

  it('answers what today’s One Thing is', () => {
    const answer = askData("what's my one thing today?", world({ oneThing: ONE }));
    assert.equal(answer?.kind, 'oneThing');
    if (answer?.kind !== 'oneThing') return;
    assert.equal(answer.oneThing?.title, ONE.title);
  });

  it('says so when none has been named, rather than answering with a task', () => {
    const answer = askData('وش شغلي الأساسي اليوم؟', world());
    assert.equal(answer?.kind, 'oneThing');
    if (answer?.kind !== 'oneThing') return;
    assert.equal(answer.oneThing, null);
  });

  /** The line between the two questions: one task, or the day's list. */
  it('keeps "what do I have today?" as the day’s list', () => {
    assert.equal(kindOf(askData('what do I have today?', world({ oneThing: ONE }))), 'tasks');
  });

  it('answers "what’s next?" with the most overdue thing', () => {
    const w = world({
      tasks: [
        task('t1', 'Call the lawyer', '2026-10-15T07:00:00.000Z'),
        task('t2', 'Email Sara', '2026-10-14T07:00:00.000Z'),
        task('t3', 'Book the dentist', '2026-10-15T14:00:00.000Z'),
      ],
    });
    const answer = askData("what's next?", w);
    assert.equal(answer?.kind, 'next');
    if (answer?.kind !== 'next') return;
    assert.equal(answer.task?.id, 't2', 'the oldest late one comes first');
  });

  it('…and with the soonest to come when nothing is late', () => {
    const w = world({ tasks: [task('t3', 'Book the dentist', '2026-10-15T14:00:00.000Z'), task('t4', 'Pay the invoice', '2026-10-18T09:00:00.000Z')] });
    const answer = askData('what should I do now?', w);
    assert.equal(answer?.kind, 'next');
    if (answer?.kind !== 'next') return;
    assert.equal(answer.task?.id, 't3');
  });

  it('…and with nothing at all when nothing is open', () => {
    const answer = askData('وش التالي؟', world());
    assert.equal(answer?.kind, 'next');
    if (answer?.kind !== 'next') return;
    assert.equal(answer.task, null);
  });

  /**
   * Read off history, because history is the only thing this app dates. A
   * `Task` has no finished-at, so "how many did I close today" is a number
   * nobody can know — `src/features/recap/week.ts` decided that, and this
   * answers the question it can answer instead.
   */
  it('answers what was actually done today', () => {
    const w = world({
      history: [
        entry('h1', 'c1', '2026-10-15T08:30:00.000Z', 'Called about the quote'),
        entry('h2', 'c2', '2026-10-09T08:30:00.000Z', 'Sent the deck'),
      ],
    });
    const answer = askData('what did I do today?', w);
    assert.equal(answer?.kind, 'log');
    if (answer?.kind !== 'log') return;
    assert.equal(answer.span, 'today');
    assert.deepEqual(
      answer.entries.map((e) => e.id),
      ['h1']
    );
  });

  /**
   * "Who did I call yesterday?" used to be answered with today's log, which
   * is a wrong answer rather than a missing one. Yesterday has an end as
   * well as a beginning.
   */
  it('keeps yesterday to yesterday', () => {
    const w = world({
      history: [
        entry('h1', 'c1', '2026-10-15T08:30:00.000Z', 'Today'),
        entry('h2', 'c2', '2026-10-14T19:00:00.000Z', 'Yesterday evening'),
        entry('h3', 'c2', '2026-10-13T19:00:00.000Z', 'The day before'),
      ],
    });
    const answer = askData('who did I call yesterday?', w);
    assert.equal(answer?.kind, 'log');
    if (answer?.kind !== 'log') return;
    assert.equal(answer.span, 'yesterday');
    assert.deepEqual(
      answer.entries.map((e) => e.id),
      ['h2']
    );
  });

  it('widens to the week when the week is what was asked', () => {
    const w = world({
      history: [
        entry('h1', 'c1', '2026-10-15T08:30:00.000Z'),
        entry('h2', 'c2', '2026-10-11T08:30:00.000Z'),
        entry('h3', 'c2', '2026-09-20T08:30:00.000Z'),
      ],
    });
    const answer = askData('who did I talk to this week?', w);
    assert.equal(answer?.kind, 'log');
    if (answer?.kind !== 'log') return;
    assert.equal(answer.span, 'week');
    assert.deepEqual(
      answer.entries.map((e) => e.id),
      ['h1', 'h2'],
      'newest first, and nothing from last month'
    );
  });
});

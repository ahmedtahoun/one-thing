/**
 * Egyptian Arabic as something people *type*, not only something the app
 * says back. Run with `npm test`.
 *
 * Egyptian arrived as an output dialect: `src/content/egyptian.ts` rewrites
 * the app's own words, and `egyptian-lines.test.ts` holds that copy down. The
 * parser was a separate matter — its patterns were written in Gulf Arabic and
 * MSA, so a person who had just set the app to مصري was answering it in a
 * dialect it had never been taught to read.
 *
 * Running every documented scenario through the parser in Egyptian found 35
 * of 43 understood, and the misses were not evenly spread: Egypt puts the
 * question word in the middle of a sentence ("بعتت ايه لعمر؟"), negates with
 * م…ش, counts with كام and a singular after it, and says دلوقتي and امبارح.
 *
 * The worst of them was امبارح. `مبارح` was in the pattern, but the
 * "not inside a longer word" lookbehind sees the leading ا, so "مين كلمت
 * امبارح؟" was answered with *today's* log — the wrong day, confidently,
 * which is worse than an unread question.
 *
 * This file is the measurement, kept. A pattern that stops reading Egyptian
 * fails here rather than on somebody's phone.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { askData, type DataWorld } from './ask-data';
import { attachCommand } from './attach';
import { answerFromText, type Gap, type World } from './clarify';
import { added } from '@/content/additions';
import { setDialect } from '@/i18n/dialect';
import type { Contact, FollowUp, HistoryEntry, Task } from '@/lib/model-types';

const NOW = new Date('2026-10-15T10:00:00.000Z');

const person = (id: string, name: string, over: Partial<Contact> = {}): Contact => ({
  id,
  name,
  dial: '+20',
  phone: '1001234567',
  email: `${id}@example.com`,
  createdAt: '2026-09-01T09:00:00.000Z',
  ...over,
});

const task = (id: string, title: string, dueAt: string | null, who = ''): Task => ({
  id,
  type: 'call',
  title,
  who,
  contactIds: [],
  dueAt,
  remind: null,
  status: 'open',
  points: [],
  createdVia: 'quick',
  createdAt: '2026-10-01T09:00:00.000Z',
});

const followUp = (id: string, who: string, contactId: string): FollowUp => ({
  id,
  channel: 'whatsapp',
  who,
  what: 'العرض',
  status: 'waiting',
  since: '',
  contactId,
  createdAt: '2026-10-10T09:00:00.000Z',
});

const history: HistoryEntry[] = [{ id: 'h1', contactId: 'c3', kind: 'whatsapp', text: 'بعت العرض', at: '2026-10-12T09:00:00.000Z' }];

/** Somebody is labelled Lead: `labelIn` only matches labels actually in use. */
const CONTACTS = [
  person('c1', 'سارة حداد', { labels: ['Client'] }),
  person('c2', 'عمر خالد', { role: 'محاسب', labels: ['Lead'] }),
  person('c3', 'ليلى منصور', { touchedAt: '2026-08-01T09:00:00.000Z' }),
];

const world = (): DataWorld => ({
  contacts: CONTACTS,
  tasks: [
    task('t1', 'ارسل العقد لسارة', '2026-10-21T09:00:00.000Z', 'سارة حداد'),
    task('t2', 'موعد الدكتور', '2026-10-22T09:00:00.000Z'),
    task('t3', 'كلم عمر', '2026-10-14T09:00:00.000Z', 'عمر خالد'),
  ],
  followUps: [followUp('f1', 'سارة حداد', 'c1'), followUp('f2', 'عمر خالد', 'c2')],
  history,
  favorites: new Set(['c3']),
  cadence: new Map([['c3', 14]]),
  oneThing: { date: '2026-10-15', title: 'اخلص العرض', done: false, focusMinutes: 45 },
  now: NOW,
});

/** Every documented scenario, asked the way Egypt asks it. */
const SCENARIOS: readonly (readonly [string, string])[] = [
  ['رقم سارة؟', 'person'],
  ['موبايل سارة ايه؟', 'person'],
  ['ايميل عمر ايه؟', 'person'],
  ['عمر بيشتغل فين؟', 'person'],
  ['عمر شغال ايه؟', 'person'],
  ['مين عمر؟', 'person'],
  ['امتى اخر مرة كلمت ليلى؟', 'history'],
  ['كلمت ليلى امتى؟', 'history'],
  ['بعتت ايه لعمر؟', 'history'],
  ['قلت ايه لعمر؟', 'history'],
  ['عندي ايه النهارده؟', 'tasks'],
  ['عندي ايه بكرة؟', 'tasks'],
  ['عندي ايه الاسبوع ده؟', 'tasks'],
  ['مهامي ايه؟', 'tasks'],
  ['ايه المتأخر؟', 'tasks'],
  ['ايه اللي فاتني؟', 'tasks'],
  ['كان لازم اعمل ايه؟', 'tasks'],
  ['رتب يومي', 'tasks'],
  ['مين مستني ردي؟', 'waiting'],
  ['مين مردش؟', 'waiting'],
  ['ايه المتابعات؟', 'waiting'],
  ['مين مكلمتوش من زمان؟', 'quiet'],
  ['مين مقطوع؟', 'quiet'],
  ['مين المفروض اكلمه؟', 'quiet'],
  ['عندي كام عميل؟', 'people'],
  ['مين مصنف محتمل؟', 'people'],
  ['عندي كام شخص؟', 'people'],
  ['كام حد عندي؟', 'people'],
  ['وريني المفضلة', 'people'],
  ['شغلي الاساسي ايه؟', 'oneThing'],
  ['ايه الاهم النهارده؟', 'oneThing'],
  ['ايه اللي بعده؟', 'next'],
  ['اعمل ايه دلوقتي؟', 'next'],
  ['عملت ايه النهارده؟', 'log'],
  ['مين كلمت امبارح؟', 'log'],
  ['عملت ايه الاسبوع ده؟', 'log'],
  ['ايه الباقي مع سارة؟', 'withPerson'],
  ['فاضل ايه مع عمر؟', 'withPerson'],
  ['سارة ردت؟', 'withPerson'],
  ['عمر رد عليا؟', 'withPerson'],
  ['عندي ايه مع عمر؟', 'withPerson'],
  ['سارة مستنية حاجة مني؟', 'withPerson'],
  ['الدكتور امتى؟', 'findTask'],
  ['موعد الدكتور امتى؟', 'findTask'],
];

describe('every scenario, asked in Egyptian', () => {
  for (const [question, expected] of SCENARIOS) {
    it(`${question} → ${expected}`, () => {
      assert.equal(askData(question, world())?.kind ?? 'null', expected);
    });
  }
});

describe('the Egyptian words that were being misread', () => {
  it('reads امبارح as yesterday, not as today', () => {
    // The one that answered the wrong day rather than no day: مبارح was in
    // the pattern and could not match inside امبارح.
    const answer = askData('مين كلمت امبارح؟', world());
    assert.equal(answer?.kind === 'log' && answer.span, 'yesterday');
    assert.equal(askData('مين كلمت مبارح؟', world())?.kind === 'log', true);
  });

  it('counts with كام, which takes a singular after it', () => {
    // كم was there and كام was not, and "كام شخص" is singular where the
    // pattern only had the plurals.
    const answer = askData('عندي كام شخص؟', world());
    assert.equal(answer?.kind === 'people' && answer.of, 'all');
    assert.equal(answer?.kind === 'people' && answer.contacts.length, CONTACTS.length);
  });

  it('reads the question word in the middle of the sentence', () => {
    // Gulf: "بعتت لعمر". Egypt: "بعتت ايه لعمر" — the verb and the ل no
    // longer touch, which is what the old pattern required.
    assert.equal(askData('بعتت ايه لعمر؟', world())?.kind, 'history');
    assert.equal(askData('قلت ايه لعمر؟', world())?.kind, 'history');
  });

  it('reads "who should I call?" in Arabic, which only English had', () => {
    assert.equal(askData('مين المفروض اكلمه؟', world())?.kind, 'quiet');
    assert.equal(askData('مين لازم اتصل بيه؟', world())?.kind, 'quiet');
  });

  it('reads the Egyptian verb order for the day’s log', () => {
    // "ايه عملت" was there; "عملت ايه" is how it is actually said, and it
    // was answered with the day's task list instead.
    const answer = askData('عملت ايه النهارده؟', world());
    assert.equal(answer?.kind === 'log' && answer.span, 'today');
  });
});

describe('what Egyptian must not break', () => {
  it('still reads the Gulf forms of the same questions', () => {
    const gulf: readonly (readonly [string, string])[] = [
      ['وش عندي اليوم؟', 'tasks'],
      ['وش المتأخر؟', 'tasks'],
      ['مين ما رد؟', 'waiting'],
      ['كم عميل عندي؟', 'people'],
      ['وش سويت اليوم؟', 'log'],
      ['وش التالي؟', 'next'],
      ['مين ما كلمته من زمان؟', 'quiet'],
    ];
    for (const [question, expected] of gulf) assert.equal(askData(question, world())?.kind ?? 'null', expected, question);
  });

  it('keeps a statement a statement, in either dialect', () => {
    // A widened pattern that swallowed these would turn every typed errand
    // into a question nobody asked.
    for (const said of ['كلم سارة بكرة الساعة ٤', 'ابعت لعمر العقد الخميس', 'مستني رد سارة', 'فكرني اكلم عمر بكرة']) {
      assert.equal(askData(said, world()), null, said);
    }
  });

  it('does not read حد inside a longer word as "somebody"', () => {
    // لحد and محدش both contain it; the lookbehind is what keeps them out.
    assert.notEqual(askData('مين مردش لحد دلوقتي؟', world())?.kind, 'people');
  });
});

describe('the chips type a sentence the parser has to read back', () => {
  // Each chip sends its own `say` into the chat, and in Egyptian that
  // sentence is the Egyptian copy. If the parser cannot read its own words,
  // tapping a chip in Egyptian answers nothing.
  const PARSED = ['late', 'waiting', 'oneThing', 'next', 'day'] as const;

  for (const dialect of ['gulf', 'egypt'] as const) {
    it(`every chip the parser handles is understood in ${dialect}`, () => {
      setDialect(dialect);
      try {
        for (const key of PARSED) {
          const say = added('ar').chips[key].say;
          const kind = askData(say, world())?.kind ?? 'null';
          assert.ok(kind !== 'unknown' && kind !== 'null', `${dialect} ${key}: ${JSON.stringify(say)} → ${kind}`);
        }
      } finally {
        setDialect('gulf');
      }
    });

    it(`the card and file chips are understood in ${dialect}`, () => {
      setDialect(dialect);
      try {
        // Egypt says كارت where the Gulf says كرت, and the scan chip types
        // whichever the dialect uses.
        assert.equal(attachCommand(added('ar').chips.scan.say), 'scan');
        assert.equal(attachCommand(added('ar').qa.egImport), 'file');
      } finally {
        setDialect('gulf');
      }
    });
  }
});

describe('answering the Assistant in Egyptian when it asks back', () => {
  const asked: Gap = { kind: 'when', why: 'missing' };
  const w: World = { contacts: CONTACTS, tasks: [], followUps: [], now: NOW };

  it('reads دلوقتي as now', () => {
    const answer = answerFromText(asked, 'دلوقتي', w);
    assert.equal(answer.kind, 'when');
    if (answer.kind === 'when') assert.ok(Date.parse(answer.iso) > NOW.getTime());
  });

  it('reads the م…ش refusals as turning the question down, not as unreadable', () => {
    // An unreadable answer asks again; a refusal lets the task go and says
    // what it needs. Reading "مش عايز" as unreadable is the loop §2.91 was
    // about, in a third dialect.
    for (const said of ['مش دلوقتي', 'مش عايز', 'بعدين', 'لأ']) {
      assert.equal(answerFromText(asked, said, w).kind, 'refused', said);
    }
  });

  it('still reads a real time rather than taking it for a refusal', () => {
    assert.equal(answerFromText(asked, 'بكرة الساعة ٤', w).kind, 'when');
  });
});

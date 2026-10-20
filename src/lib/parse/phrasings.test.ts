/**
 * Every way somebody might ask, in all three languages. Run with `npm test`.
 *
 * The owner asked for more keywords and phrasings, in English, Gulf Arabic
 * and Egyptian. Guessing which to add is how a parser ends up with a hundred
 * rules and no idea which ones earn their keep, so instead a corpus was
 * written of how people actually ask for each thing the app can answer, and
 * run through `askData`. It started at 128 of 145.
 *
 * The seventeen misses were all real: "what now?", "who needs a catch up?",
 * "my focus today?", "where are we with Sara?", "اخر تواصل مع ليلى؟",
 * "ايه اللي اتأخر؟", "اعمل ايه بعد كده؟", "ايه اخبار سارة؟" — ordinary
 * sentences the app simply could not read.
 *
 * The second half of this file is the half that matters. Widening a pattern
 * is how task capture breaks: adding عايز and محتاج as whole words bought
 * two questions and cost five errands, because in Arabic those words open a
 * request and an errand equally — "عايز رقم سارة" is a question and "عايز
 * اكلم سارة بكرة" is a task, and what separates them is whether a noun or a
 * verb follows. The same shape turned up in English, where `show` had been
 * reading "show the deck to Omar" as a question since long before this.
 *
 * So the statements are asserted beside the questions, and both halves have
 * to pass together. A question gained at the price of an errand is not a
 * gain.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { askData, type DataWorld } from './ask-data';
import type { Contact, FollowUp, HistoryEntry, Task } from '@/lib/model-types';

const NOW = new Date('2026-10-15T10:00:00.000Z');

const p = (id: string, name: string, over: Partial<Contact> = {}): Contact => ({
  id,
  name,
  dial: '+20',
  phone: '1001234567',
  email: `${id}@example.com`,
  createdAt: '2026-09-01T09:00:00.000Z',
  ...over,
});

const t = (id: string, title: string, dueAt: string | null, who = ''): Task => ({
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

const f = (id: string, who: string, contactId: string): FollowUp => ({
  id,
  channel: 'whatsapp',
  who,
  what: 'The quote',
  status: 'waiting',
  since: '',
  contactId,
  createdAt: '2026-10-10T09:00:00.000Z',
});

/**
 * One address book per script. The same person under a Latin and an Arabic
 * name in one world makes every Arabic question ambiguous, which reads as a
 * parser fault and is a fixture fault — it cost a whole round of false
 * findings before it was spotted.
 */
const LATIN = [
  p('c1', 'Sara Haddad', { labels: ['Client'] }),
  p('c2', 'Omar Khalid', { role: 'Ledger Co', labels: ['Lead'] }),
  p('c3', 'Layla Mansour', { touchedAt: '2026-08-01T09:00:00.000Z' }),
];
const ARABIC = [
  p('a1', 'سارة حداد', { labels: ['Client'] }),
  p('a2', 'عمر خالد', { role: 'محاسب', labels: ['Lead'] }),
  p('a3', 'ليلى منصور', { touchedAt: '2026-08-01T09:00:00.000Z' }),
];

const base = (contacts: Contact[]): DataWorld => ({
  contacts,
  tasks: [
    t('t1', 'Send Sara the contract', '2026-10-21T09:00:00.000Z', 'Sara Haddad'),
    t('t2', 'Dentist appointment', '2026-10-22T09:00:00.000Z'),
    t('t3', 'Quarterly VAT filing', '2026-10-26T09:00:00.000Z'),
    t('t4', 'ارسل العقد لسارة', '2026-10-21T09:00:00.000Z', 'سارة حداد'),
    t('t5', 'موعد الدكتور', '2026-10-22T09:00:00.000Z'),
  ],
  followUps: [f('f1', contacts[0]!.name, contacts[0]!.id), f('f2', contacts[1]!.name, contacts[1]!.id)],
  history: [{ id: 'h1', contactId: contacts[2]!.id, kind: 'whatsapp', text: 'Sent the deck', at: '2026-10-12T09:00:00.000Z' } as HistoryEntry],
  favorites: new Set([contacts[2]!.id]),
  cadence: new Map([[contacts[2]!.id, 14]]),
  oneThing: { date: '2026-10-15', title: 'Finish the proposal', done: false, focusMinutes: 45 },
  now: NOW,
});

/** English questions against an English address book, Arabic against Arabic. */
const world = (lang: string): DataWorld => base(lang === 'en' ? LATIN : ARABIC);

type Row = readonly [string, string, string];

const CORPUS: readonly Row[] = [
  // ---- phone -------------------------------------------------------- en
  ['en', "what's Sara's number?", 'person'],
  ['en', 'Sara’s phone?', 'person'],
  ['en', 'how do I call Sara?', 'person'],
  ['en', 'get me Sara’s mobile', 'person'],
  ['en', 'do you have Sara’s number?', 'person'],
  ['en', 'what is her number?', 'nobody'],
  // ---- phone -------------------------------------------------------- ar
  ['ar', 'رقم سارة؟', 'person'],
  ['ar', 'وش رقم سارة؟', 'person'],
  ['ar', 'عطني رقم سارة', 'person'],
  ['ar', 'جوال سارة؟', 'person'],
  ['ar', 'ابغى رقم سارة', 'person'],
  ['eg', 'رقم سارة ايه؟', 'person'],
  ['eg', 'هاتلي رقم سارة', 'person'],
  ['eg', 'موبايل سارة؟', 'person'],
  ['eg', 'نمرة سارة ايه؟', 'person'],
  ['eg', 'التليفون بتاع سارة؟', 'person'],
  // ---- email --------------------------------------------------------
  ['en', "what's Sara's email?", 'person'],
  ['en', 'email address for Sara?', 'person'],
  ['en', 'Sara’s mail?', 'person'],
  ['ar', 'ايميل سارة؟', 'person'],
  ['ar', 'بريد سارة؟', 'person'],
  ['eg', 'الايميل بتاع سارة؟', 'person'],
  ['eg', 'ايميل سارة ايه؟', 'person'],
  // ---- work ---------------------------------------------------------
  ['en', 'where does Omar work?', 'person'],
  ['en', 'what does Omar do?', 'person'],
  ['en', 'Omar’s company?', 'person'],
  ['en', 'who does Omar work for?', 'person'],
  ['en', 'what is his job title?', 'nobody'],
  ['ar', 'وين يشتغل عمر؟', 'person'],
  ['ar', 'شركة عمر؟', 'person'],
  ['ar', 'وظيفة عمر؟', 'person'],
  ['ar', 'ايش يسوي عمر؟', 'person'],
  ['eg', 'عمر بيشتغل فين؟', 'person'],
  ['eg', 'عمر بيعمل ايه؟', 'person'],
  ['eg', 'عمر شغله ايه؟', 'person'],
  // ---- who is -------------------------------------------------------
  ['en', 'who is Omar?', 'person'],
  ['en', 'tell me about Omar', 'person'],
  ['en', 'Omar’s details?', 'person'],
  ['ar', 'مين عمر؟', 'person'],
  ['ar', 'معلومات عمر؟', 'person'],
  ['eg', 'عمر ده مين؟', 'person'],
  // ---- history ------------------------------------------------------
  ['en', 'when did I last talk to Layla?', 'history'],
  ['en', 'last time I spoke to Layla?', 'history'],
  ['en', 'have I contacted Layla?', 'history'],
  ['en', 'when did I message Layla?', 'history'],
  ['en', 'what did I tell Layla?', 'history'],
  ['en', 'what did I send Layla?', 'history'],
  ['ar', 'امتى اخر مرة كلمت ليلى؟', 'history'],
  ['ar', 'اخر تواصل مع ليلى؟', 'history'],
  ['ar', 'ايش قلت لليلى؟', 'history'],
  ['eg', 'كلمت ليلى امتى؟', 'history'],
  ['eg', 'قلت ايه لليلى؟', 'history'],
  ['eg', 'بعتت ايه لليلى؟', 'history'],
  // ---- today --------------------------------------------------------
  ['en', "what's on today?", 'tasks'],
  ['en', 'my day?', 'tasks'],
  ['en', 'today’s list?', 'tasks'],
  ['en', 'anything today?', 'tasks'],
  ['en', 'show me today', 'tasks'],
  ['en', 'what have I got on?', 'tasks'],
  ['en', 'my schedule today?', 'tasks'],
  ['ar', 'وش عندي اليوم؟', 'tasks'],
  ['ar', 'جدولي اليوم؟', 'tasks'],
  ['ar', 'قائمة اليوم؟', 'tasks'],
  ['eg', 'عندي ايه النهارده؟', 'tasks'],
  ['eg', 'ايه جدولي النهارده؟', 'tasks'],
  ['eg', 'النهارده فيه ايه؟', 'tasks'],
  // ---- tomorrow / week ---------------------------------------------
  ['en', 'what do I have tomorrow?', 'tasks'],
  ['en', 'am I free tomorrow?', 'tasks'],
  ['en', 'what does this week look like?', 'tasks'],
  ['ar', 'وش عندي بكرة؟', 'tasks'],
  ['eg', 'عندي ايه بكرة؟', 'tasks'],
  ['eg', 'الاسبوع ده فيه ايه؟', 'tasks'],
  // ---- late ---------------------------------------------------------
  ['en', "what's overdue?", 'tasks'],
  ['en', 'anything overdue?', 'tasks'],
  ['en', 'what did I miss?', 'tasks'],
  ['en', "what's behind?", 'tasks'],
  ['en', 'what am I late on?', 'tasks'],
  ['ar', 'وش المتأخر؟', 'tasks'],
  ['ar', 'المتأخرات؟', 'tasks'],
  ['eg', 'ايه اللي اتأخر؟', 'tasks'],
  ['eg', 'فيه حاجة متأخرة؟', 'tasks'],
  // ---- waiting ------------------------------------------------------
  ['en', 'who owes me a reply?', 'waiting'],
  ['en', "who hasn't replied?", 'waiting'],
  ['en', 'who am I chasing?', 'waiting'],
  ['en', 'who is pending?', 'waiting'],
  ['ar', 'مين ما رد؟', 'waiting'],
  ['ar', 'مين مستني ردي؟', 'waiting'],
  ['eg', 'مين لسه مردش؟', 'waiting'],
  ['eg', 'مين مستنيني؟', 'waiting'],
  // ---- quiet --------------------------------------------------------
  ['en', "who haven't I talked to in a while?", 'quiet'],
  ['en', 'who should I reconnect with?', 'quiet'],
  ['en', 'who have I neglected?', 'quiet'],
  ['en', 'who needs a catch up?', 'quiet'],
  ['ar', 'مين ما كلمته من زمان؟', 'quiet'],
  ['ar', 'مين مقطوع؟', 'quiet'],
  ['eg', 'مين مكلمتوش من زمان؟', 'quiet'],
  ['eg', 'مين المفروض اكلمه؟', 'quiet'],
  // ---- people / labels ---------------------------------------------
  ['en', 'how many clients do I have?', 'people'],
  ['en', 'show my clients', 'people'],
  ['en', 'who is tagged Lead?', 'people'],
  ['en', 'how many contacts do I have?', 'people'],
  ['en', 'show my favourites', 'people'],
  ['ar', 'كم عميل عندي؟', 'people'],
  ['ar', 'ورني العملاء', 'people'],
  ['ar', 'ورني المفضلة', 'people'],
  ['eg', 'عندي كام عميل؟', 'people'],
  ['eg', 'وريني العملاء', 'people'],
  ['eg', 'عندي كام شخص؟', 'people'],
  // ---- one thing ----------------------------------------------------
  ['en', "what's my one thing?", 'oneThing'],
  ['en', 'my focus today?', 'oneThing'],
  ['en', 'top priority?', 'oneThing'],
  ['ar', 'وش شغلي الأساسي؟', 'oneThing'],
  ['eg', 'ايه اهم حاجة النهارده؟', 'oneThing'],
  // ---- next ---------------------------------------------------------
  ['en', "what's next?", 'next'],
  ['en', 'what now?', 'next'],
  ['en', "what's up next?", 'next'],
  ['en', 'what should I do now?', 'next'],
  ['ar', 'وش التالي؟', 'next'],
  ['ar', 'وش اسوي الحين؟', 'next'],
  ['eg', 'ايه اللي بعده؟', 'next'],
  ['eg', 'اعمل ايه بعد كده؟', 'next'],
  // ---- log ----------------------------------------------------------
  ['en', 'what did I do today?', 'log'],
  ['en', 'what did I get done?', 'log'],
  ['en', 'who did I talk to today?', 'log'],
  ['ar', 'وش سويت اليوم؟', 'log'],
  ['eg', 'عملت ايه النهارده؟', 'log'],
  ['eg', 'مين كلمت امبارح؟', 'log'],
  // ---- with one person ---------------------------------------------
  ['en', 'anything pending with Sara?', 'withPerson'],
  ['en', "what's outstanding with Sara?", 'withPerson'],
  ['en', 'anything open with Sara?', 'withPerson'],
  ['en', 'where are we with Sara?', 'withPerson'],
  ['en', "what's the status with Sara?", 'withPerson'],
  ['en', 'did Sara reply?', 'withPerson'],
  ['en', 'do I owe Sara anything?', 'withPerson'],
  ['ar', 'وش عندي مع سارة؟', 'withPerson'],
  ['ar', 'ايش باقي مع سارة؟', 'withPerson'],
  ['ar', 'وين وصلنا مع سارة؟', 'withPerson'],
  ['eg', 'ايه اخبار سارة؟', 'withPerson'],
  ['eg', 'وصلنا لفين مع سارة؟', 'withPerson'],
  ['eg', 'سارة ردت؟', 'withPerson'],
  // ---- a task by its name ------------------------------------------
  ['en', 'when is the dentist?', 'findTask'],
  ['en', 'what time is the VAT filing?', 'findTask'],
  ['en', 'is the dentist appointment soon?', 'findTask'],
  ['ar', 'امتى موعد الدكتور؟', 'findTask'],
  ['eg', 'الدكتور امتى؟', 'findTask'],
];

describe('how people actually ask, in three languages', () => {
  for (const lang of ['en', 'ar', 'eg'] as const) {
    describe(lang, () => {
      for (const [rowLang, question, expected] of CORPUS.filter((r) => r[0] === lang)) {
        it(`${question} → ${expected}`, () => {
          assert.equal(askData(question, world(rowLang))?.kind ?? 'null', expected);
        });
      }
    });
  }
});

/**
 * Errands, which must stay errands. Every one of these comes back null so
 * the parser downstream can save it.
 */
const STATEMENTS = [
  'Call Sara tomorrow at 4',
  'Send Omar the contract Thursday',
  'remind me to call Sara',
  'I told Omar I would send the contract',
  'waiting for Sara to reply',
  'Dentist appointment Tuesday 9am',
  'get the VAT filing done this week',
  'find a new supplier',
  'show the deck to Omar',
  'كلم سارة بكرة الساعة ٤',
  'ابعت لعمر العقد الخميس',
  'عايز اكلم سارة بكرة',
  'محتاج اكلم سارة بكرة',
  'ابغى ارسل العقد لعمر',
  'عايز اخلص العرض النهارده',
  'محتاج اروح للدكتور بكرة',
  'لازم اكلم عمر الاسبوع ده',
  'المفروض ابعت العقد بكرة',
  'هات العقد من عمر بكرة',
  'مستني رد سارة',
  'فكرني اكلم عمر بكرة',
  'قلت لعمر اني هبعت العقد',
];

describe('and what must not become a question', () => {
  for (const said of STATEMENTS) {
    it(`${said} stays an errand`, () => {
      // A question gained at the price of an errand is not a gain: five of
      // these broke the first time these patterns were widened.
      assert.equal(askData(said, world(/[\u0600-\u06FF]/.test(said) ? 'ar' : 'en')), null);
    });
  }
});

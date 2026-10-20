/**
 * A minute at the mic: many errands in one unbroken run of words.
 * Run with `npm test`.
 *
 * Speech to text supplies no punctuation, and `splitDump` divided on
 * punctuation — so somebody who held the mic and listed five errands got one
 * task with the whole minute for a title. In Arabic that is precisely what
 * happened: one piece, one task, the wrong person attached to it
 * (BUILD-REVIEW §2.108).
 *
 * Two halves are held down here. The run has to come apart on the words
 * people actually join errands with, and it must **not** come apart on "and"
 * — "Sara and Omar" is one person and then another, not two errands. A
 * splitter that divides too eagerly turns one errand into two wrong ones,
 * which is worse than the fault it was fixing.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { localParser, splitDump, spokenClock } from './local';
import { C } from '@/content/strings';
import type { Contact } from '@/lib/model-types';

const NOW = new Date('2026-10-15T10:00:00.000Z');
const contacts: Contact[] = [
  { id: 'c1', name: 'Sara Haddad', createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'c2', name: 'Omar Khalid', createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'a1', name: 'سارة حداد', createdAt: '2026-09-01T09:00:00.000Z' },
  { id: 'a2', name: 'عمر خالد', createdAt: '2026-09-01T09:00:00.000Z' },
];
const ctx = (lang: 'en' | 'ar') => ({ lang, now: NOW, contacts });

describe('a spoken run comes apart', () => {
  it('breaks on the connectives, with no punctuation anywhere', () => {
    const said =
      'call Sara tomorrow at four about the contract and then send Omar the invoice ' +
      'also I need to book the dentist for Tuesday morning remind me to pay the packaging ' +
      'supplier on Thursday and I promised Layla I would send the deck by Friday';
    assert.equal(splitDump(said).length, 5, JSON.stringify(splitDump(said)));
  });

  it('breaks an Arabic run on وبعدين، وكمان and و before a verb', () => {
    const said =
      'كلم سارة بكرة الساعة اربعة بخصوص العقد وبعدين ابعت لعمر الفاتورة وكمان لازم احجز ' +
      'عند الدكتور الثلاثاء الصبح وفكرني ادفع لمورد التغليف الخميس';
    assert.equal(splitDump(said).length, 4, JSON.stringify(splitDump(said)));
  });

  it('breaks an Egyptian run the same way, on وبعد كده', () => {
    const said = 'كلم سارة بكرة بخصوص العقد وبعد كده ابعت لعمر الفاتورة وكمان محتاج احجز عند الدكتور';
    assert.equal(splitDump(said).length, 3, JSON.stringify(splitDump(said)));
  });

  it('reads each piece as its own errand, with its own person and day', async () => {
    const said = 'call Sara tomorrow at four about the contract and then send Omar the invoice';
    const items = await localParser.split(said, ctx('en'));
    assert.equal(items.length, 2);
    assert.equal(items[0]?.contactId, 'c1');
    assert.equal(items[1]?.contactId, 'c2');
    // "at four", said rather than typed, is four in the afternoon.
    assert.equal(items[0]?.when?.slice(11, 16), '16:00');
  });
});

describe('and what must not come apart', () => {
  it('never breaks on a bare "and"', () => {
    assert.deepEqual(splitDump('call Sara and Omar about the price'), ['call Sara and Omar about the price']);
    assert.deepEqual(splitDump('buy tea and coffee for the office'), ['buy tea and coffee for the office']);
    assert.deepEqual(splitDump('اتصل بسارة وعمر بخصوص السعر'), ['اتصل بسارة وعمر بخصوص السعر']);
  });

  it('leaves the Brain dump samples at their six things', async () => {
    // These are the typed samples the screen ships with; the spoken rules
    // must not change what a comma-separated list already did.
    assert.equal((await localParser.split(C.en.d_sample, ctx('en'))).length, 6);
    assert.equal((await localParser.split(C.ar.d_sample, ctx('ar'))).length, 6);
  });

  it('keeps one errand whole when its own words look like a join', () => {
    // "also" inside a sentence rather than starting a clause.
    assert.equal(splitDump('ask Sara about the price').length, 1);
    assert.equal(splitDump('كلم سارة بخصوص العقد').length, 1);
  });
});

describe('a clock said out loud', () => {
  const at = (said: string) => spokenClock(said);

  it('writes the hour words as digits', () => {
    assert.equal(at('call Sara at four'), 'call Sara at 4');
    assert.equal(at('call Sara at ten'), 'call Sara at 10');
    assert.equal(at('call Sara at nine am'), 'call Sara at 9 am');
  });

  it('reads the compound forms, which must win over the bare hour', () => {
    assert.equal(at('meet at half past four'), 'meet at 4:30');
    assert.equal(at('meet at quarter past six'), 'meet at 6:15');
    assert.equal(at('meet at quarter to seven'), 'meet at 6:45');
    assert.equal(at('meet at four thirty'), 'meet at 4:30');
    assert.equal(at("meet at six o'clock"), 'meet at 6:00');
  });

  it('leaves a number that is not a time alone', () => {
    // The whole risk of this: every sentence has numbers in it.
    for (const said of ['buy four boxes of cups', 'call four suppliers about the price', 'send Sara the top five ideas']) {
      assert.equal(at(said), said);
    }
  });

  it('schedules what was said, through the parser', async () => {
    const four = await localParser.parse('call Sara tomorrow at four', ctx('en'));
    assert.equal(four.when?.slice(11, 16), '16:00');
    // And the title does not keep the time it was given: teaching the clock
    // alone would have left "at four" sitting in it.
    assert.equal(four.title, 'Call Sara');
  });

  it('reads a written clock the way it reads a bare hour', async () => {
    // Nobody means half past four in the morning by "at 4:30". The bare-hour
    // rule always knew that; the H:MM branch used to trust the digits.
    const half = await localParser.parse('call Sara tomorrow at 4:30', ctx('en'));
    assert.equal(half.when?.slice(11, 16), '16:30');
    const morning = await localParser.parse('call Sara tomorrow at 4:30 am', ctx('en'));
    assert.equal(morning.when?.slice(11, 16), '04:30');
    const late = await localParser.parse('call Sara tomorrow at 10:30', ctx('en'));
    assert.equal(late.when?.slice(11, 16), '10:30');
  });

  it('does not leave the preposition behind when the when is taken out', async () => {
    // "Book the dentist for", "Send the deck by", "Call Sara in the": all
    // seen in a real dictation before this was trimmed.
    for (const [said, title] of [
      ['book the dentist for Tuesday morning', 'Book the dentist'],
      ['call Sara tomorrow at eight in the evening', 'Call Sara'],
      ['call Sara at noon', 'Call Sara'],
    ] as const) {
      assert.equal((await localParser.parse(said, ctx('en'))).title, title, said);
    }
  });
});

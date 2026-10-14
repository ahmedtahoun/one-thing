import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Contact } from '@/lib/model-types';

import { localParser } from './local';
import { candidateName } from './names';
import { loopOf } from './promise';

const person = (id: string, name: string): Contact => ({ id, name, createdAt: '2026-10-01T09:00:00Z' });
const people = [person('o', 'Omar Hadi'), person('s', 'Sara Khan'), person('n', 'نورة العلي'), person('a', 'عمر حسن')];

describe('loopOf — what I owe', () => {
  it('reads "I told X I\'d …" and "I promised X I will …"', () => {
    assert.deepEqual(loopOf("I told Omar I'd send the contract Thursday", people), {
      kind: 'promise',
      body: 'send the contract Thursday',
      name: null,
    });
    assert.equal(loopOf('I promised Sara I will call her tomorrow at 10', people)?.body, 'call her tomorrow at 10');
    assert.equal(loopOf("I said I'd reply to Omar", people)?.kind, 'promise');
    assert.equal(loopOf('I have told Omar that I’ll email him the quote.', people)?.body, 'email him the quote');
  });
  it('reads "I promised X a …" and "I owe X a …"', () => {
    assert.equal(loopOf('I promised Sara a call tomorrow', people)?.body, 'call tomorrow');
    assert.equal(loopOf('I owe Layla a reply', people)?.body, 'reply');
  });
  it('reads "I\'ll get back to X"', () => {
    assert.equal(loopOf("I'll get back to Omar on Monday", people)?.body, 'get back to Omar on Monday');
  });
  it('reads promises in Arabic', () => {
    assert.equal(loopOf('وعدت عمر اني ارسله العقد الخميس', people)?.body, 'ارسله العقد الخميس');
    assert.equal(loopOf('قلت لنورة إني هكلمها بكره', people)?.kind, 'promise');
    assert.equal(loopOf('وعدتها أرد عليها الصبح', people)?.kind, 'promise');
  });
  it('does not mistake a plain task for a promise', () => {
    assert.equal(loopOf('send Omar the contract tomorrow', people), null);
    assert.equal(loopOf('call Sara at 10', people), null);
    assert.equal(loopOf('I need to email the quote', people), null);
  });
});

describe('loopOf — what I am owed', () => {
  it('reads "waiting for X to …" for someone in People', () => {
    const loop = loopOf('Waiting for Sara to reply about the quote', people);
    assert.equal(loop?.kind, 'waiting');
    assert.equal(loop?.body, 'reply about the quote');
    assert.equal(loop?.name, null);
  });
  it('reads "waiting on X for …"', () => {
    assert.equal(loopOf('waiting on Omar for the contract', people)?.body, 'the contract');
  });
  it('reads "X hasn\'t replied" and "X owes me …"', () => {
    assert.equal(loopOf("Sara hasn't replied", people)?.kind, 'waiting');
    assert.equal(loopOf('Omar owes me the signed copy', people)?.body, 'the signed copy');
    assert.equal(loopOf('No reply from Sara since Sunday', people)?.kind, 'waiting');
  });
  it('reads "X said she\'d …"', () => {
    const loop = loopOf("Sara said she'd send the deck", people);
    assert.equal(loop?.kind, 'waiting');
    assert.equal(loop?.body, 'send the deck');
  });
  it('takes a Capitalised name that is not in People', () => {
    const loop = loopOf('Waiting for Hamdi to confirm the price', people);
    assert.equal(loop?.kind, 'waiting');
    assert.equal(loop?.name, 'Hamdi');
    assert.equal(loopOf('Hamdi hasn’t answered', people)?.name, 'Hamdi');
  });
  it('reads waiting in Arabic', () => {
    assert.equal(loopOf('مستني رد نورة على العرض', people)?.kind, 'waiting');
    assert.equal(loopOf('منتظر العقد من عمر', people)?.kind, 'waiting');
    assert.equal(loopOf('نورة مردتش', people)?.kind, 'waiting');
    assert.equal(loopOf('نورة وعدتني تبعت العرض', people)?.kind, 'waiting');
  });
  it('leaves "waiting for" something that is not a person alone', () => {
    assert.equal(loopOf('waiting for the plumber', people), null);
    assert.equal(loopOf('waiting for a delivery tomorrow', people), null);
  });
  it('leaves questions about waiting for the follow-ups list', () => {
    assert.equal(loopOf('what am I waiting for', people), null);
    assert.equal(loopOf('who is waiting on me', people), null);
    assert.equal(loopOf('مين مستني ردي', people), null);
    assert.equal(loopOf('show my follow-ups', people), null);
  });
});

describe('the on-device parser with promises and waiting', () => {
  const now = new Date('2026-10-14T12:00:00'); // a Wednesday
  const ctx = { lang: 'en' as const, now, contacts: people };

  it('turns a promise into a task with the lead-in taken off', async () => {
    const p = await localParser.parse("I told Omar I'd send the contract Thursday", ctx);
    assert.equal(p.kind, 'promise');
    assert.equal(p.title, 'Send the contract');
    assert.equal(p.who, 'Omar Hadi');
    assert.equal(p.contactId, 'o');
    assert.equal(p.type, 'whatsapp');
    assert.equal(new Date(p.when).getDay(), 4);
  });

  it('turns waiting into a check-in two days on at 09:00', async () => {
    const p = await localParser.parse('Waiting for Sara to reply about the quote', ctx);
    assert.equal(p.kind, 'waiting');
    assert.equal(p.who, 'Sara Khan');
    assert.equal(p.title, 'Reply about the quote');
    const when = new Date(p.when);
    assert.equal(when.getDate(), 16);
    assert.equal(when.getHours(), 9);
  });

  it('uses the day said for the check-in', async () => {
    const p = await localParser.parse('Sara hasn’t replied, check Monday', ctx);
    assert.equal(p.kind, 'waiting');
    assert.equal(new Date(p.when).getDay(), 1);
    assert.equal(new Date(p.when).getHours(), 9);
  });

  it('keeps the channel the sentence names', async () => {
    assert.equal((await localParser.parse('Waiting for Omar to reply to my email', ctx)).type, 'email');
    assert.equal((await localParser.parse('Waiting for Sara to call me back', ctx)).type, 'call');
  });

  it('gives a name that is not in People as the person, with nobody to link', async () => {
    const p = await localParser.parse('Waiting for Hamdi to confirm the price', ctx);
    assert.equal(p.who, 'Hamdi');
    assert.equal(p.contactId, null);
  });

  it('answers a promise in the Assistant as a task, and a question about waiting as the list', async () => {
    assert.equal((await localParser.interpret('Waiting for Sara to reply', ctx)).kind, 'task');
    assert.equal((await localParser.interpret("I told Omar I'd call him tomorrow", ctx)).kind, 'task');
    assert.equal((await localParser.interpret('what am I waiting for', ctx)).kind, 'followups');
    assert.equal((await localParser.interpret('waiting for the plumber', ctx)).kind, 'followups');
  });

  it('reads an Arabic promise and an Arabic wait', async () => {
    const ar = { ...ctx, lang: 'ar' as const };
    const promise = await localParser.parse('وعدت عمر اني ارسله العقد الخميس', ar);
    assert.equal(promise.kind, 'promise');
    assert.equal(promise.contactId, 'a');
    const wait = await localParser.parse('مستني رد نورة على العرض', ar);
    assert.equal(wait.kind, 'waiting');
    assert.equal(wait.contactId, 'n');
  });
});

describe('naming a person who is not in People yet', () => {
  it('finds the name in the example sentences, so the Assistant can offer to add them', () => {
    assert.equal(candidateName("I told Sara I'd send the proposal Thursday")?.word, 'Sara');
    assert.equal(candidateName('I promised Layla a call tomorrow')?.word, 'Layla');
    assert.equal(candidateName('Waiting for Omar to reply about the contract')?.word, 'Omar');
    assert.equal(candidateName('I owe Hamdi a reply')?.word, 'Hamdi');
  });
  it('still ignores ordinary words after those verbs', () => {
    assert.equal(candidateName('I told them the news'), null);
    assert.equal(candidateName('I promised tomorrow'), null);
  });
});

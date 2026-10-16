import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dumpIsEnough, enoughFor, localIsEnough } from './confidence';
import type { ParseContext } from './types';

const ctx: ParseContext = {
  lang: 'en',
  now: new Date('2026-10-15T08:00:00'),
  contacts: [
    { id: 'c1', name: 'Sara Haddad', createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 'c2', name: 'عمر خالد', createdAt: '2026-10-01T00:00:00.000Z' },
  ],
};

describe('enoughFor', () => {
  it('is sure of a promise and a waiting, because the wire cannot carry either', () => {
    assert.equal(enoughFor("I told Sara I'd send the quote Thursday", ctx), 'loop');
    assert.equal(enoughFor('Waiting for Sara to reply about the quote', ctx), 'loop');
    assert.equal(enoughFor('قلت لعمر إني أرسل العقد الخميس', ctx), 'loop');
  });

  it('is sure when a day or a time was actually said', () => {
    assert.equal(enoughFor('Pay the invoice tomorrow', ctx), 'time');
    assert.equal(enoughFor('Pay the invoice by 5', ctx), 'time');
    assert.equal(enoughFor('Chase the loan on Thursday', ctx), 'time');
    assert.equal(enoughFor('Call the bank tonight', ctx), 'time');
    assert.equal(enoughFor('ادفع الفاتورة بكرة', ctx), 'time');
  });

  it('is sure of a channel word with somebody already in People', () => {
    assert.equal(enoughFor('Email Sara the deck', ctx), 'channel-and-who');
    assert.equal(enoughFor('كلم عمر', ctx), 'channel-and-who');
  });

  it('is not sure of a channel word with a stranger — the server may place the name', () => {
    assert.equal(enoughFor('Email Khalid the deck', ctx), null);
  });

  it('is not sure of a vague note, which is what the server is for', () => {
    for (const vague of ['the deck thing for sara', 'follow up on the lawyer', 'that thing we discussed', 'الموضوع اللي اتكلمنا فيه']) {
      assert.equal(enoughFor(vague, ctx), null, vague);
    }
  });

  it('is not sure of nothing at all', () => {
    assert.equal(enoughFor('', ctx), null);
    assert.equal(enoughFor('   ', ctx), null);
  });

  it('localIsEnough is the same question as a boolean', () => {
    assert.equal(localIsEnough('Pay the invoice tomorrow', ctx), true);
    assert.equal(localIsEnough('the deck thing for sara', ctx), false);
  });
});

describe('dumpIsEnough', () => {
  it('takes a dump whose every piece was explicit', () => {
    assert.equal(dumpIsEnough(['Call Sara at 4', 'Pay the invoice tomorrow'], ctx), true);
  });

  it('hands a dump with one vague piece to the server, which splits better', () => {
    assert.equal(dumpIsEnough(['Call Sara at 4', 'that thing we discussed'], ctx), false);
  });

  it('keeps a dump holding a promise, because sending it would throw the promise away', () => {
    assert.equal(dumpIsEnough(['that thing we discussed', "I told Sara I'd send the quote Thursday"], ctx), true);
  });

  it('has nothing to say about an empty dump', () => {
    assert.equal(dumpIsEnough([], ctx), false);
  });
});

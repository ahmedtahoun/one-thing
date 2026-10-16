/**
 * The free-text screens with and without the backend. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { backedParser } from './index';
import { AssistLimitError, type Invoke } from './remote';
import type { ParseContext } from './types';

const ctx: ParseContext = {
  lang: 'en',
  now: new Date('2026-10-10T08:00:00'),
  contacts: [{ id: 'c-1', name: 'Sara Haddad', createdAt: '2026-10-01T00:00:00.000Z' }],
};
const fromClaude = { type: 'email', title: 'Send Sara the deck', who: 'Sara Haddad', contactId: 'c-1', when: '2026-10-11T07:00:00.000Z' };
const answering = (status: number, data: unknown): Invoke => async () => ({ status, data });

/** Counts the calls, so "it never asked" can be asserted rather than inferred. */
const counting = (data: unknown) => {
  let calls = 0;
  const invoke: Invoke = async () => {
    calls += 1;
    return { status: 200, data };
  };
  return { invoke, calls: () => calls };
};

describe('the free-text parser', () => {
  it('uses Claude’s reading for a note the rules cannot be sure of', async () => {
    const parser = backedParser(answering(200, { result: fromClaude }));
    assert.deepEqual(await parser.parse('the deck thing for sara', ctx), fromClaude);
  });

  it('…and does not ask at all when the sentence was explicit', async () => {
    // A day, a time, a channel and a person already in People: there is
    // nothing here for the server to add, so spending a request would be
    // spending it on nothing.
    const server = counting({ result: fromClaude });
    const parsed = await backedParser(server.invoke).parse('send sara the deck tomorrow at 10', ctx);
    assert.equal(server.calls(), 0, 'the backend was asked anyway');
    assert.equal(parsed.contactId, 'c-1');
    assert.equal(parsed.type, 'whatsapp');
  });

  it('sends what the server needs to read the note in the person’s day', async () => {
    let sent: unknown;
    const parser = backedParser(async (request) => {
      sent = request;
      return { status: 200, data: { result: { tasks: [fromClaude] } } };
    });
    await parser.split('send sara the deck. call mum', ctx);
    assert.deepEqual(Object.keys(sent as object).sort(), ['lang', 'now', 'op', 'text', 'timeZone']);
    assert.equal((sent as { op: string }).op, 'split');
  });

  it('falls back to the on-device rules when there is no backend, or it cannot answer', async () => {
    const local = await backedParser(async () => null).parse('Call Sara at 4', ctx);
    assert.equal(local.type, 'call');
    assert.equal(local.contactId, 'c-1');
    for (const invoke of [
      answering(503, { error: 'unavailable' }),
      answering(200, { result: { kind: 'answer', text: 'Paris' } }),
      answering(200, null),
      (async () => Promise.reject(new Error('offline'))) as Invoke,
    ]) {
      const intent = await backedParser(invoke).interpret('Call Sara at 4', ctx);
      assert.equal(intent.kind, 'task', 'the rules answered');
    }
  });

  it('never keeps a contact the person does not have', async () => {
    const parsed = await backedParser(answering(200, { result: { ...fromClaude, contactId: 'c-404' } })).parse('x', ctx);
    assert.equal(parsed.contactId, null);
  });

  /**
   * The bug this routing was changed for. `AssistTask` has no `kind` field, so
   * a reply from the server cannot say "waiting" — and with the server asked
   * first, app/capture.tsx never reached its addFollowUp branch and the
   * Promise / Waiting tag never appeared. It worked offline and did nothing in
   * production.
   */
  describe('a promise and a waiting survive a working backend', () => {
    const chatty = answering(200, { result: fromClaude });

    it('a waiting is still a waiting, and becomes a follow-up', async () => {
      const parsed = await backedParser(chatty).parse('Waiting for Sara to reply about the quote', ctx);
      assert.equal(parsed.kind, 'waiting');
    });

    it('a promise is still a promise', async () => {
      const parsed = await backedParser(chatty).parse("I told Sara I'd send the quote Thursday", ctx);
      assert.equal(parsed.kind, 'promise');
    });

    it('the Assistant keeps it too', async () => {
      const intent = await backedParser(chatty).interpret('Waiting for Sara to reply about the quote', ctx);
      assert.equal(intent.kind, 'task');
      if (intent.kind !== 'task') return;
      assert.equal(intent.task.kind, 'waiting');
    });

    it('a dump holding one is read on the device, so the promise is not lost', async () => {
      const dump = "Call the bank. I told Sara I'd send the quote Thursday";
      const items = await backedParser(answering(200, { result: { tasks: [fromClaude] } })).split(dump, ctx);
      assert.equal(items.length, 2, 'the server would have returned one');
      assert.ok(
        items.some((item) => item.kind === 'promise'),
        'no promise in the dump',
      );
    });

    it('and nothing invents a kind for an ordinary note', async () => {
      const parsed = await backedParser(chatty).parse('the deck thing for sara', ctx);
      assert.equal(parsed.kind, undefined);
    });
  });

  it('passes the Assistant’s limit on, and nothing else’s', async () => {
    const limited = backedParser(answering(429, { error: 'limit' }));
    await assert.rejects(limited.interpret('plan my day', ctx), AssistLimitError);
    assert.equal((await limited.parse('Call Sara at 4', ctx)).type, 'call', 'Quick capture carries on');
    assert.equal((await limited.split('Call Sara. Email Omar', ctx)).length, 2, 'so does Brain dump');
  });
});

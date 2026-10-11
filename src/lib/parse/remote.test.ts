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

describe('the free-text parser', () => {
  it('uses Claude’s reading when the backend answers', async () => {
    const parser = backedParser(answering(200, { result: fromClaude }));
    assert.deepEqual(await parser.parse('send sara the deck tomorrow at 10', ctx), fromClaude);
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

  it('passes the Assistant’s limit on, and nothing else’s', async () => {
    const limited = backedParser(answering(429, { error: 'limit' }));
    await assert.rejects(limited.interpret('plan my day', ctx), AssistLimitError);
    assert.equal((await limited.parse('Call Sara at 4', ctx)).type, 'call', 'Quick capture carries on');
    assert.equal((await limited.split('Call Sara. Email Omar', ctx)).length, 2, 'so does Brain dump');
  });
});

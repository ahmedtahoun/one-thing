/**
 * The contract both sides read the Assistant's answers through. Run with
 * `npm test`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { FREE_ASSISTANT_REQUESTS_PER_DAY as APP_LIMIT } from '../../../src/policy/entitlements';
import { FREE_ASSISTANT_REQUESTS_PER_DAY, PARSE_REQUESTS_PER_DAY, readRequest, readResult, readTask } from './assist-contract';

const request = { op: 'parse', text: 'Call Sara tomorrow at 10', lang: 'en', now: '2026-10-10T11:00:00.000Z', timeZone: 'Asia/Riyadh' };
const task = { type: 'call', title: 'Call Sara', who: 'Sara Haddad', contactId: 'c-1', when: '2026-10-11T10:00:00+03:00' };

describe('the assist contract', () => {
  it('reads a request, and refuses one that is not', () => {
    assert.deepEqual(readRequest(request), request);
    assert.equal(readRequest({ ...request, op: 'chat' }), null);
    assert.equal(readRequest({ ...request, text: '   ' }), null);
    assert.equal(readRequest({ ...request, text: 'x'.repeat(2001) }), null);
    assert.equal(readRequest({ ...request, lang: 'fr' }), null);
    assert.equal(readRequest({ ...request, now: 'tomorrow' }), null);
    assert.equal(readRequest({ ...request, timeZone: 'Mars/Olympus' }), null);
    assert.equal(readRequest(null), null);
  });

  it('keeps a contact only when it is one of the person’s own', () => {
    assert.equal(readTask(task, new Set(['c-1']))?.contactId, 'c-1');
    const stranger = readTask(task, new Set(['c-2']))!;
    assert.equal(stranger.contactId, null, 'an id the model made up is dropped');
    assert.equal(stranger.who, 'Sara Haddad', 'the name stays');
  });

  it('writes every time as a UTC instant', () => {
    assert.equal(readTask(task)?.when, '2026-10-11T07:00:00.000Z');
  });

  it('refuses a task that is not one', () => {
    for (const bad of [
      { ...task, type: 'meeting' },
      { ...task, title: '' },
      { ...task, when: 'tomorrow at ten' },
      { ...task, who: 3 },
      { ...task, title: undefined },
    ]) {
      assert.equal(readTask(bad), null, JSON.stringify(bad));
    }
  });

  it('reads each operation’s result, and nothing that could carry free text', () => {
    assert.deepEqual(readResult('parse', task)?.valueOf(), readTask(task));
    assert.equal((readResult('split', { tasks: [task, task] }) as unknown[]).length, 2);
    assert.equal(readResult('split', { tasks: [task, { ...task, type: 'x' }] }), null, 'one bad task spoils the list');
    assert.deepEqual(readResult('interpret', { kind: 'plan', task: null }), { kind: 'plan' });
    assert.deepEqual(readResult('interpret', { kind: 'followups', task: null }), { kind: 'followups' });
    assert.equal((readResult('interpret', { kind: 'task', task }) as { kind: string }).kind, 'task');
    assert.equal(readResult('interpret', { kind: 'answer', text: 'The capital of France is Paris.' }), null);
    assert.equal(readResult('interpret', { kind: 'task', task: null }), null);
  });

  it('keeps the limits the same everywhere they are written', () => {
    assert.equal(FREE_ASSISTANT_REQUESTS_PER_DAY, APP_LIMIT, 'the app’s own meter');
    const sql = fs.readFileSync(path.join(__dirname, '../../migrations/0005_assist.sql'), 'utf8');
    assert.match(sql, new RegExp(`when 'assistant' then ${FREE_ASSISTANT_REQUESTS_PER_DAY}\\b`));
    assert.match(sql, new RegExp(`when 'parse' then ${PARSE_REQUESTS_PER_DAY}\\b`));
  });
});

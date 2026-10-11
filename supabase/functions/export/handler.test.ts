/**
 * Answering one "Download my data" request, with stand-ins for Postgres and
 * Storage. Run with `npm test`.
 *
 * Completeness — that the export really covers every table holding the
 * person's rows — is checked against the database itself in
 * `scripts/test-export-db.ts`, because only the database knows what tables
 * exist.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EXPORTED, THROUGH_PARENT, type ExportDocument } from '../_shared/export-contract';
import { handleExport, type Claim, type Deps } from './handler';

const USER = '11111111-1111-4111-8111-111111111111';
const REQUEST = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-11T09:00:00.000Z');

function stand(over: { claim?: Claim | null; failOn?: string; completed?: boolean } = {}) {
  const asked: string[] = [];
  const stored: { path: string; document: ExportDocument }[] = [];
  const released: string[] = [];
  const completed: { id: string; path: string }[] = [];
  const deps: Deps = {
    async claim() {
      return over.claim === undefined ? { id: REQUEST, userId: USER, requestedAt: '2026-10-10T08:00:00.000Z' } : over.claim;
    },
    async rows(table, by, userId) {
      asked.push(`${table}:${by}=${userId}`);
      if (over.failOn === table) throw new Error(`${table} is on fire`);
      // One row each, so the document has something in every section.
      return [{ id: `${table}-1`, note: table }];
    },
    async children(table, key, parentIds) {
      asked.push(`${table}:${key} in ${parentIds.join(',')}`);
      return [{ [key]: parentIds[0], child: table }];
    },
    async store(path, document) {
      if (over.failOn === 'store') throw new Error('storage is full');
      stored.push({ path, document });
    },
    async complete(id, path) {
      completed.push({ id, path });
      return over.completed ?? true;
    },
    async release(id) {
      released.push(id);
    },
    now: () => NOW,
  };
  return { deps, asked, stored, released, completed };
}

describe('answering an export request', () => {
  it('does nothing when there is nothing to answer', async () => {
    const { deps, stored } = stand({ claim: null });
    assert.deepEqual(await handleExport(deps), { status: 200, body: { idle: true } });
    assert.deepEqual(stored, []);
  });

  it('reads every exported table for that person, and nobody else', async () => {
    const { deps, asked } = stand();
    await handleExport(deps);
    for (const { table, by } of EXPORTED) {
      assert.ok(asked.includes(`${table}:${by}=${USER}`), `${table} was not read`);
    }
    // No top-level table is ever read whole: each is filtered to the person.
    // The children are filtered by their parents' ids instead, which were
    // themselves filtered to the person — that is the next test.
    const topLevel = asked.filter((a) => !a.includes(' in '));
    assert.equal(topLevel.length, EXPORTED.length);
    assert.ok(topLevel.every((a) => a.endsWith(`=${USER}`)), topLevel.join(' | '));
  });

  it('fetches the children through their parents', async () => {
    const { deps, asked } = stand();
    await handleExport(deps);
    for (const [table, child] of Object.entries(THROUGH_PARENT)) {
      assert.ok(asked.some((a) => a.startsWith(`${table}:${child.key} in `)), `${table} was not read`);
    }
  });

  it('writes one file, named for the person and the request', async () => {
    const { deps, stored, completed } = stand();
    const reply = await handleExport(deps);
    assert.deepEqual(reply, { status: 200, body: { done: REQUEST, path: `${USER}/${REQUEST}.json` } });
    assert.equal(stored.length, 1);
    assert.equal(stored[0]?.path, `${USER}/${REQUEST}.json`);
    // The request is only answered once the file exists.
    assert.deepEqual(completed, [{ id: REQUEST, path: `${USER}/${REQUEST}.json` }]);
  });

  it('says in the file what it covers and what it leaves out', async () => {
    const { deps, stored } = stand();
    await handleExport(deps);
    const doc = stored[0]!.document;
    assert.equal(doc.about.user, USER);
    assert.equal(doc.about.requestedAt, '2026-10-10T08:00:00.000Z');
    assert.equal(doc.about.producedAt, NOW.toISOString());
    // A reader can see the whole list rather than having to trust it.
    assert.equal(doc.about.contains.length, EXPORTED.length + Object.keys(THROUGH_PARENT).length);
    assert.ok(Object.keys(doc.about.omits).length > 0);
    for (const name of doc.about.contains) {
      assert.ok(Array.isArray(doc.data[name]), `${name} is missing from the data`);
    }
  });

  it('includes an empty section rather than leaving it out', async () => {
    const { deps, stored } = stand();
    // A missing key reads like something withheld; an empty list is an answer.
    deps.rows = async () => [];
    deps.children = async () => [];
    await handleExport(deps);
    const doc = stored[0]!.document;
    for (const name of doc.about.contains) assert.deepEqual(doc.data[name], [], name);
  });

  it('hands the request back when a read fails, so the deadline is not missed', async () => {
    const { deps, released, stored, completed } = stand({ failOn: 'contact' });
    const reply = await handleExport(deps);
    assert.equal(reply.status, 500);
    assert.deepEqual(stored, []);
    assert.deepEqual(completed, []);
    // Left claimed, it would sit there quietly until the 30 days ran out.
    assert.deepEqual(released, [REQUEST]);
  });

  it('hands it back when the file cannot be written', async () => {
    const { deps, released, completed } = stand({ failOn: 'store' });
    assert.equal((await handleExport(deps)).status, 500);
    assert.deepEqual(completed, []);
    assert.deepEqual(released, [REQUEST]);
  });
});

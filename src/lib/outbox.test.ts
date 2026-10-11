/**
 * The append-only queue analytics events and privacy requests wait in.
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { outbox, type Store } from './outbox';

/** AsyncStorage's web backend wants `window`, which node has not got. */
function memory(): Store & { seen: Map<string, string> } {
  const seen = new Map<string, string>();
  return {
    seen,
    getItem: async (key) => seen.get(key) ?? null,
    setItem: async (key, value) => void seen.set(key, value),
    removeItem: async (key) => void seen.delete(key),
  };
}

describe('an outbox', () => {
  it('reads back what was added, oldest first', async () => {
    const q = outbox<number>('k', 10, memory());
    await q.add(1);
    await q.add(2);
    await q.add(3);
    assert.deepEqual(await q.read(), [1, 2, 3]);
  });

  it('drops only what the server took, from the front', async () => {
    const q = outbox<number>('k', 10, memory());
    for (const n of [1, 2, 3, 4]) await q.add(n);
    await q.dropSent(2);
    assert.deepEqual(await q.read(), [3, 4]);
    // A sync that sent nothing must not eat a row.
    await q.dropSent(0);
    assert.deepEqual(await q.read(), [3, 4]);
  });

  it('caps at the limit, keeping the newest', async () => {
    const q = outbox<number>('k', 3, memory());
    for (const n of [1, 2, 3, 4, 5]) await q.add(n);
    assert.deepEqual(await q.read(), [3, 4, 5]);
  });

  it('empties the key rather than leaving an empty list behind', async () => {
    const store = memory();
    const q = outbox<number>('k', 3, store);
    await q.add(1);
    await q.dropSent(1);
    assert.deepEqual(await q.read(), []);
    assert.equal(store.seen.has('k'), false);
  });

  it('tells the sync there is something to send, once per row', async () => {
    const q = outbox<number>('k', 3, memory());
    let calls = 0;
    q.onQueued(() => {
      calls += 1;
    });
    await q.add(1);
    await q.add(2);
    assert.equal(calls, 2);
    // Unregistering must stop it: the provider does this on unmount.
    q.onQueued(null);
    await q.add(3);
    assert.equal(calls, 2);
  });

  it('treats a corrupt queue as empty rather than throwing', async () => {
    const store = memory();
    store.seen.set('k', '{not json');
    const q = outbox<number>('k', 3, store);
    assert.deepEqual(await q.read(), []);
  });

  it('clears everything unsent', async () => {
    const q = outbox<number>('k', 3, memory());
    await q.add(1);
    await q.clear();
    assert.deepEqual(await q.read(), []);
  });
});

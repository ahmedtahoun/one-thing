/**
 * The three-way merge. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyDelta, reconcile, reconcileOne } from './reconcile';

type Row = { id: string; v: number };
const r = (id: string, v = 0): Row => ({ id, v });
const key = (row: Row) => row.id;
const ids = (rows: Row[]) => rows.map((x) => `${x.id}${x.v}`).sort();

describe('reconcile', () => {
  it('pushes rows new here and takes rows new there', () => {
    const out = reconcile([r('a')], [], [r('b')], key);
    assert.deepEqual(ids(out.merged), ['a0', 'b0']);
    assert.deepEqual(ids(out.upsert), ['a0']);
    assert.deepEqual(out.remove, []);
  });

  it('pushes a change made here, takes a change made there', () => {
    const base = [r('a'), r('b')];
    const out = reconcile([r('a', 1), r('b')], base, [r('a'), r('b', 2)], key);
    assert.deepEqual(ids(out.merged), ['a1', 'b2']);
    assert.deepEqual(ids(out.upsert), ['a1']);
  });

  it('lets this device win when both changed the same row', () => {
    const out = reconcile([r('a', 1)], [r('a')], [r('a', 2)], key);
    assert.deepEqual(ids(out.merged), ['a1']);
    assert.deepEqual(ids(out.upsert), ['a1']);
  });

  it('does not push a row that both sides changed the same way', () => {
    const out = reconcile([r('a', 1)], [r('a')], [r('a', 1)], key);
    assert.deepEqual(out.upsert, []);
  });

  it('carries deletions both ways', () => {
    const base = [r('a'), r('b')];
    const out = reconcile([r('a')], base, [r('b')], key);
    assert.deepEqual(out.merged, []);
    assert.deepEqual(out.remove, ['b']);
    assert.deepEqual(out.upsert, []);
  });

  it('keeps an edit over a deletion, from either side', () => {
    const here = reconcile([r('a', 1)], [r('a')], [], key);
    assert.deepEqual(ids(here.merged), ['a1']);
    assert.deepEqual(ids(here.upsert), ['a1']);
    const there = reconcile([], [r('a')], [r('a', 2)], key);
    assert.deepEqual(ids(there.merged), ['a2']);
    assert.deepEqual(there.remove, []);
  });

  it('pushes everything on a first sync, and takes everything on a fresh device', () => {
    assert.deepEqual(ids(reconcile([r('a'), r('b')], [], [], key).upsert), ['a0', 'b0']);
    const fresh = reconcile([], [], [r('a'), r('b')], key);
    assert.deepEqual(ids(fresh.merged), ['a0', 'b0']);
    assert.deepEqual(fresh.upsert, []);
  });

  it('compares rows by content, whatever order their keys are in', () => {
    const out = reconcile([{ id: 'a', x: 1, y: 2 }], [{ y: 2, x: 1, id: 'a' }], [{ y: 2, x: 1, id: 'a' }], (x) => x.id);
    assert.deepEqual(out.upsert, []);
  });
});

describe('reconcileOne', () => {
  it('pushes when the server has nothing, takes the server when only it changed', () => {
    assert.deepEqual(reconcileOne(r('s', 1), null, null), { merged: r('s', 1), push: true });
    // A device that has never synced holds defaults, not choices.
    assert.deepEqual(reconcileOne(r('s', 1), null, r('s', 5)), { merged: r('s', 5), push: false });
    assert.deepEqual(reconcileOne(r('s', 0), r('s', 0), r('s', 5)), { merged: r('s', 5), push: false });
    assert.deepEqual(reconcileOne(r('s', 1), r('s', 0), r('s', 5)), { merged: r('s', 1), push: true });
    assert.deepEqual(reconcileOne(r('s', 0), r('s', 0), r('s', 0)), { merged: r('s', 0), push: false });
  });
});

describe('applyDelta', () => {
  it('applies what the sync decided', () => {
    const a = r('a');
    const b = r('b');
    const before = [a, b];
    const a2 = r('a', 2);
    const c = r('c');
    const next = applyDelta(before, before, [a2, c], key);
    assert.deepEqual(ids(next), ['a2', 'c0']);
  });

  it('leaves alone anything the user changed while the sync ran', () => {
    const a = r('a');
    const b = r('b');
    const before = [a, b];
    const mine = r('a', 9); // edited during the sync
    const added = r('n'); // added during the sync
    const current = [mine, added]; // and b deleted during it
    const next = applyDelta(current, before, [r('a', 2), r('b', 3)], key);
    assert.deepEqual(ids(next), ['a9', 'n0']);
  });

  it('returns the same list when there is nothing to do', () => {
    const before = [r('a')];
    assert.equal(applyDelta(before, before, before, key), before);
  });
});

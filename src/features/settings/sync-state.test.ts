/**
 * What Settings says about syncing. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canSyncNow, isTrouble, showsRow, syncLine } from './sync-state';

const AT = '2026-10-18T09:00:00.000Z';

describe('which line Settings shows', () => {
  it('says nothing when there is no backend or nobody is signed in', () => {
    assert.deepEqual(syncLine('off', null), { kind: 'off' });
    assert.deepEqual(syncLine('off', AT), { kind: 'off' });
  });

  it('says it is working while it works', () => {
    assert.deepEqual(syncLine('syncing', AT), { kind: 'syncing' });
  });

  it('says when it last worked', () => {
    assert.deepEqual(syncLine('idle', AT), { kind: 'synced', at: AT });
  });

  it('separates "signed in, nothing up yet" from "synced"', () => {
    assert.deepEqual(syncLine('idle', null), { kind: 'pending' });
  });

  it('reports a failure, and carries when it last worked', () => {
    assert.deepEqual(syncLine('error', AT), { kind: 'error', lastAt: AT });
  });

  it('reports a failure that has never succeeded', () => {
    assert.deepEqual(syncLine('error', null), { kind: 'error', lastAt: null });
  });

  it('does not let a past success hide a present failure', () => {
    const line = syncLine('error', AT);
    assert.notEqual(line.kind, 'synced');
    assert.equal(isTrouble(line), true);
  });
});

describe('how the row behaves', () => {
  it('colours only the failure as trouble', () => {
    assert.equal(isTrouble(syncLine('error', AT)), true);
    for (const line of [syncLine('idle', AT), syncLine('syncing', AT), syncLine('idle', null), syncLine('off', AT)]) {
      assert.equal(isTrouble(line), false);
    }
  });

  it('offers Sync now except while one is running, or with no backend', () => {
    assert.equal(canSyncNow(syncLine('error', AT)), true);
    assert.equal(canSyncNow(syncLine('idle', AT)), true);
    assert.equal(canSyncNow(syncLine('idle', null)), true);
    assert.equal(canSyncNow(syncLine('syncing', AT)), false);
    assert.equal(canSyncNow(syncLine('off', AT)), false);
  });

  it('keeps the row off the screen only when there is nothing to sync with', () => {
    assert.equal(showsRow(syncLine('off', null)), false);
    for (const status of ['idle', 'syncing', 'error'] as const) {
      assert.equal(showsRow(syncLine(status, AT)), true);
    }
  });
});

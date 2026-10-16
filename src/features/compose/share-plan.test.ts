/**
 * What a share hands over, per platform. Run with `npm test`.
 *
 * Worth testing rather than trying on a phone, because the interesting
 * cases are on the platform you are not holding: the bug this closes was
 * Android losing a file in silence while iOS carried it, and only a test
 * that asks both at once would have caught it.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sharePlan } from './share-plan';

describe('what a share carries', () => {
  it('sends the message alone when nothing is attached, anywhere', () => {
    for (const platform of ['ios', 'android', 'web'] as const) {
      assert.deepEqual(sharePlan(platform, 0, true), { kind: 'text', left: 0, clipboard: 'address' }, platform);
      assert.deepEqual(sharePlan(platform, 0, false), { kind: 'text', left: 0, clipboard: 'address' }, platform);
    }
  });

  it('sends the message and one file on iOS', () => {
    assert.deepEqual(sharePlan('ios', 1, true), { kind: 'textAndFile', left: 0, clipboard: 'address' });
    assert.deepEqual(sharePlan('ios', 3, true), { kind: 'textAndFile', left: 2, clipboard: 'address' });
  });

  it('sends the file instead of the message on Android, and keeps the draft to paste', () => {
    assert.deepEqual(sharePlan('android', 1, true), { kind: 'file', left: 0, clipboard: 'draft' });
    assert.deepEqual(sharePlan('android', 4, true), { kind: 'file', left: 3, clipboard: 'draft' });
  });

  it('falls back to the message when a file cannot go at all', () => {
    // Android without the sharing module, and the web build, which has no
    // native share of either kind.
    assert.deepEqual(sharePlan('android', 2, false), { kind: 'text', left: 2, clipboard: 'address' });
    assert.deepEqual(sharePlan('web', 2, true), { kind: 'text', left: 2, clipboard: 'address' });
  });

  /**
   * The rule the screen depends on: `left` is every attached file that will
   * not arrive, so a toast built from it can never undercount. Getting this
   * wrong is how an attachment goes missing quietly, which is the whole
   * failure being designed against.
   */
  it('counts every file that will not arrive', () => {
    for (const platform of ['ios', 'android', 'web'] as const) {
      for (const available of [true, false]) {
        for (const count of [0, 1, 2, 5]) {
          const plan = sharePlan(platform, count, available);
          const carried = plan.kind === 'text' ? 0 : 1;
          assert.equal(plan.left, Math.max(0, count - carried), `${platform}/${available}/${count}`);
          assert.ok(plan.left >= 0);
        }
      }
    }
  });

  it('never claims to carry a file it cannot', () => {
    assert.notEqual(sharePlan('android', 1, false).kind, 'file', 'no module, no file');
    assert.notEqual(sharePlan('web', 1, true).kind, 'file', 'the web build has no native share');
    assert.notEqual(sharePlan('ios', 1, true).kind, 'file', 'iOS carries the message too');
  });
});

/**
 * Where a coach mark lands. Run with `npm test`.
 *
 * These are the cases a phone would only show you one at a time, and only
 * if you happened to have a task in that position: a control at the very
 * bottom, one hard against a corner, one wider than the screen.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { highlight, place, type Rect } from './geometry';

const SCREEN = { width: 402, height: 874 };
const OPTS = { bubbleWidth: 300, bubbleHeight: 120, gap: 12, margin: 16, arrowHalf: 9 };

const middle: Rect = { x: 20, y: 300, width: 362, height: 160 };

describe('placing the bubble', () => {
  it('hangs it under a control with room below, arrow pointing up at it', () => {
    const p = place(middle, SCREEN, OPTS);
    assert.equal(p.arrow, 'up');
    assert.equal(p.from, 'top');
    assert.equal(p.offset, 300 + 160 + 12);
  });

  it('flips above a control near the bottom, rather than off the screen', () => {
    const low: Rect = { x: 20, y: 760, width: 362, height: 90 };
    const p = place(low, SCREEN, OPTS);
    assert.equal(p.arrow, 'down');
    assert.equal(p.from, 'bottom');
    // Pinned by its bottom edge, a gap above the control.
    assert.equal(p.offset, SCREEN.height - (760 - 12));
  });

  /**
   * The bug a screenshot found. Pinned by the top, a bubble whose text runs
   * one line longer than the estimate reaches down over the control it is
   * pointing at — which is what the mark on the mic did. Pinned by the
   * bottom, any height is safe.
   */
  it('cannot overlap the control above which it sits, however tall it gets', () => {
    const mic: Rect = { x: 170, y: 790, width: 60, height: 60 };
    const p = place(mic, SCREEN, OPTS);
    assert.equal(p.from, 'bottom');
    for (const realHeight of [90, 132, 200, 320]) {
      const top = SCREEN.height - p.offset - realHeight;
      const bottom = top + realHeight;
      assert.ok(bottom <= mic.y, `a ${realHeight}pt bubble reached ${bottom}, control starts at ${mic.y}`);
    }
  });

  it('centres it on the control', () => {
    const p = place(middle, SCREEN, OPTS);
    assert.equal(p.left + p.width / 2, middle.x + middle.width / 2);
  });

  it('never lets it off either edge', () => {
    for (const x of [-40, 0, 8, 360, 400]) {
      const p = place({ x, y: 200, width: 60, height: 60 }, SCREEN, OPTS);
      assert.ok(p.left >= OPTS.margin, `left ${p.left} at x=${x}`);
      assert.ok(p.left + p.width <= SCREEN.width - OPTS.margin, `right edge at x=${x}`);
    }
  });

  it('narrows the bubble rather than overflowing a narrow screen', () => {
    const narrow = { width: 300, height: 600 };
    const p = place({ x: 10, y: 100, width: 280, height: 50 }, narrow, OPTS);
    assert.equal(p.width, 300 - 16 * 2);
    assert.ok(p.left + p.width <= narrow.width - OPTS.margin);
  });

  /**
   * The point of tracking the arrow separately. Once the bubble is pushed
   * away from an edge it is no longer centred on the control, and an arrow
   * drawn at the bubble's middle would point at empty screen.
   */
  it('keeps the arrow on the control even when the bubble is pushed off-centre', () => {
    const corner: Rect = { x: 4, y: 200, width: 48, height: 48 };
    const p = place(corner, SCREEN, OPTS);
    const arrowAbsolute = p.left + p.arrowOffset;
    assert.ok(
      arrowAbsolute >= corner.x - 1 && arrowAbsolute <= corner.x + corner.width + 1,
      `arrow at ${arrowAbsolute}, control spans ${corner.x}–${corner.x + corner.width}`
    );
  });

  it('keeps the arrow off the bubble’s rounded corners', () => {
    for (const x of [-50, 0, 180, 390, 500]) {
      const p = place({ x, y: 200, width: 40, height: 40 }, SCREEN, OPTS);
      assert.ok(p.arrowOffset >= OPTS.arrowHalf, `arrow ${p.arrowOffset} too near the left corner`);
      assert.ok(p.arrowOffset <= p.width - OPTS.arrowHalf, `arrow ${p.arrowOffset} too near the right corner`);
    }
  });

  it('is the same in both languages, because the maths is absolute', () => {
    // There is no isRTL argument on purpose: a control measured at x=20 is
    // 20 from the left of the window whatever the writing direction, so a
    // mirrored placement would put the bubble on the wrong side.
    assert.equal(place.length, 3);
  });
});

describe('the bright hole', () => {
  it('grows the control by the padding', () => {
    assert.deepEqual(highlight({ x: 100, y: 100, width: 50, height: 40 }, SCREEN, 8), { x: 92, y: 92, width: 66, height: 56 });
  });

  it('does not spill off the top or the left', () => {
    const h = highlight({ x: 2, y: 1, width: 40, height: 40 }, SCREEN, 10);
    assert.equal(h.x, 0);
    assert.equal(h.y, 0);
  });

  it('does not spill off the right or the bottom', () => {
    const h = highlight({ x: 380, y: 850, width: 40, height: 40 }, SCREEN, 10);
    assert.ok(h.x + h.width <= SCREEN.width);
    assert.ok(h.y + h.height <= SCREEN.height);
  });
});

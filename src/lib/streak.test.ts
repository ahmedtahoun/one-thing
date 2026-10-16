import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { streakOf } from './streak';

const NOW = new Date('2026-10-10T09:20:00');

describe('streakOf', () => {
  it('counts consecutive days ending today', () => {
    assert.deepEqual(streakOf(['2026-10-08', '2026-10-09', '2026-10-10'], NOW), { current: 3, doneToday: true, total: 3 });
  });
  it('keeps a streak alive while today is still open', () => {
    assert.deepEqual(streakOf(['2026-10-08', '2026-10-09'], NOW), { current: 2, doneToday: false, total: 2 });
  });
  it('starts again after a missed day, without losing the history', () => {
    assert.deepEqual(streakOf(['2026-10-05', '2026-10-06', '2026-10-08'], NOW), { current: 0, doneToday: false, total: 3 });
    assert.equal(streakOf(['2026-10-05', '2026-10-06', '2026-10-10'], NOW).current, 1);
  });
  it('is empty for a new person', () => {
    assert.deepEqual(streakOf([], NOW), { current: 0, doneToday: false, total: 0 });
  });
  it('crosses a month boundary', () => {
    assert.equal(streakOf(['2026-09-30', '2026-10-01'], new Date('2026-10-01T10:00:00')).current, 2);
  });
});

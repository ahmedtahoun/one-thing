import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chatTime } from './time';

const NOW = new Date('2026-10-14T09:20:00');

describe('chatTime', () => {
  it('shows the clock for today', () => assert.equal(chatTime('2026-10-14T00:05:00', NOW, 'en'), '12:05 AM'));
  it('says Yesterday, in both languages', () => {
    assert.equal(chatTime('2026-10-13T23:50:00', NOW, 'en'), 'Yesterday');
    assert.equal(chatTime('2026-10-13T08:00:00', NOW, 'ar'), 'أمس');
  });
  it('shows the weekday for the past week', () => {
    assert.equal(chatTime('2026-10-11T10:00:00', NOW, 'en'), 'Sunday');
    assert.match(chatTime('2026-10-11T10:00:00', NOW, 'ar'), /^[؀-ۿ]+$/);
  });
  it('uses PM in the afternoon, and ص / م in Arabic', () => {
    assert.equal(chatTime('2026-10-14T15:45:00', NOW, 'en'), '3:45 PM');
    assert.equal(chatTime('2026-10-14T08:10:00', NOW, 'ar'), '\u20668:10\u2069 ص');
  });
  it('shows the date after that', () => assert.equal(chatTime('2026-09-01T10:00:00', NOW, 'en'), '01/09/2026'));
  it('copes with nothing', () => {
    assert.equal(chatTime(undefined, NOW, 'en'), '');
    assert.equal(chatTime('nonsense', NOW, 'en'), '');
  });
});

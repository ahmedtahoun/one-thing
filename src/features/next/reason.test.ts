import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { added } from '@/content/additions';

import { isUrgent, reasonText } from './reason';

const en = added('en').next;

describe('reasonText', () => {
  it('says how late in the unit that reads best', () => {
    assert.equal(reasonText({ kind: 'late', minutes: 0 }, en), '1 min late');
    assert.equal(reasonText({ kind: 'late', minutes: 25 }, en), '25 min late');
    assert.equal(reasonText({ kind: 'late', minutes: 180 }, en), '3 h late');
    assert.equal(reasonText({ kind: 'late', minutes: 1500 }, en), '1 day late');
    assert.equal(reasonText({ kind: 'late', minutes: 3 * 1440 + 5 }, en), '3 days late');
  });
  it('says the wait for a reply, the time, and the quiet', () => {
    assert.equal(reasonText({ kind: 'reply', days: 0 }, en), 'Time to follow up');
    assert.equal(reasonText({ kind: 'reply', days: 1 }, en), 'Waiting 1 day for a reply');
    assert.equal(reasonText({ kind: 'reply', days: 4 }, en), 'Waiting 4 days for a reply');
    assert.equal(reasonText({ kind: 'today', at: '09:30' }, en), 'Today at 9:30 AM');
    assert.equal(reasonText({ kind: 'quiet', days: 21 }, en), 'No contact for 21 days');
  });
  it('has Arabic for every reason', () => {
    const ar = added('ar').next;
    for (const r of [
      { kind: 'late', minutes: 30 },
      { kind: 'late', minutes: 600 },
      { kind: 'late', minutes: 1500 },
      { kind: 'late', minutes: 5000 },
      { kind: 'today', at: '09:30' },
      { kind: 'reply', days: 0 },
      { kind: 'reply', days: 1 },
      { kind: 'reply', days: 3 },
      { kind: 'quiet', days: 20 },
    ] as const) {
      const text = reasonText(r, ar);
      assert.ok(text.length > 0 && !text.includes('{'), text);
    }
  });
  it('marks late and unanswered as urgent', () => {
    assert.equal(isUrgent({ kind: 'late', minutes: 1 }), true);
    assert.equal(isUrgent({ kind: 'reply', days: 1 }), true);
    assert.equal(isUrgent({ kind: 'today', at: '09:00' }), false);
    assert.equal(isUrgent({ kind: 'quiet', days: 20 }), false);
  });
});

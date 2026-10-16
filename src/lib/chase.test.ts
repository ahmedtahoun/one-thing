import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chaseDays, inDays } from './chase';

describe('how long to wait before chasing', () => {
  it('Auto: two days for a chat, three for an email, none for a call', () => {
    assert.equal(chaseDays('auto', 'whatsapp'), 2);
    assert.equal(chaseDays('auto', 'email'), 3);
    assert.equal(chaseDays('auto', 'call'), 0);
  });
  it('Off asks for nothing; a number is the number', () => {
    assert.equal(chaseDays('off', 'email'), 0);
    assert.equal(chaseDays(7, 'call'), 7);
  });
  it('says it in both languages', () => {
    assert.equal(inDays(1, 'en'), 'tomorrow');
    assert.equal(inDays(3, 'en'), 'in 3 days');
    assert.equal(inDays(7, 'en'), 'next week');
    assert.equal(inDays(2, 'ar'), 'بعد يومين');
    assert.equal(inDays(3, 'ar'), 'بعد 3 أيام');
  });
});

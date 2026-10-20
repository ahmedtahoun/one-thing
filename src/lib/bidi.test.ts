import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { own } from './bidi';

describe('a line in two scripts', () => {
  it('isolates Arabic with an English name, so the name stays at its end', () => {
    assert.equal(own('رسالة لـKhaled'), '⁨رسالة لـKhaled⁩');
  });

  it('leaves a line in one script as it is', () => {
    assert.equal(own('Email Maria'), 'Email Maria');
    assert.equal(own('اتصال بـخالد'), 'اتصال بـخالد');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pickLocale } from './speech-locale';

describe('pickLocale', () => {
  it('prefers the person’s own Arabic region when the device has it', () => {
    assert.equal(pickLocale('ar', ['ar-SA', 'ar-EG', 'en-US'], 'EG'), 'ar-EG');
    assert.equal(pickLocale('ar', ['ar-SA', 'ar-AE'], 'AE'), 'ar-AE');
  });
  it('falls back to what the device supports', () => {
    assert.equal(pickLocale('ar', ['ar-SA', 'en-US'], 'EG'), 'ar-SA');
    assert.equal(pickLocale('ar', ['ar_AE'], 'US'), 'ar-AE');
  });
  it('guesses sensibly when the device lists nothing', () => {
    assert.equal(pickLocale('ar', [], 'EG'), 'ar-EG');
    assert.equal(pickLocale('ar', [], undefined), 'ar-SA');
    assert.equal(pickLocale('en', [], undefined), 'en-US');
  });
  it('picks English by region, else US', () => {
    assert.equal(pickLocale('en', ['en-US', 'en-GB'], 'GB'), 'en-GB');
    assert.equal(pickLocale('en', ['en-US', 'en-GB'], 'EG'), 'en-US');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { initials } from './model-types';

describe('initials', () => {
  it('takes two letters of a Latin name', () => {
    assert.equal(initials('Al Noor Packaging'), 'AN');
    assert.equal(initials('sara'), 'S');
  });
  it('takes one letter of an Arabic name, and never the article', () => {
    assert.equal(initials('محمد السعدي'), 'م');
    assert.equal(initials('النور للتغليف'), 'ن');
    assert.equal(initials('سارة حداد'), 'س');
    assert.equal(initials('ال'), 'ا');
  });
});

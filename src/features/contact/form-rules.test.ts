/**
 * The contact form's rules. Run with `npm test`.
 *
 * The country-from-a-number cases are all from one screenshot: an Egyptian
 * owner typing an Egyptian number into a form sitting on +966, with nothing
 * noticing.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dialFromTyped } from './form-rules';

describe('the country a number names', () => {
  /** The screenshot: 01117515284 typed on a form showing +966. */
  it('reads an Egyptian mobile wherever it is typed', () => {
    assert.deepEqual(dialFromTyped('01117515284'), { dial: '+20', phone: '1117515284' });
    assert.deepEqual(dialFromTyped('0111 751 5284'), { dial: '+20', phone: '1117515284' });
  });

  it('reads a number written with its code, however it is written', () => {
    for (const typed of ['+201117515284', '00201117515284', '201117515284', '+20 111 751 5284']) {
      assert.deepEqual(dialFromTyped(typed), { dial: '+20', phone: '1117515284' }, typed);
    }
  });

  it('reads the other countries the same way', () => {
    assert.equal(dialFromTyped('+966501234567')?.dial, '+966');
    assert.equal(dialFromTyped('966501234567')?.dial, '+966');
    assert.equal(dialFromTyped('+971 50 331 2045')?.dial, '+971');
    assert.equal(dialFromTyped('+1 415 555 2671')?.dial, '+1');
  });

  it('drops the trunk zero that follows a country code', () => {
    assert.deepEqual(dialFromTyped('+20 0111 751 5284'), { dial: '+20', phone: '1117515284' });
  });

  /**
   * The other half of the rule, and the one that keeps it from being
   * annoying: a local number does not name a country, so the picker keeps
   * whatever it has and the digits are left exactly as typed.
   */
  it('says nothing about a local number', () => {
    assert.equal(dialFromTyped('0501234567'), null);
    assert.equal(dialFromTyped('501234567'), null);
    assert.equal(dialFromTyped('55 999 0000'), null);
  });

  it('says nothing while somebody is still typing', () => {
    for (const typed of ['', '0', '01', '011', '0111', '+', '+2', '123']) {
      assert.equal(dialFromTyped(typed), null, JSON.stringify(typed));
    }
  });

  it('takes the device’s country for a local number only when asked to', () => {
    // Nothing is inferred here: the caller passes the region, and a local
    // number still answers null — the region decides the *default* in the
    // picker, not what an already-typed number means.
    assert.equal(dialFromTyped('0501234567', 'EG'), null);
  });
});

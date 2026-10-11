/**
 * What a contact picked from the phone fills the form with. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { draftFromPhone, splitNumber } from './draft';

describe('a contact from the phone', () => {
  it('fills name, role, number and email', () => {
    assert.deepEqual(
      draftFromPhone({
        name: 'Sara Haddad',
        jobTitle: 'Investor',
        company: 'Northwind VC',
        phoneNumbers: [
          { number: '+971 4 123 4567', label: 'work' },
          { number: '+971 50 331 2045', label: 'mobile' },
        ],
        emails: [{ email: 'sara@northwind.vc', label: 'work' }],
      }),
      { name: 'Sara Haddad', role: 'Investor · Northwind VC', dial: '+971', phone: '503312045', email: 'sara@northwind.vc' }
    );
  });

  it('prefers the primary number, then a mobile, then the first', () => {
    const numbers = [{ number: '+966 11 465 2200', label: 'home' }, { number: '+966 55 123 4567', label: 'iPhone' }];
    assert.equal(draftFromPhone({ name: 'A', phoneNumbers: numbers }).phone, '551234567');
    assert.equal(draftFromPhone({ name: 'A', phoneNumbers: [...numbers, { number: '+966 50 000 0000', label: 'x', isPrimary: true }] }).phone, '500000000');
    assert.equal(draftFromPhone({ name: 'A', phoneNumbers: [{ number: '+20 10 1234 5678', label: 'home' }] }).dial, '+20');
  });

  it('builds a name from its parts, and falls back to the company', () => {
    assert.equal(draftFromPhone({ firstName: 'Noura', lastName: 'Al-Harbi' }).name, 'Noura Al-Harbi');
    assert.deepEqual(draftFromPhone({ company: 'Al Noor Packaging' }), { name: 'Al Noor Packaging', role: '', dial: null, phone: '', email: '' });
    assert.equal(draftFromPhone({ name: 'محمد السعدي' }).name, 'محمد السعدي');
  });

  it('reads the country from the number, the longest code first', () => {
    assert.deepEqual(splitNumber('+966 50 123 4567'), { dial: '+966', phone: '501234567' });
    assert.deepEqual(splitNumber('00971 50 331 2045'), { dial: '+971', phone: '503312045' });
    assert.deepEqual(splitNumber('+1 (415) 555-0100'), { dial: '+1', phone: '4155550100' });
  });

  it('keeps the form’s country for a local number, unless the phone knew it', () => {
    assert.deepEqual(splitNumber('050 123 4567'), { dial: null, phone: '501234567' });
    assert.deepEqual(splitNumber('050 123 4567', 'AE'), { dial: '+971', phone: '501234567' });
  });
});

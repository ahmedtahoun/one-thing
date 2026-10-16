/**
 * The panel's two CSV exports. Run with `npm test` in `admin/`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cell, contactsToCsv, usersToCsv } from './csv';
import type { UserDetail, UserRow } from './types';

const contact = (over: Partial<UserDetail['contactList'][number]> = {}): UserDetail['contactList'][number] => ({
  name: 'Mohammed Al-Saadi',
  role: 'Client · Al-Saadi Trading',
  phone: '+966 50 221 4410',
  email: 'mohammed@alsaadi-trading.com',
  history: 7,
  phone2: '',
  email2: '',
  channel: null,
  ...over,
});

describe('a CSV cell', () => {
  it('quotes only what has to be quoted, and doubles a quote', () => {
    assert.equal(cell('Omar Khalid'), 'Omar Khalid');
    assert.equal(cell('Al-Saadi, Trading'), '"Al-Saadi, Trading"');
    assert.equal(cell('Omar "Abu Ali" Khalid'), '"Omar ""Abu Ali"" Khalid"');
    assert.equal(cell('two\nlines'), '"two\nlines"');
    assert.equal(cell(null), '');
    assert.equal(cell(undefined), '');
    assert.equal(cell(0), '0');
  });
});

describe('one user’s contacts as CSV', () => {
  it('writes the header, then a row for each contact', () => {
    const csv = contactsToCsv([contact(), contact({ name: 'Sara Haddad', history: 2 })]);
    const lines = csv.trimEnd().split('\n');
    assert.equal(lines[0], 'name,position_company,phone,phone_2,email,email_2,preferred_channel,times_in_touch');
    assert.equal(lines.length, 3);
    assert.ok(lines[1]?.startsWith('Mohammed Al-Saadi,'));
    assert.ok(csv.endsWith('\n'), 'a CSV ends with a newline');
  });

  it('leaves a missing second number, second email and channel empty rather than absent', () => {
    // A row must keep its eight columns, or everything after the gap shifts.
    const [, row = ''] = contactsToCsv([contact()]).trimEnd().split('\n');
    assert.equal(row.split(',').length, 8);
    assert.equal(row, 'Mohammed Al-Saadi,Client · Al-Saadi Trading,+966 50 221 4410,,mohammed@alsaadi-trading.com,,,7');
  });

  it('carries the second number, the second email and the chosen channel', () => {
    const csv = contactsToCsv([contact({ phone2: '+966 11 477 3301', email2: 'orders@alsaadi-trading.com', channel: 'whatsapp' })]);
    assert.ok(csv.includes('+966 11 477 3301'));
    assert.ok(csv.includes('orders@alsaadi-trading.com'));
    assert.ok(csv.includes(',whatsapp,'));
  });

  it('escapes a company name holding a comma', () => {
    const csv = contactsToCsv([contact({ role: 'Client · Al-Saadi Trading, Jeddah' })]);
    assert.ok(csv.includes('"Client · Al-Saadi Trading, Jeddah"'));
    assert.equal(csv.trimEnd().split('\n').length, 2, 'the comma did not start a new row');
  });

  it('is empty but valid for a user who has saved nobody', () => {
    assert.equal(contactsToCsv([]), 'name,position_company,phone,phone_2,email,email_2,preferred_channel,times_in_touch\n');
  });

  /**
   * The Privacy Policy's "Who at our company can see it" lists "name,
   * position, company, phone and email". The contact's address, the user's
   * labels for them and the user's note about them are stored and are not in
   * that sentence, so they are not in this file either. If the sentence is
   * ever widened, this test is the thing to change first.
   */
  it('does not carry the address, the labels or the user’s notes', () => {
    const head = contactsToCsv([contact()]).split('\n')[0] ?? '';
    for (const column of ['address', 'label', 'note']) {
      assert.ok(!head.includes(column), `the header offers ${column}`);
    }
  });
});

describe('the user list as CSV', () => {
  it('keeps its eleven columns and says yes or no for marketing', () => {
    const row: UserRow = {
      id: 'usr_1179', name: 'Khalid Al-Mansouri', first: 'Khalid', email: 'khalid@example.com',
      phone: '+966 50 111 2233', job: 'Founder', country: '🇸🇦 Saudi Arabia', platform: 'iOS',
      signin: 'Apple', plan: 'pro', sub: 'active', billing: 'Yearly', joinedAt: '2026-01-04',
      lastActiveAt: '2026-10-10', contacts: 12, tasks: 40, marketing: true, suspended: false,
    };
    const lines = usersToCsv([row]).trimEnd().split('\n');
    assert.equal(lines[0]?.split(',').length, 11);
    assert.ok(lines[1]?.endsWith(',yes'));
    assert.ok(usersToCsv([{ ...row, marketing: false }]).trimEnd().endsWith(',no'));
  });
});

/**
 * What a card scan can say afterwards. Run with `npm test`.
 *
 * The case this is really about: a bilingual Gulf card on Android. ML Kit
 * has no Arabic recogniser, so the Arabic lines never arrive — but the
 * Latin ones do, and they carry the phone, the email and the English side.
 * The screen used to tell those people to type the card in by hand.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCard } from './parse';
import { scanOutcome } from './scan-note';

/** What ML Kit's Latin pass returns from a bilingual Saudi card: no Arabic. */
const ANDROID_BILINGUAL = [
  'Khaled Al-Mansouri',
  'Chief Executive Officer',
  'Al Shamal Trading Co.',
  '+966 50 123 4567',
  'khaled@alshamal.com',
  'Riyadh - King Fahd Road',
];

describe('what a scan can say afterwards', () => {
  it('says nothing was read when nothing was', () => {
    assert.equal(scanOutcome(true, {}), 'nothing');
    assert.equal(scanOutcome(false, {}), 'nothing');
    assert.equal(scanOutcome(false, { name: '   ' }), 'nothing', 'blank is not a field');
  });

  it('says it read the lot where Arabic is read', () => {
    assert.equal(scanOutcome(true, { name: 'خالد المنصوري', phone: '501234567' }), 'readInFull');
  });

  it('warns that Arabic was missed where it cannot be read', () => {
    assert.equal(scanOutcome(false, { name: 'Khaled Al-Mansouri' }), 'latinOnly');
  });
});

describe('a bilingual card on Android', () => {
  const fields = parseCard(ANDROID_BILINGUAL, { region: 'SA', prefer: 'ar' });

  /**
   * The point. Without the Arabic lines the card still gives up everything
   * a person would otherwise have typed, so the scan is worth doing and the
   * old "fill the details in by hand" was costing them one.
   */
  it('still yields the whole contact, in English', () => {
    assert.equal(fields.name, 'Khaled Al-Mansouri');
    assert.equal(fields.role, 'Chief Executive Officer · Al Shamal Trading Co.');
    assert.equal(fields.dial, '+966');
    assert.equal(fields.phone, '501234567');
    assert.equal(fields.email, 'khaled@alshamal.com');
    assert.ok(fields.address);
  });

  it('is reported as read, with a warning rather than as a failure', () => {
    assert.equal(scanOutcome(false, fields), 'latinOnly');
  });

  it('an Arabic-only card comes back nearly empty, and says so honestly', () => {
    // Printed in Arabic-Indic digits, which ML Kit does return.
    const sparse = parseCard(['٠٥٠١٢٣٤٥٦٧'], { region: 'SA', prefer: 'ar' });
    assert.equal(sparse.phone, '501234567');
    assert.equal(scanOutcome(false, sparse), 'latinOnly', 'a number alone is still something');
    assert.equal(scanOutcome(false, parseCard([], { region: 'SA' })), 'nothing');
  });
});

/**
 * The phone's address book, made into a list. Run with `npm test`.
 *
 * Every case here is one a phone has and a seeded demo does not: the same
 * person twice, a number written three ways, a name saved with diacritics
 * in one place and without them in another.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { alreadySaved, byName, dedupe, digitsOf, matchesQuery } from './phone-book';
import type { Contact } from '@/lib/model-types';
import type { ContactDraft } from '@/lib/phone-contacts/draft';

const draft = (name: string, phone = '', email = ''): ContactDraft => ({ name, role: '', dial: '+966', phone, email });
const saved = (id: string, name: string, over: Partial<Contact> = {}): Contact => ({
  id,
  name,
  createdAt: '2026-10-01T09:00:00.000Z',
  ...over,
});

describe('one row per person', () => {
  it('folds the same number written three ways into one', () => {
    const people = dedupe([draft('Sara', '+966 50 123 4567'), draft('Sara Haddad', '0501234567'), draft('S', '50 123 4567')]);
    assert.equal(people.length, 1);
  });

  it('keeps the fuller record of the two', () => {
    const [person] = dedupe([draft('Sara'), draft('Sara', '0501234567')]);
    assert.equal(person?.phone, '0501234567');
  });

  it('keeps two people who share nothing but a first name', () => {
    assert.equal(dedupe([draft('Sara', '0501111111'), draft('Sara', '0502222222')]).length, 2);
  });

  it('does not merge everybody who has no number at all', () => {
    assert.equal(dedupe([draft('Sara', '', 'sara@x.com'), draft('Omar', '', 'omar@x.com')]).length, 2);
  });
});

describe('finding somebody in it', () => {
  const sara = draft('Sara Haddad', '+966 50 123 4567', 'sara@northwind.vc');

  it('matches any part of the name', () => {
    assert.ok(matchesQuery(sara, 'sara'));
    assert.ok(matchesQuery(sara, 'haddad'));
    assert.ok(matchesQuery(sara, 'HAD'));
    assert.ok(!matchesQuery(sara, 'omar'));
  });

  it('matches the digits however the number is written', () => {
    assert.ok(matchesQuery(sara, '501234'));
    assert.ok(matchesQuery(sara, '50 123'));
  });

  it('ignores a digit or two, which would match everybody', () => {
    assert.ok(!matchesQuery(draft('Omar', '0509999999'), '50'), 'two digits is not a search');
  });

  it('reads an Arabic name the way it was typed, diacritics or not', () => {
    assert.ok(matchesQuery(draft('محمّد السعدي', '0501234567'), 'محمد'));
  });

  it('shows everybody before anything is typed', () => {
    assert.ok(matchesQuery(sara, '   '));
  });
});

describe('who is already in People', () => {
  const contacts = [saved('c1', 'Sara Haddad', { phone: '501234567', dial: '+966' }), saved('c2', 'Omar Khalid', { email: 'omar@x.com' })];

  it('knows them by number, whatever the name says', () => {
    assert.equal(alreadySaved(draft('S. Haddad (work)', '+966 50 123 4567'), contacts), 'c1');
  });

  it('knows them by email when there is no number', () => {
    assert.equal(alreadySaved(draft('Omar', '', 'OMAR@x.com'), contacts), 'c2');
  });

  it('knows them by name as a last resort', () => {
    assert.equal(alreadySaved(draft('Sara Haddad'), contacts), 'c1');
  });

  it('says nobody when it is nobody', () => {
    assert.equal(alreadySaved(draft('Layla', '0559999999'), contacts), null);
  });
});

describe('the order', () => {
  it('is alphabetical in the language being read', () => {
    const people = byName([draft('Omar'), draft('Ali'), draft('Zain')], 'en');
    assert.deepEqual(people.map((p) => p.name), ['Ali', 'Omar', 'Zain']);
  });

  it('takes the last nine digits, so a country code is not a difference', () => {
    assert.equal(digitsOf('+966 50 123 4567'), digitsOf('0501234567'));
  });
});

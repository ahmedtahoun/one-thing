/**
 * Adding a crowd. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addable, isMany, MANY, toggle } from './bulk-add';
import type { Contact } from '@/lib/model-types';
import type { ContactDraft } from '@/lib/phone-contacts/draft';

const draft = (name: string, phone = ''): ContactDraft => ({ name, role: '', dial: '+966', phone, email: '' });

describe('when it is a crowd', () => {
  it('says nothing about a handful', () => {
    assert.equal(isMany(1), false);
    assert.equal(isMany(12), false);
    assert.equal(isMany(99), false);
  });

  it('says something from a hundred', () => {
    assert.equal(isMany(MANY), true);
    assert.equal(isMany(847), true);
  });
});

describe('who would actually be added', () => {
  const contacts: Contact[] = [{ id: 'c1', name: 'Sara Haddad', phone: '501234567', dial: '+966', createdAt: '2026-10-01T09:00:00.000Z' }];

  it('leaves out the people already here', () => {
    const rows = addable([draft('Sara Haddad', '+966 50 123 4567'), draft('Omar Khalid', '0559999999')], contacts);
    assert.deepEqual(
      rows.map((r) => r.name),
      ['Omar Khalid']
    );
  });

  it('counts nobody when everybody is already here', () => {
    assert.equal(addable([draft('Sara Haddad', '0501234567')], contacts).length, 0);
  });
});

describe('choosing them', () => {
  it('puts one in and takes it out again', () => {
    const once = toggle(new Set<string>(), 'a');
    assert.deepEqual([...once], ['a']);
    assert.deepEqual([...toggle(once, 'a')], []);
  });

  it('leaves the others alone', () => {
    const chosen = toggle(toggle(new Set<string>(), 'a'), 'b');
    assert.deepEqual([...toggle(chosen, 'a')], ['b']);
  });

  it('does not change the set it was given', () => {
    const before = new Set(['a']);
    toggle(before, 'b');
    assert.deepEqual([...before], ['a']);
  });
});

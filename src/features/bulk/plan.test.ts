import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bccMailto, chunk, MAX_RECIPIENTS, personalise, reachable, recipientsOf, usesName, whatsAppLink } from './plan';
import type { Contact } from '@/lib/model-types';

const person = (id: string, name: string, over: Partial<Contact> = {}): Contact => ({
  id,
  name,
  dial: '+966',
  phone: '501234567',
  email: `${id}@example.com`,
  createdAt: '2026-10-10T09:00:00.000Z',
  ...over,
});

describe('reachable', () => {
  it('needs a real number for WhatsApp and a real address for email', () => {
    assert.equal(reachable('whatsapp', person('a', 'A')), true);
    assert.equal(reachable('whatsapp', person('a', 'A', { phone: '123' })), false);
    assert.equal(reachable('whatsapp', person('a', 'A', { phone: undefined })), false);
    assert.equal(reachable('email', person('a', 'A')), true);
    assert.equal(reachable('email', person('a', 'A', { email: 'nope' })), false);
    assert.equal(reachable('email', person('a', 'A', { email: undefined })), false);
  });
});

describe('personalise', () => {
  it('puts the first name in, in either language', () => {
    assert.equal(personalise('Hi {name}, quick update', person('a', 'Sara Haddad')), 'Hi Sara, quick update');
    assert.equal(personalise('أهلًا {الاسم}، عندي خبر', person('a', 'سارة حداد')), 'أهلًا سارة، عندي خبر');
  });
  it('closes the gap when there is no name', () => {
    assert.equal(personalise('Hi {name}, update', person('a', '')), 'Hi, update');
  });
  it('leaves a message without a name alone', () => {
    assert.equal(personalise('Meeting moved to 3pm.', person('a', 'Sara')), 'Meeting moved to 3pm.');
  });
  it('knows whether a message uses the name', () => {
    assert.equal(usesName('Hi {name}'), true);
    assert.equal(usesName('أهلًا {الاسم}'), true);
    assert.equal(usesName('Hi all'), false);
  });
});

describe('links', () => {
  it('builds a personalised wa.me link with the full number', () => {
    const url = whatsAppLink(person('a', 'Sara Haddad', { phone: '0501234567' }), 'Hi {name}!');
    assert.equal(url, 'https://wa.me/966501234567?text=Hi%20Sara!');
  });
  it('hides every address in one BCC link', () => {
    const url = bccMailto(['a@x.com', 'b@x.com'], 'Update', 'Hello all');
    assert.equal(url, 'mailto:?bcc=a%40x.com,b%40x.com&subject=Update&body=Hello%20all');
  });
  it('splits a long list', () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });
});

describe('recipientsOf', () => {
  it('keeps only chosen people who can be reached, in list order', () => {
    const list = [person('a', 'A'), person('b', 'B', { phone: undefined }), person('c', 'C')];
    assert.deepEqual(recipientsOf('whatsapp', list, new Set(['c', 'b', 'a'])).map((c) => c.id), ['a', 'c']);
  });
  it('stops at the limit', () => {
    const many = Array.from({ length: MAX_RECIPIENTS + 20 }, (_, i) => person(`p${i}`, `P${i}`));
    assert.equal(recipientsOf('email', many, new Set(many.map((c) => c.id))).length, MAX_RECIPIENTS);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fillSaved, toSaved } from './saved';

const saved = { id: 's1', title: 'Chase', body: 'Hi {name}, did you see my message?', subject: 'Quick check, {name}' };

describe('saved messages', () => {
  it('puts the person’s name where {name} is', () => {
    assert.deepEqual(fillSaved(saved, 'Sara Haddad', 'en'), { body: 'Hi Sara, did you see my message?', subject: 'Quick check, Sara' });
  });
  it('greets a title with its surname', () => {
    assert.equal(fillSaved(saved, 'Dr. Sara Haddad', 'en').body, 'Hi Dr. Haddad, did you see my message?');
  });
  it('reads {الاسم} in Arabic', () => {
    assert.equal(fillSaved({ id: 'a', title: 't', body: 'أهلًا {الاسم}،' }, 'سارة حداد', 'ar').body, 'أهلًا سارة،');
  });
  it('turns a written draft back into a template', () => {
    assert.equal(toSaved('Hi Sara, thanks for the call, Sara.', 'Sara Haddad', 'en'), 'Hi {name}, thanks for the call, {name}.');
  });
});

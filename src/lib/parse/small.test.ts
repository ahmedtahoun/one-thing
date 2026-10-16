import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { smallTalk } from './small';

const kind = (text: string) => smallTalk(text)?.kind ?? null;

describe('smallTalk', () => {
  it('greets and thanks in three dialects', () => {
    for (const t of ['hi', 'Hello!', 'good morning', 'مرحبا', 'اهلا', 'السلام عليكم', 'هلا والله'.slice(0, 3), 'صباح الخير']) assert.equal(kind(t), 'hello', t);
    for (const t of ['thanks', 'Thank you!', 'شكرا', 'شكراً', 'تسلم', 'مشكور', 'ميرسي']) assert.equal(kind(t), 'thanks', t);
  });
  it('explains itself', () => {
    for (const t of ['what can you do?', 'help', 'how does this work', 'تقدر تعمل ايه', 'ايش تقدر تسوي', 'ساعدني']) assert.equal(kind(t), 'help', t);
  });
  it('looks up a detail of someone', () => {
    assert.deepEqual(smallTalk("what's Sara's number?"), { kind: 'lookup', what: 'phone' });
    assert.deepEqual(smallTalk('give me Ahmed email'), { kind: 'lookup', what: 'email' });
    assert.deepEqual(smallTalk('رقم سارة كام؟'), { kind: 'lookup', what: 'phone' });
    assert.deepEqual(smallTalk('وش ايميل احمد'), { kind: 'lookup', what: 'email' });
    assert.deepEqual(smallTalk('هات رقم محمد'), { kind: 'lookup', what: 'phone' });
  });
  it('leaves everything else alone', () => {
    for (const t of ['Call Sara tomorrow at 10', 'save his number 0501234567', 'كلم سارة بكرة', 'remind me to get help', 'احفظ رقم احمد 0501234567', 'helpful tips for the meeting']) {
      assert.equal(kind(t), null, t);
    }
  });
});

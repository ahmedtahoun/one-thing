import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bestHeard, extractEmail, extractPhone, latinise, spokenDigits } from './spoken';

describe('spokenDigits', () => {
  it('joins digits said one by one, in English', () => {
    assert.equal(spokenDigits('zero five zero one two three four five six seven'), '0501234567');
    assert.equal(spokenDigits('call oh five oh 123 4567'), 'call 0501234567');
  });
  it('joins grouped digits and Arabic-Indic digits', () => {
    assert.equal(spokenDigits('050 123 4567'), '0501234567');
    assert.equal(spokenDigits('٠١٠٠ ١٢٣ ٤٥٦٧'), '01001234567');
    assert.equal(spokenDigits('+966 50-123-4567'), '+966501234567');
  });
  it('reads Arabic and Egyptian digit words', () => {
    assert.equal(spokenDigits('صفر خمسة صفر واحد اتنين تلاتة اربعة خمسة ستة سبعة'), '0501234567');
    assert.equal(spokenDigits('زيرو واحد زيرو زيرو واحد تنين تلاته اربعه خمسه ستة'), '0100123456');
  });
  it('reads plus, double and triple', () => {
    assert.equal(spokenDigits('plus two zero one zero zero one two three four'), '+201001234');
    assert.equal(spokenDigits('double five six'), '556');
    assert.equal(spokenDigits('triple zero'), '000');
  });
  it('leaves ordinary words alone', () => {
    assert.equal(spokenDigits('one moment please'), 'one moment please');
    assert.equal(spokenDigits('meet at 10 tomorrow'), 'meet at 10 tomorrow');
  });
});

describe('extractPhone', () => {
  it('finds the number and drops it from the text', () => {
    assert.deepEqual(extractPhone('phone is zero five zero 123 4567 thanks'), { phone: '0501234567', rest: 'phone is thanks' });
  });
  it('keeps a + and turns 00 into one', () => {
    assert.equal(extractPhone('number +20 100 123 4567').phone, '+201001234567');
    assert.equal(extractPhone('number 0020 100 123 4567').phone, '+201001234567');
  });
  it('ignores short numbers', () => {
    assert.equal(extractPhone('at 10 or 12').phone, null);
  });
});

describe('extractEmail', () => {
  const email = (text: string) => extractEmail(text)?.email;
  it('takes a written address', () => {
    assert.equal(email('email is Sara.Haddad@Gmail.com ok'), 'sara.haddad@gmail.com');
  });
  it('reads a spoken address in English', () => {
    assert.equal(email('email ahmed dot tahoun at gmail dot com'), 'ahmed.tahoun@gmail.com');
    assert.equal(email('sara underscore ali at yahoo dot com'), 'sara_ali@yahoo.com');
    assert.equal(email('email a h m e d at hotmail dot com'), 'ahmed@hotmail.com');
    assert.equal(email('email sara1990 at outlook dot com'), 'sara1990@outlook.com');
  });
  it('assumes .com for a well-known provider', () => {
    const found = extractEmail('email sara at gmail');
    assert.equal(found?.email, 'sara@gmail.com');
    assert.equal(found?.guessed, true);
  });
  it('reads a spoken address in Arabic, guessing the Latin spelling', () => {
    const found = extractEmail('الايميل احمد دوت طاهون آت جيميل دوت كوم');
    assert.match(found?.email ?? '', /^ahmed\.[a-z]+@gmail\.com$/);
    assert.equal(found?.guessed, true);
  });
  it('reads Arabic providers and endings', () => {
    assert.equal(email('sara ات جي ميل دوت كوم'), 'sara@gmail.com');
    assert.equal(email('sara at yahoo كوم'), 'sara@yahoo.com');
  });
  it('is not fooled by a time', () => {
    assert.equal(email('call him at 5'), undefined);
    assert.equal(email('meet at the office'), undefined);
  });
  it('removes the address from the rest', () => {
    assert.equal(extractEmail('name is Sara email sara at gmail dot com thanks')?.rest, 'name is Sara email thanks');
  });
});

describe('latinise', () => {
  it('knows common names', () => {
    assert.equal(latinise('أحمد'), 'ahmed');
    assert.equal(latinise('محمد'), 'mohamed');
    assert.equal(latinise('سارة'), 'sara');
  });
  it('spells others readably', () => {
    assert.match(latinise('طاهون'), /^[a-z]+$/);
  });
});

describe('bestHeard', () => {
  it('prefers the reading with a name the person has', () => {
    const heard = bestHeard(
      [{ transcript: 'call sarah tomorrow' }, { transcript: 'call Saad tomorrow' }],
      ['Saad']
    );
    assert.equal(heard, 'call Saad tomorrow');
  });
  it('keeps the first reading when no name helps', () => {
    assert.equal(bestHeard([{ transcript: 'first', confidence: 0.4 }, { transcript: 'second', confidence: 0.9 }], ['Zed']), 'first');
  });
});

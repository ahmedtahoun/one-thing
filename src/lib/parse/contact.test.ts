import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { answerKind, applyEdit, isContactCommand, mergeFields, missingOf, readContact } from './contact';

const read = (text: string, region?: string) => readContact(text, { command: true, region });

describe('isContactCommand', () => {
  it('knows English requests to save someone', () => {
    for (const text of [
      'save this number',
      'Save a new contact',
      'add a contact',
      'create new contact name is Sara',
      'save his number 0501234567',
      'add Ahmed to my contacts',
      'store this number for Sara',
      'new contact',
      'save contact: name is Omar, phone zero five zero one two three four five six seven',
      "Sara's number is 0501234567",
      'her email is sara at gmail dot com',
    ]) {
      assert.equal(isContactCommand(text), true, text);
    }
  });
  it('knows Gulf, standard and Egyptian Arabic requests', () => {
    for (const text of [
      'احفظ هذا الرقم',
      'احفظ رقم احمد ٠١٠٠١٢٣٤٥٦٧',
      'ضيف جهة اتصال جديدة',
      'ضيفلي رقم جديد',
      'سجل رقم سارة 0501234567',
      'خزن الرقم ده',
      'سيف الرقم ده',
      'اضف شخص جديد',
      'عايز احفظ كونتاكت',
      'رقمه ٠١٠٠١٢٣٤٥٦٧ والاسم احمد',
    ]) {
      assert.equal(isContactCommand(text), true, text);
    }
  });
  it('leaves tasks alone', () => {
    for (const text of [
      'Call Sara tomorrow at 10',
      'send the quote to sara@x.com',
      'remind me to save the contact list',
      'add a reminder to call Ahmed',
      'email the report to Omar',
      'كلم سارة بكرة',
      'فكرني احفظ رقم احمد',
      'ابعت لاحمد الفاتورة',
      'call 0501234567 at 5',
      'pay the invoice tomorrow',
      'my number is 0501234567',
    ]) {
      assert.equal(isContactCommand(text), false, text);
    }
  });
});

describe('readContact — one breath', () => {
  it('reads the full English sentence', () => {
    assert.deepEqual(
      read('Save this number: name is Sara Haddad, phone zero five zero one two three four five six seven, email sara at gmail dot com'),
      { email: 'sara@gmail.com', phone: '501234567', name: 'Sara Haddad' }
    );
  });
  it('reads a written number and address', () => {
    const c = read('Add a new contact, Omar Khaled, +971 50 331 2045, omar@acme.com');
    assert.equal(c.name, 'Omar Khaled');
    assert.equal(c.dial, '+971');
    assert.equal(c.phone, '503312045');
    assert.equal(c.email, 'omar@acme.com');
  });
  it('reads a company or role', () => {
    const c = read('save contact Layla Nasser works at Northwind, number 0501234567');
    assert.equal(c.name, 'Layla Nasser');
    assert.equal(c.role, 'Northwind');
    const d = read('new contact Khaled company is Al Noor Packaging phone 0501234567');
    assert.equal(d.name, 'Khaled');
    assert.equal(d.role, 'Al Noor Packaging');
  });
  it('reads a name given loosely', () => {
    assert.equal(read('save number for Sara 0501234567').name, 'Sara');
    assert.equal(read("save Sara's number 0501234567").name, 'Sara');
    assert.equal(read('add Ahmed Tahoun to my contacts').name, 'Ahmed Tahoun');
    assert.equal(read('new contact called Nora Ali').name, 'Nora Ali');
    assert.equal(read('save a contact').name, undefined);
    assert.equal(read('save this number').name, undefined);
  });
  it('gives an Egyptian mobile its country code', () => {
    const c = read('save this number name is Ahmed phone zero one zero zero one two three four five six seven');
    assert.equal(c.dial, '+20');
    assert.equal(c.phone, '1001234567');
  });
  it('knows an Egyptian mobile even when the phone is set to another country', () => {
    const c = readContact('save number Ahmed 01001234567', { command: true, region: 'US' });
    assert.equal(c.dial, '+20');
    assert.equal(c.phone, '1001234567');
    assert.equal(readContact('save number Bob 0501234567', { command: true, region: 'AE' }).dial, '+971');
  });
  it('reads Arabic: name, number, email', () => {
    const c = read('احفظ هذا الرقم الاسم احمد طاهون الرقم ٠١٠٠١٢٣٤٥٦٧ الايميل ahmed at gmail dot com');
    assert.equal(c.name, 'احمد طاهون');
    assert.equal(c.dial, '+20');
    assert.equal(c.phone, '1001234567');
    assert.equal(c.email, 'ahmed@gmail.com');
  });
  it('reads Egyptian phrasing', () => {
    const a = read('ضيفلي رقم جديد اسمه محمود رقمه صفر واحد صفر صفر واحد اتنين تلاتة اربعة خمسة ستة سبعة');
    assert.equal(a.name, 'محمود');
    assert.equal(a.dial, '+20');
    assert.equal(a.phone, '1001234567');
    const b = read('احفظ رقم سارة 0501234567');
    assert.equal(b.name, 'سارة');
    assert.equal(b.phone, '501234567');
  });
  it('reads a company in Arabic', () => {
    const c = read('سجل جهة اتصال اسمها نورة الحربي شغالة في شركة النور رقمها 0501234567');
    assert.equal(c.name, 'نورة الحربي');
    assert.equal(c.role, 'شركة النور');
  });
  it('writes a guessed email when it is said in Arabic letters', () => {
    const c = read('احفظ الاسم سارة الايميل سارة دوت حداد ات جيميل دوت كوم');
    assert.equal(c.name, 'سارة');
    assert.match(c.email ?? '', /^sara\.[a-z]+@gmail\.com$/);
    assert.equal(c.guessedEmail, true);
  });
});

describe('readContact — the answers that follow', () => {
  it('takes a bare name when a name was asked for', () => {
    assert.equal(readContact('Sara Haddad', { expect: 'name' }).name, 'Sara Haddad');
    assert.equal(readContact('سارة حداد', { expect: 'name' }).name, 'سارة حداد');
    assert.equal(readContact('اسمها سارة', { expect: 'name' }).name, 'سارة');
  });
  it('takes a number or an email when one was asked for, and not a name', () => {
    assert.deepEqual(readContact('0501234567', { expect: 'detail' }), { phone: '501234567' });
    assert.equal(readContact('sara at gmail dot com', { expect: 'detail' }).email, 'sara@gmail.com');
    assert.equal(readContact('the number is 050 123 4567', { expect: 'detail' }).name, undefined);
  });
  it('takes a correction to an open card', () => {
    assert.equal(readContact('no, the name is Sarah Haddad').name, 'Sarah Haddad');
    assert.equal(readContact('also add email sara@x.com').email, 'sara@x.com');
    assert.equal(readContact('وايميلها sara@x.com').email, 'sara@x.com');
  });
  it('reads nothing from chatter', () => {
    assert.deepEqual(readContact('hmm let me think'), {});
  });
});

describe('mergeFields and missingOf', () => {
  it('layers new answers over the draft', () => {
    const draft = mergeFields({ name: 'Sara' }, { phone: '501234567', dial: '+966' });
    assert.deepEqual(draft, { name: 'Sara', phone: '501234567', dial: '+966' });
    assert.equal(mergeFields(draft, { email: 'a@b.co' }).email, 'a@b.co');
    assert.equal(mergeFields(draft, { phone: '551112222' }).dial, '+966');
  });
  it('asks for a name, then a way to reach them', () => {
    assert.equal(missingOf({}), 'name');
    assert.equal(missingOf({ name: 'Sara' }), 'detail');
    assert.equal(missingOf({ name: 'Sara', email: 'a@b.co' }), null);
    assert.equal(missingOf({ name: 'Sara', phone: '501234567' }), null);
  });
});

describe('answerKind', () => {
  it('reads yes and no in both languages', () => {
    for (const t of ['yes', 'Save it', 'ok', 'تمام', 'ايوه', 'احفظ', 'أيوه']) assert.equal(answerKind(t), 'yes', t);
    for (const t of ['no', 'cancel', 'never mind', 'لا', 'الغاء', 'بلاش']) assert.equal(answerKind(t), 'no', t);
    assert.equal(answerKind('Sara Haddad'), null);
  });
});

describe('applyEdit', () => {
  it('sets a typed name, email and role', () => {
    assert.deepEqual(applyEdit({ name: 'Sara' }, { name: 'Sara H', email: 'a@b.co', role: 'CEO' }), { name: 'Sara H', email: 'a@b.co', role: 'CEO' });
  });
  it('splits a number typed with its code, and trims a local zero', () => {
    assert.deepEqual(applyEdit({}, { phoneText: '+966 50 123 4567' }), { dial: '+966', phone: '501234567' });
    assert.deepEqual(applyEdit({ dial: '+20' }, { phoneText: '0100 123 4567' }), { dial: '+20', phone: '1001234567' });
  });
  it('forgets the "check the spelling" note once the email is typed', () => {
    assert.equal(applyEdit({ email: 'x@y.co', guessedEmail: true }, { email: 'z@y.co' }).guessedEmail, undefined);
  });
});

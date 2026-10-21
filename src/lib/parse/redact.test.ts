/**
 * The promise this module makes is that a sentence leaves the phone without
 * the person in it, so the tests are mostly adversarial: each one is a way a
 * name, a number or an address could survive.
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { fullyRedacted, phrasingKey, redact, tooBare } from './redact';

const BOOK = [{ name: 'Sara Haddad' }, { name: 'Omar Khalid' }, { name: 'سارة حداد' }, { name: 'عمر خالد' }];

const clean = (s: string, book = BOOK) => redact(s, book);

test('an address book name goes, first name or full', () => {
  assert.equal(clean('Call Sara tomorrow at 4'), 'Call {name} tomorrow at 4');
  assert.equal(clean('Send Sara Haddad the contract'), 'Send {name} the contract');
  assert.ok(!clean('كلم سارة بكرة').includes('سارة'));
  assert.ok(!clean('ارسل لسارة حداد العقد').includes('سارة'));
});

test('a longer name is one placeholder, not a placeholder and a leftover', () => {
  assert.ok(!clean('Send Sara Haddad the contract').includes('Haddad'));
});

test('a name nobody has saved still goes', () => {
  assert.ok(!clean('Call Ahmed tomorrow').includes('Ahmed'), clean('Call Ahmed tomorrow'));
  assert.ok(!clean('كلم أحمد بكرة').includes('أحمد'), clean('كلم أحمد بكرة'));
});

test('two names in one sentence both go', () => {
  const out = clean('Call Sara and email Omar');
  assert.ok(!/Sara|Omar/.test(out), out);
});

test('a phone number goes, however it is spaced', () => {
  for (const n of ['+20 100 123 4567', '01001234567', '+966-55-123-4567', '(020) 1001 2345']) {
    const out = clean(`my number is ${n}`);
    assert.ok(out.includes('{phone}'), `${n} → ${out}`);
    assert.ok(!/\d{5,}/.test(out), `${n} → ${out}`);
  }
});

test('Arabic-Indic digits are digits too', () => {
  const out = clean('رقمي ٠١٠٠١٢٣٤٥٦٧');
  assert.ok(!/[٠-٩]{5,}/.test(out), out);
});

test('an email and a link go whole', () => {
  assert.ok(clean('mail her on info@test.com').includes('{email}'));
  assert.ok(!clean('mail her on info@test.com').includes('test.com'));
  assert.ok(clean('see https://example.com/deck?id=9 later').includes('{link}'));
});

test('an email is not left half-eaten by the number rules', () => {
  const out = clean('write to books2024@ledgerco.com');
  assert.equal(out.includes('{email}'), true, out);
  assert.ok(!out.includes('ledgerco'), out);
});

// The whole point of keeping anything at all: the shape has to survive.
test('the clock and the day stay — they are what the parser is judged on', () => {
  assert.equal(clean('Remind me tomorrow at 4 to renew the licence'), 'Remind me tomorrow at 4 to renew the licence');
  assert.equal(clean('ذكرني بكرة الساعة ٤ أجدد الرخصة'), 'ذكرني بكرة الساعة ٤ أجدد الرخصة');
});

test('the question survives its name', () => {
  assert.equal(clean("what's Sara's number?"), "what's {name}'s number?");
  assert.ok(clean('مين لازم ارد على سارة؟').includes('مين لازم ارد على'));
});

test('a sentence with nobody in it comes through untouched', () => {
  assert.equal(clean("what's next?"), "what's next?");
  assert.equal(clean('وش المتأخر؟'), 'وش المتأخر؟');
});

test('an empty address book still redacts patterns and likely names', () => {
  const out = redact('Call Ahmed on +20 100 123 4567', []);
  assert.ok(!out.includes('Ahmed'), out);
  assert.ok(!/\d{5,}/.test(out), out);
});

// fullyRedacted is the caller's licence to send. A missed name must fail it.
test('a leftover capitalised word is not trusted', () => {
  assert.equal(fullyRedacted('Dinner with Mahmoud on Tuesday'), false);
  assert.equal(fullyRedacted('Call {name} tomorrow'), true);
});

test('a sentence opening with an ordinary word is still trusted', () => {
  assert.equal(fullyRedacted('What is next?'), true);
  assert.equal(fullyRedacted('Remind me tomorrow at 4'), true);
  assert.equal(fullyRedacted('Call {name} at {phone}'), true);
});

test('Arabic has no capitals to go by, so it is judged on its placeholders alone', () => {
  assert.equal(fullyRedacted('مين لازم ارد على {name}؟'), true);
});

test('nothing left to learn from is recognised as such', () => {
  assert.equal(tooBare('{name} {phone}'), true);
  assert.equal(tooBare('{name}'), true);
  assert.equal(tooBare('call {name}'), false);
  assert.equal(tooBare('وش المتأخر؟'), false);
});

test('the same question asked twice keys the same', () => {
  assert.equal(phrasingKey("What's next?"), phrasingKey('whats next'));
  assert.equal(phrasingKey('وش التالي؟'), phrasingKey('وش التالي'));
  assert.notEqual(phrasingKey("what's next?"), phrasingKey('what is next?'));
});

test('redaction is idempotent — a placeholder is not re-read as a name', () => {
  const once = clean('Call Sara on +20 100 123 4567');
  assert.equal(redact(once, BOOK), once);
});

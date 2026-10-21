import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { MAX_RAW, phrasingToQueue, VERDICTS, type NotePhrasing } from './phrasings';

const note = (over: Partial<NotePhrasing> = {}): NotePhrasing => ({
  text: "what's next?",
  verdict: 'next',
  source: 'typed',
  lang: 'en',
  dialect: 'gulf',
  contacts: [{ name: 'Sara Haddad' }],
  at: '2026-10-20T09:00:00.000Z',
  ...over,
});

test('an ordinary question is kept, with what Sanad made of it', () => {
  const row = phrasingToQueue(note());
  assert.equal(row?.text, "what's next?");
  assert.equal(row?.verdict, 'next');
  assert.equal(row?.lang, 'en');
});

test('the person is gone before it is queued', () => {
  const row = phrasingToQueue(note({ text: 'Call Sara on +20 100 123 4567' }));
  assert.ok(row);
  assert.ok(!row!.text.includes('Sara'), row!.text);
  assert.ok(!/\d{5,}/.test(row!.text), row!.text);
});

test('a chip is the app quoting itself, and teaches nothing', () => {
  assert.equal(phrasingToQueue(note({ source: 'chip' })), null);
  assert.equal(phrasingToQueue(note({ source: 'intro' })), null);
});

test('a sentence the device is not sure it cleaned is dropped, not sent', () => {
  // Mahmoud is in nobody's address book and the sentence is shaped around
  // nothing in particular, so the redactor cannot see him.
  assert.equal(phrasingToQueue(note({ text: 'Dinner with Mahmoud on Tuesday' })), null);
});

test('a sentence that is all placeholders has no shape left to learn from', () => {
  assert.equal(phrasingToQueue(note({ text: 'Sara Haddad +20 100 123 4567' })), null);
});

test('the dialect travels separately, because Egyptian is not another language', () => {
  const row = phrasingToQueue(note({ text: 'ايه التالي؟', lang: 'ar', dialect: 'egypt', verdict: 'next' }));
  assert.equal(row?.lang, 'ar');
  assert.equal(row?.dialect, 'egypt');
});

test('the ones worth reading are the ones nothing answered', () => {
  const row = phrasingToQueue(note({ text: 'what did I get done yesterday?', verdict: 'unknown' }));
  assert.equal(row?.verdict, 'unknown');
});

test('every verdict is one the admin panel can group by', () => {
  assert.equal(new Set(VERDICTS).size, VERDICTS.length);
  assert.ok(VERDICTS.includes('unknown'));
});

test('spoken is kept apart from typed: they are different habits', () => {
  assert.equal(phrasingToQueue(note({ source: 'spoken' }))?.source, 'spoken');
});

// --- "Help improve Sanad": the words themselves, for whoever offers them ---

test('nothing anybody typed travels until they say so', () => {
  const row = phrasingToQueue(note({ text: 'Call Sara about the price' }));
  assert.equal(row?.raw, undefined, JSON.stringify(row));
  assert.ok(!JSON.stringify(row).includes('Sara'));
});

test('…and travels beside the shape once they do', () => {
  const row = phrasingToQueue(note({ text: 'Call Sara about the price', helpSanad: true }));
  assert.equal(row?.raw, 'Call Sara about the price');
  // The shape is still kept and still redacted: one of them is not a
  // substitute for the other, and they have different lives on the server.
  assert.ok(!row!.text.includes('Sara'), row!.text);
});

test('opting in does not loosen what is sent at all — only what is kept of it', () => {
  // The device could not be sure it cleaned this one, so it is dropped
  // whole. Consent is a licence to keep the words of what is sent, not a
  // licence to send what would have been held back.
  assert.equal(phrasingToQueue(note({ text: 'Dinner with Mahmoud on Tuesday', helpSanad: true })), null);
  assert.equal(phrasingToQueue(note({ text: 'Sara Haddad +20 100 123 4567', helpSanad: true })), null);
});

test('a chip is still the app quoting itself, consent or not', () => {
  assert.equal(phrasingToQueue(note({ source: 'chip', helpSanad: true })), null);
});

test('a monologue is cut to what the column takes', () => {
  const long = `${'call the supplier and then '.repeat(200)}done`;
  const row = phrasingToQueue(note({ text: long, helpSanad: true }));
  assert.ok((row?.raw?.length ?? 0) <= MAX_RAW, String(row?.raw?.length));
});

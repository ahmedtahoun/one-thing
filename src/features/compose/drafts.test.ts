import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ParsedTask } from '@/lib/parse/types';

import { DRAFT_KINDS, draftFor, emailDraft, greetingName, promiseDraft, writeDraft, type DraftKind } from './drafts';

const ALL: DraftKind[] = [...DRAFT_KINDS, 'promise'];

describe('draftFor', () => {
  it('writes every kind in both languages with the name in it and nothing left to fill', () => {
    for (const lang of ['en', 'ar'] as const) {
      for (const kind of ALL) {
        for (const what of [undefined, 'the quote']) {
          const text = draftFor(kind, { name: 'Sara', what, lang });
          assert.ok(text.includes('Sara'), `${lang} ${kind}: ${text}`);
          assert.ok(!/[{}]|undefined|null/.test(text), `${lang} ${kind}: ${text}`);
          assert.ok(text.length > 15 && text.length < 200, `${lang} ${kind}: ${text}`);
        }
      }
    }
  });

  it('mentions what it is about when it is given, and reads fine without', () => {
    assert.equal(draftFor('chase', { name: 'Omar', what: 'The quote', lang: 'en' }), 'Hi Omar, just following up on the quote. Any update?');
    assert.equal(draftFor('chase', { name: 'Omar', lang: 'en' }), 'Hi Omar, just following up. Any update on your side?');
    assert.ok(draftFor('reschedule', { name: 'Omar', what: 'the call', lang: 'en' }).includes('move the call'));
  });

  it('turns "send the contract" into delivering it, as promised', () => {
    assert.equal(draftFor('promise', { name: 'Omar', what: 'Send the contract', lang: 'en' }), 'Hi Omar, here is the contract, as promised.');
    assert.equal(draftFor('promise', { name: 'Omar', what: 'Sending over the deck', lang: 'en' }), 'Hi Omar, here is the deck, as promised.');
    assert.equal(draftFor('promise', { name: 'Omar', what: 'Reply to the offer', lang: 'en' }), 'Hi Omar, following up as promised: reply to the offer.');
    assert.equal(draftFor('promise', { name: 'عمر', what: 'ارسل العقد', lang: 'ar' }), 'هلا عمر، هذا العقد زي ما وعدتك.');
  });

  it('greets by name and never says "undefined" when there is none', () => {
    assert.ok(draftFor('checkin', { name: '', lang: 'en' }).startsWith('Hi there,'));
    assert.ok(!draftFor('checkin', { name: '', lang: 'ar' }).includes('  '));
  });
});

describe('greetingName', () => {
  it('uses the first name', () => {
    assert.equal(greetingName('Omar Hadi', 'en'), 'Omar');
    assert.equal(greetingName('  Sara  ', 'en'), 'Sara');
    assert.equal(greetingName('', 'en'), '');
  });
  it('keeps a title with the family name', () => {
    assert.equal(greetingName('Dr. Khalid Hassan', 'en'), 'Dr. Hassan');
    assert.equal(greetingName('Eng Noura Saleh', 'en'), 'Eng Saleh');
    assert.equal(greetingName('Prof. Layla', 'en'), 'Prof. Layla');
  });
  it('keeps a family-name particle with the name', () => {
    assert.equal(greetingName('Dr. Khalid Al Mansoori', 'en'), 'Dr. Al Mansoori');
    assert.equal(greetingName('Mr Faisal bin Rashid', 'en'), 'Mr bin Rashid');
  });
  it('keeps an Arabic title with the first name', () => {
    assert.equal(greetingName('د. خالد المنصوري', 'ar'), 'د. خالد');
    assert.equal(greetingName('المهندس عمر حسن', 'ar'), 'المهندس عمر');
    assert.equal(greetingName('نورة العلي', 'ar'), 'نورة');
  });
});

describe('emailDraft', () => {
  const kinds: (DraftKind | 'blank')[] = [...DRAFT_KINDS, 'promise', 'blank'];

  it('is a proper business email: greeting, short paragraphs, closing, sender', () => {
    const { subject, body } = emailDraft('chase', { name: 'Omar Hadi', what: 'The quote', sender: 'Ahmed Tahoun', lang: 'en' });
    assert.equal(subject, 'Following up: the quote');
    const paragraphs = body.split('\n\n');
    assert.equal(paragraphs[0], 'Dear Omar,');
    assert.equal(paragraphs[1], 'I hope you are well.');
    assert.ok(paragraphs[2]?.includes('following up on the quote'));
    assert.equal(paragraphs.at(-1), 'Kind regards,\nAhmed Tahoun');
  });

  it('greets a titled person formally', () => {
    assert.ok(emailDraft('checkin', { name: 'Dr. Khalid Al Mansoori', lang: 'en' }).body.startsWith('Dear Dr. Al Mansoori,'));
  });

  it('signs off with just the closing when the sender is unknown, and greets plainly with no name', () => {
    const { body } = emailDraft('thanks', { name: '', lang: 'en' });
    assert.ok(body.startsWith('Hello,'));
    assert.ok(body.endsWith('Kind regards,'));
  });

  it('writes every kind in both languages, with a subject, no placeholders and no gendered address', () => {
    for (const lang of ['en', 'ar'] as const) {
      for (const kind of kinds) {
        for (const what of [undefined, 'Send the contract']) {
          const { subject, body } = emailDraft(kind, { name: 'Omar', what, sender: 'Ahmed', lang });
          assert.ok(!/[{}]|undefined|null/.test(body + (subject ?? '')), `${lang} ${kind}: ${body}`);
          assert.ok(body.includes('Omar'), `${lang} ${kind}`);
          assert.ok(body.includes('Ahmed'), `${lang} ${kind}`);
          if (kind !== 'blank' && !(kind === 'promise' && !what)) assert.ok(subject && subject.length > 2, `${lang} ${kind} has a subject`);
          if (lang === 'ar') assert.ok(!/الأخ|الأخت|السيد/.test(body), `${lang} ${kind}: neutral`);
        }
      }
    }
  });

  it('leaves the middle for the person when blank', () => {
    const { subject, body } = emailDraft('blank', { name: 'Omar', sender: 'Ahmed', lang: 'en' });
    assert.equal(subject, '');
    assert.equal(body, 'Dear Omar,\n\nI hope you are well.\n\n\n\nKind regards,\nAhmed');
  });

  it('turns a promised send into the delivery, with that as the subject', () => {
    const { subject, body } = emailDraft('promise', { name: 'Omar', what: 'Send the contract', sender: 'Ahmed', lang: 'en' });
    assert.equal(subject, 'The contract');
    assert.ok(body.includes('As promised, I am sending you the contract.'));
  });
});

describe('writeDraft', () => {
  it('keeps chat short and email formal', () => {
    assert.equal(writeDraft('whatsapp', 'checkin', { name: 'Omar Hadi', lang: 'en' }).body, 'Hi Omar, it has been a while. How are things? Free for a quick catch-up soon?');
    assert.ok(writeDraft('email', 'checkin', { name: 'Omar Hadi', lang: 'en' }).body.startsWith('Dear Omar,'));
    assert.equal(writeDraft('whatsapp', 'blank', { name: 'Omar', lang: 'en' }).body, '');
  });
});

describe('promiseDraft', () => {
  const p = (over: Partial<ParsedTask>): ParsedTask => ({
    type: 'whatsapp',
    title: 'Send the contract',
    who: 'Omar Hadi',
    contactId: 'o',
    when: '2026-10-15T14:00:00.000Z',
    kind: 'promise',
    ...over,
  });
  it('writes a chat line for a promised message and an email for a promised email', () => {
    assert.equal(promiseDraft(p({}), 'en')?.body, 'Hi Omar, here is the contract, as promised.');
    const email = promiseDraft(p({ type: 'email' }), 'en', 'Ahmed');
    assert.equal(email?.subject, 'The contract');
    assert.ok(email?.body.startsWith('Dear Omar,'));
    assert.ok(email?.body.endsWith('Kind regards,\nAhmed'));
  });
  it('writes nothing for a call, a plain task, or nobody', () => {
    assert.equal(promiseDraft(p({ type: 'call' }), 'en'), undefined);
    assert.equal(promiseDraft(p({ kind: undefined }), 'en'), undefined);
    assert.equal(promiseDraft(p({ who: null, contactId: null }), 'en'), undefined);
  });
});

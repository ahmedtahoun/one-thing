/**
 * The on-device parser, against the handoff's own sample sentences —
 * Quick capture's `cap_sample`, Brain dump's `d_sample` and the Assistant's
 * chips, in both languages. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { intentOf, localParser, splitDump, timeOf, titleOf, typeOf, westernDigits, whoOf } from './local';
import { C } from '@/content/strings';
import type { Contact } from '@/lib/model-types';

const NOW = new Date('2026-10-10T09:20:00');

const contact = (id: string, name: string): Contact => ({ id, name, createdAt: NOW.toISOString() });
const PEOPLE_EN = [contact('c1', 'Mohammed Al-Saadi'), contact('c2', 'Sara Haddad'), contact('c4', 'Noura Al-Harbi')];
const PEOPLE_AR = [contact('c1', 'محمد السعدي'), contact('c2', 'سارة حداد'), contact('c4', 'نورة الحربي')];
const ctx = (lang: 'en' | 'ar') => ({ lang, now: NOW, contacts: lang === 'en' ? PEOPLE_EN : PEOPLE_AR });

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

describe('Quick capture sample', () => {
  it('reads the English sample as WhatsApp to Mohammed, tomorrow at 10', async () => {
    const p = await localParser.parse(C.en.cap_sample, ctx('en'));
    assert.equal(p.type, 'whatsapp');
    assert.equal(p.who, 'Mohammed Al-Saadi');
    assert.equal(p.contactId, 'c1');
    assert.equal(hhmm(p.when), '11 10:00');
    assert.equal(p.title, 'Send Mohammed the price quote and follow up');
  });

  it('reads the Arabic sample the same way', async () => {
    const p = await localParser.parse(C.ar.cap_sample, ctx('ar'));
    assert.equal(p.type, 'whatsapp');
    assert.equal(p.contactId, 'c1');
    assert.equal(hhmm(p.when), '11 10:00');
    assert.ok(!p.title.includes('بكرة') && !p.title.includes('ذكّرني'), p.title);
  });
});

describe('Brain dump sample', () => {
  it('splits the English sample into its six things', async () => {
    const items = await localParser.split(C.en.d_sample, ctx('en'));
    assert.deepEqual(
      items.map((i) => [i.type, i.title]),
      [
        ['call', 'Call the lawyer about the contract'],
        ['email', 'Email Sara the deck'],
        ['reminder', 'Buy printer ink'],
        ['whatsapp', 'Reply to Noura about the logo'],
        ['reminder', 'Book the dentist'],
        ['reminder', 'Pay the supplier invoice'],
      ]
    );
    assert.equal(hhmm(items[0]!.when), '11 11:00');
    assert.equal(items[1]!.contactId, 'c2');
    assert.equal(items[3]!.contactId, 'c4');
    assert.equal(hhmm(items[5]!.when), '10 17:00', '"by 5" is the afternoon');
  });

  it('splits the Arabic sample into six, and reads its call and email', async () => {
    const items = await localParser.split(C.ar.d_sample, ctx('ar'));
    assert.equal(items.length, 6);
    assert.equal(items[0]!.type, 'call');
    assert.equal(hhmm(items[0]!.when), '11 11:00');
    assert.equal(items[1]!.type, 'email');
    assert.equal(items[1]!.contactId, 'c2', '"لسارة" is Sara');
    assert.equal(items[3]!.contactId, 'c4');
  });
});

describe('Assistant chips', () => {
  it('turns the first chip into a task', () => assert.equal(intentOf(C.en.chips[0]!), 'task'));
  it('reads "Arrange my day" as the plan', () => assert.equal(intentOf(C.en.chips[1]!), 'plan'));
  it('reads "Who am I waiting on?" as follow-ups', () => assert.equal(intentOf(C.en.chips[2]!), 'followups'));
  it('does the same in Arabic', () => {
    assert.deepEqual(C.ar.chips.map(intentOf), ['task', 'plan', 'followups']);
  });
  it('does not mistake "follow up" inside a task for the follow-ups question', () => {
    assert.equal(intentOf(C.en.cap_sample), 'task');
  });
  it('can only answer with a task, the plan or follow-ups', async () => {
    const reply = await localParser.interpret('What is the capital of France?', ctx('en'));
    assert.equal(reply.kind, 'task');
  });
});

describe('the pieces', () => {
  it('reads times', () => {
    assert.deepEqual(timeOf('at 10:30'), [10, 30]);
    assert.deepEqual(timeOf('3pm'), [15, 0]);
    assert.deepEqual(timeOf('at 4'), [16, 0]);
    assert.deepEqual(timeOf('at 9'), [9, 0]);
    assert.deepEqual(timeOf('الساعة ١١'), [11, 0]);
    assert.equal(timeOf('buy ink'), null);
    assert.equal(timeOf('offer 5% off'), null);
  });
  it('reads Arabic-Indic digits', () => assert.equal(westernDigits('١٠:٣٠'), '10:30'));
  it('falls back to a reminder', () => assert.equal(typeOf('book the dentist'), 'reminder'));
  it('drops "remind me to", the day and the time from the title', () => {
    assert.equal(titleOf('Remind me tomorrow at 3pm to call Hamad'), 'Call Hamad');
  });
  it('keeps a title that is nothing but a time', () => assert.equal(titleOf('at 10'), 'At 10'));
  it('matches nobody rather than guessing', () => {
    assert.deepEqual(whoOf('call the lawyer', PEOPLE_EN), { who: null, contactId: null });
  });
  it('splits on "then"', () => assert.deepEqual(splitDump('call Sara then email Noura'), ['call Sara', 'email Noura']));
});

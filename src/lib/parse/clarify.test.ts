/**
 * What the Assistant asks before it proposes a task, and how it reads the
 * answer — against the real on-device parser, so the whole path from a
 * sentence to a question is covered. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { answerFromText, clarify, readWho, suggestWho, unknownName, whenOptions, withWhen, withWho, type Gap, type World } from './clarify';
import { localParser } from './local';
import type { Contact, FollowUp, Task } from '@/lib/model-types';

const NOW = new Date('2026-10-10T09:20:00');
const DAY = 24 * 60 * 60 * 1000;

const contact = (id: string, name: string, extra: Partial<Contact> = {}): Contact => ({
  id,
  name,
  phone: '5551234',
  email: `${id}@example.com`,
  createdAt: NOW.toISOString(),
  ...extra,
});

const MOHAMMED = contact('c1', 'Mohammed Al-Saadi');
const SARA = contact('c2', 'Sara Haddad');
const NOURA = contact('c3', 'Noura Al-Harbi');
const DAINA_A = contact('c4', 'Daina Partner', { role: 'Partner' });
const DAINA_B = contact('c5', 'Daina Khoury', { role: 'Dentist' });

const world = (over: Partial<World> = {}): World => ({
  contacts: [MOHAMMED, SARA, NOURA, DAINA_A, DAINA_B],
  tasks: [],
  followUps: [],
  now: NOW,
  ...over,
});

const ask = async (text: string, w: World = world(), settled = {}) => {
  const draft = await localParser.parse(text, { lang: 'en', now: w.now, contacts: w.contacts });
  return { draft, gap: clarify(text, draft, w, settled) };
};

describe('who', () => {
  it('asks which one when two contacts share the name written', async () => {
    const { gap } = await ask('Call Daina tomorrow at 10');
    assert.equal(gap?.kind, 'who-ambiguous');
    if (gap?.kind === 'who-ambiguous') {
      assert.equal(gap.name, 'Daina');
      assert.deepEqual(gap.options.map((c) => c.id), ['c4', 'c5']);
    }
  });

  it('does not ask when the full name settles it', () => {
    const read = readWho('call Daina Khoury', world().contacts);
    assert.equal(read?.kind, 'one');
    if (read?.kind === 'one') assert.equal(read.contact.id, 'c5');
  });

  it('accepts a contact it can match without asking', async () => {
    const { gap } = await ask('Message Sara tomorrow at 10');
    assert.equal(gap, null);
  });

  it('asks about a name People has never heard of', async () => {
    const { gap } = await ask('Text Layla tomorrow at 10');
    assert.deepEqual(gap, { kind: 'who-unknown', name: 'Layla' });
  });

  it('finds an unknown name written in lowercase after a calling word', () => {
    assert.equal(unknownName('call layla', world().contacts), 'Layla');
  });

  it('does not mistake a thing for a person', () => {
    for (const text of ['email the quote', 'send invoice', 'call back later', 'message about the deck', 'remind me to pay rent']) {
      assert.equal(unknownName(text, world().contacts), null, text);
    }
  });

  it('asks who when a call has nobody, and suggests people', async () => {
    const { gap } = await ask('Call tomorrow at 10');
    assert.equal(gap?.kind, 'who-missing');
    if (gap?.kind === 'who-missing') assert.ok(gap.suggestions.length > 0 && gap.suggestions.length <= 5);
  });

  it('does not ask who for a plain reminder', async () => {
    const { gap } = await ask('Remind me to pay the invoice tomorrow at 10');
    assert.equal(gap, null);
  });

  it('never asks again once the person has waved it away', async () => {
    const { gap } = await ask('Call tomorrow at 10', world(), { who: true });
    assert.equal(gap, null);
  });
});

describe('suggestWho', () => {
  it('puts someone who owes a reply first', () => {
    const owed: FollowUp = {
      id: 'f1',
      contactId: 'c3',
      channel: 'whatsapp',
      who: 'Noura Al-Harbi',
      what: 'Quote',
      status: 'due',
      since: '',
    };
    const [first] = suggestWho('call', world({ followUps: [owed] }));
    assert.equal(first?.id, 'c3');
  });

  it('favours people dealt with often lately', () => {
    const recent = new Date(NOW.getTime() - 2 * DAY).toISOString();
    const tasks = [1, 2, 3].map((n) => ({ id: `t${n}`, contactIds: ['c2'], status: 'open', createdAt: recent }) as unknown as Task);
    const ids = suggestWho('call', world({ tasks })).map((c) => c.id);
    assert.ok(ids.indexOf('c2') < ids.indexOf('c3'));
  });

  it('leaves people with no number to the end for a call, and no email for an email', () => {
    const noPhone = contact('c9', 'Walid', { phone: undefined });
    const noEmail = contact('c8', 'Yara', { email: undefined });
    const people = [noPhone, noEmail, MOHAMMED];
    assert.equal(suggestWho('call', world({ contacts: people }))[0]?.id, 'c8');
    assert.equal(suggestWho('email', world({ contacts: people }))[0]?.id, 'c9');
  });

  it('returns at most five', () => {
    const many = Array.from({ length: 12 }, (_, i) => contact(`x${i}`, `Person${i}`));
    assert.equal(suggestWho('call', world({ contacts: many })).length, 5);
  });
});

describe('when', () => {
  it('asks when nothing says when', async () => {
    const { gap } = await ask('Message Sara');
    assert.deepEqual(gap, { kind: 'when', why: 'missing' });
  });

  it('is satisfied by a day or by a time', async () => {
    assert.equal((await ask('Message Sara tomorrow')).gap, null);
    assert.equal((await ask('Message Sara at 4pm')).gap, null);
    assert.equal((await ask('Message Sara tonight')).gap, null);
  });

  it('reads "tonight" as the evening', async () => {
    const { draft } = await ask('Message Sara tonight');
    assert.equal(new Date(draft.when).getHours(), 20);
  });

  it('says so when the time written has already gone today', async () => {
    const late = { ...world(), now: new Date('2026-10-10T11:00:00') };
    const { gap } = await ask('Message Sara at 9:00', late);
    assert.deepEqual(gap, { kind: 'when', why: 'past' });
  });

  it('does not ask once it has been waved away', async () => {
    assert.equal((await ask('Message Sara', world(), { when: true })).gap, null);
  });

  it('asks who before when', async () => {
    const { gap } = await ask('Call');
    assert.equal(gap?.kind, 'who-missing');
  });
});

describe('answers', () => {
  it('builds the next proposal from a chosen person and time', async () => {
    const { draft } = await ask('Call Daina');
    const picked = withWho(draft, DAINA_B);
    assert.equal(picked.who, 'Daina Khoury');
    assert.equal(picked.contactId, 'c5');
    assert.equal(withWho(picked, null).contactId, null);
    assert.equal(withWhen(picked, '2026-10-11T09:00:00.000Z').when, '2026-10-11T09:00:00.000Z');
  });

  it('reads a typed name against the options when there were some', () => {
    const gap: Gap = { kind: 'who-ambiguous', name: 'Daina', options: [DAINA_A, DAINA_B] };
    const one = answerFromText(gap, 'khoury', world());
    assert.equal(one.kind, 'who');
    if (one.kind === 'who') assert.equal(one.contact.id, 'c5');
    assert.equal(answerFromText(gap, 'banana', world()).kind, 'unreadable');
  });

  it('reads a typed name for who-missing, and offers to add a stranger', () => {
    const gap: Gap = { kind: 'who-missing', suggestions: [] };
    assert.equal(answerFromText(gap, 'noura', world()).kind, 'who');
    const stranger = answerFromText(gap, 'layla ahmed', world());
    assert.deepEqual(stranger, { kind: 'who-new', name: 'Layla Ahmed' });
    assert.equal(answerFromText(gap, '12345', world()).kind, 'unreadable');
  });

  it('reads a typed time, and refuses one that has gone', () => {
    const gap: Gap = { kind: 'when', why: 'missing' };
    const ok = answerFromText(gap, 'tomorrow at 10', world());
    assert.equal(ok.kind, 'when');
    // "Whenever" used to read as unreadable. It is not: it is the question
    // being turned down, and the screen now says what it needs instead of
    // claiming it could not read the word (§2.91).
    assert.equal(answerFromText(gap, 'whenever', world()).kind, 'refused');
    assert.equal(answerFromText(gap, 'today at 8', world()).kind, 'unreadable', 'a time that has gone is still not an answer');
  });

  it('offers only quick times still ahead', () => {
    const quick = [
      ['Earlier', 0, '08:00'],
      ['In a bit', 0, '10:30'],
      ['Tomorrow 9am', 1, '09:00'],
    ] as const;
    assert.deepEqual(whenOptions(quick, NOW).map((o) => o.label), ['In a bit', 'Tomorrow 9am']);
  });
});

describe('Arabic written with and without its marks', () => {
  /**
   * حالاً and حالًا differ only in which side of the alif the tanween sits,
   * and a keyboard gives you whichever it gives you. Found by reading
   * ASSISTANT-PHRASES.md back against the parser (BUILD-REVIEW §2.98).
   */
  const when: Gap = { kind: 'when', why: 'missing' };

  for (const word of ['الحين', 'حالا', 'حالاً', 'حالًا', 'الان', 'الآن']) {
    it(`reads "${word}" as now`, () => {
      assert.equal(answerFromText(when, word, world()).kind, 'when');
    });
  }

  for (const word of ['لا', 'مو الحين', 'بعدين', 'لاحقا', 'لاحقاً', 'لاحقًا', 'ما ابغى', 'ما أبغى']) {
    it(`reads "${word}" as turning the question down`, () => {
      assert.equal(answerFromText(when, word, world()).kind, 'refused');
    });
  }
});

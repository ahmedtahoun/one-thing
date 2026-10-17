/**
 * Real sentences, in English, Gulf / standard Arabic and Egyptian Arabic,
 * through the on-device parser and the question logic: what each becomes, and
 * what the Assistant would ask. Run with `npm test`.
 *
 * "Now" is Saturday 10 October 2026, 09:20, so Monday is the 12th.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { answerFromText, clarify, type Gap, type World } from './clarify';
import { dayOf, localParser, timeOf } from './local';
import { matchContact } from '@/features/people/search';
import { askFor } from './sentences.helper';
import type { Contact, FollowUp } from '@/lib/model-types';

const NOW = new Date('2026-10-10T09:20:00');
const person = (id: string, name: string): Contact => ({ id, name, phone: '5551234', email: `${id}@x.com`, createdAt: NOW.toISOString() });
const worldOf = (contacts: Contact[], over: Partial<World> = {}): World => ({ contacts, tasks: [], followUps: [], now: NOW, ...over });

const EN = worldOf([person('c1', 'Mohammed Al-Saadi'), person('c2', 'Sara Haddad'), person('c3', 'Noura Al-Harbi')]);
const AR = worldOf([person('c1', 'محمد السعدي'), person('c2', 'سارة حداد'), person('c3', 'نورة الحربي')]);

type Case = { text: string; type: string; who?: string | null; when?: string; ask: Gap['kind'] | null; title?: string };

/** "D HH:MM" in local time. */
const at = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

async function check(world: World, cases: Case[]) {
  for (const c of cases) {
    const { draft, gap } = await askFor(c.text, world);
    const label = `“${c.text}”`;
    assert.equal(draft.type, c.type, `${label} type`);
    if (c.who !== undefined) assert.equal(draft.contactId, c.who, `${label} who`);
    if (c.when) assert.equal(at(draft.when), c.when, `${label} when`);
    if (c.title) assert.equal(draft.title, c.title, `${label} title`);
    assert.equal(gap?.kind ?? null, c.ask, `${label} asks`);
  }
}

describe('English', () => {
  it('reads the common ways of saying it', () =>
    check(EN, [
      { text: 'Call Sara tomorrow at 10', type: 'call', who: 'c2', when: '11 10:00', ask: null },
      { text: 'Remind me to send the deck to Noura at 3pm', type: 'whatsapp', who: 'c3', when: '10 15:00', ask: null },
      { text: 'Text Mohammed tonight', type: 'whatsapp', who: 'c1', when: '10 20:00', ask: null },
      { text: 'Tonight at 9 call Mohammed', type: 'call', who: 'c1', when: '10 21:00', ask: null },
      { text: 'Email Sara the quote tomorrow morning', type: 'email', who: 'c2', when: '11 09:00', ask: null },
      { text: 'Call Mohammed on Monday at 11', type: 'call', who: 'c1', when: '12 11:00', ask: null },
      { text: 'Message Sara this evening', type: 'whatsapp', who: 'c2', when: '10 18:00', ask: null },
      { text: 'Call Noura the day after tomorrow at 4', type: 'call', who: 'c3', when: '12 16:00', ask: null },
      { text: 'call sara tomorrow at 9:30', type: 'call', who: 'c2', when: '11 09:30', ask: null },
    ]));

  it('asks when it has to', () =>
    check(EN, [
      { text: 'Remind me to renew the passport', type: 'reminder', who: null, ask: 'when' },
      { text: 'Call', type: 'call', who: null, ask: 'who-missing' },
      { text: 'Email Layla the proposal', type: 'email', ask: 'who-unknown' },
      { text: 'Message Sarah tomorrow at 10', type: 'whatsapp', ask: 'who-ambiguous' },
      { text: 'Call Sara', type: 'call', who: 'c2', ask: 'when' },
    ]));

  it('does not mistake things for people', () =>
    check(EN, [
      { text: 'Email the quote tomorrow at 10', type: 'email', ask: 'who-missing' },
      { text: 'Send invoice tomorrow at 10', type: 'whatsapp', ask: 'who-missing' },
      { text: 'Call back later tomorrow at 10', type: 'call', ask: 'who-missing' },
    ]));

  it('cleans the title of the day and the time', () =>
    check(EN, [
      { text: 'Remind me tomorrow at 10 to send Mohammed the quote', type: 'whatsapp', title: 'Send Mohammed the quote', ask: null },
      { text: 'Call Sara on Monday morning', type: 'call', title: 'Call Sara', when: '12 09:00', ask: null },
    ]));
});

describe('Arabic — Gulf and standard', () => {
  it('reads the common ways of saying it', () =>
    check(AR, [
      { text: 'اتصل بسارة بكرة الساعة ١٠', type: 'call', who: 'c2', when: '11 10:00', ask: null },
      { text: 'ارسل لمحمد عرض السعر بكرة', type: 'whatsapp', who: 'c1', when: '11 17:00', ask: null },
      { text: 'ذكرني بكرة الصبح اتصل بنورة', type: 'call', who: 'c3', when: '11 09:00', title: 'اتصل بنورة', ask: null },
      { text: 'كلم محمد الليلة', type: 'call', who: 'c1', when: '10 20:00', ask: null },
      { text: 'ارسل ايميل لسارة بكرة الساعة ٩ صباحا', type: 'email', who: 'c2', when: '11 09:00', ask: null },
    ]));

  it('asks when it has to', () =>
    check(AR, [
      { text: 'ذكرني أدفع الفاتورة', type: 'reminder', who: null, ask: 'when' },
      { text: 'كلم', type: 'call', who: null, ask: 'who-missing' },
      { text: 'كلم ليلى بكرة الساعة ١٠', type: 'call', ask: 'who-unknown' },
    ]));
});

describe('Arabic — Egyptian', () => {
  it('reads today, the day after, weekdays and parts of the day', () =>
    check(AR, [
      { text: 'كلم سارة النهارده الساعة ستة', type: 'call', who: 'c2', when: '10 18:00', ask: null },
      { text: 'كلم سارة بكره الساعة عشرة الصبح', type: 'call', who: 'c2', when: '11 10:00', ask: null },
      { text: 'كلم نورة بكره الساعة اتنين الضهر', type: 'call', who: 'c3', when: '11 14:00', ask: null },
      { text: 'ابعت لمحمد واتس بكره الساعة ٣ العصر', type: 'whatsapp', who: 'c1', when: '11 15:00', ask: null },
      { text: 'فكرني بكره الصبح ادفع الايجار', type: 'reminder', when: '11 09:00', title: 'ادفع الايجار', ask: null },
      { text: 'رن على نورة بعد بكره الساعة ١٠ الصبح', type: 'call', who: 'c3', when: '12 10:00', ask: null },
      { text: 'اتصل بسارة الاتنين الساعة تلاتة ونص', type: 'call', who: 'c2', when: '12 15:30', ask: null },
      { text: 'ابعت ايميل لمحمد النهارده بالليل', type: 'email', who: 'c1', when: '10 20:00', ask: null },
      { text: 'هكلم نورة الخميس الضهر', type: 'call', who: 'c3', when: '15 12:00', ask: null },
      { text: 'كلم سارة الساعة خمسة الا ربع', type: 'call', who: 'c2', when: '10 16:45', ask: null },
      { text: 'كلم سارة بكره الساعة ٦ ونص المغرب', type: 'call', who: 'c2', when: '11 18:30', ask: null },
    ]));

  it('is not thrown by the spelling people use', () =>
    check(AR, [
      { text: 'كلم ساره بكره', type: 'call', who: 'c2', when: '11 17:00', ask: null },
      { text: 'اتصل بنوره بكرا الساعة ٤', type: 'call', who: 'c3', ask: null },
      { text: 'كلم محمّد بكرة الساعة ١١', type: 'call', who: 'c1', when: '11 11:00', ask: null },
    ]));

  it('asks when it has to', () =>
    check(AR, [
      { text: 'ابعت الملف بكره', type: 'whatsapp', ask: 'who-missing' },
      { text: 'كلم المدير بكره الساعة ١٠', type: 'call', ask: 'who-missing' },
      { text: 'اكتب كلمة المرور', type: 'reminder', ask: 'when' },
      { text: 'اعمل برنامج التمرين', type: 'reminder', ask: 'when' },
    ]));
});

describe('the same name more than once', () => {
  const SARAS = Array.from({ length: 12 }, (_, i) => person(`s${i}`, `Sara Family${i}`));
  const MANY = worldOf([...SARAS, person('m', 'Mohammed Ali')]);

  it('asks which Sara even when there are twelve, and keeps all twelve', async () => {
    const { gap } = await askFor('Call Sara tomorrow at 10', MANY);
    assert.equal(gap?.kind, 'who-ambiguous');
    if (gap?.kind === 'who-ambiguous') {
      assert.equal(gap.options.length, 12);
      assert.equal(gap.name, 'Sara');
    }
  });

  it('puts the one who owes a reply first, then the ones used lately', async () => {
    const owed: FollowUp = { id: 'f', contactId: 's9', channel: 'whatsapp', who: 'Sara Family9', what: 'x', status: 'due', since: '' };
    const recent = new Date(NOW.getTime() - 86_400_000).toISOString();
    const tasks = [1, 2].map((n) => ({ id: `t${n}`, contactIds: ['s4'], status: 'open', createdAt: recent }) as never);
    const { gap } = await askFor('Call Sara tomorrow at 10', worldOf([...SARAS], { followUps: [owed], tasks }));
    assert.equal(gap?.kind, 'who-ambiguous');
    if (gap?.kind === 'who-ambiguous') {
      assert.deepEqual(gap.options.slice(0, 2).map((c) => c.id), ['s9', 's4']);
    }
  });

  it('narrows by typing across all twelve, not just the five shown', async () => {
    const { gap } = await askFor('Call Sara tomorrow at 10', MANY);
    assert.ok(gap);
    const one = answerFromText(gap!, 'family11', MANY);
    assert.equal(one.kind, 'who');
    if (one.kind === 'who') assert.equal(one.contact.id, 's11');
    const several = answerFromText(gap!, 'family1', MANY); // Family1, Family10, Family11
    assert.equal(several.kind, 'who-several');
    if (several.kind === 'who-several') assert.equal(several.options.length, 3);
  });

  it('does not ask once there is only one', async () => {
    const { gap } = await askFor('Call Mohammed tomorrow at 10', MANY);
    assert.equal(gap, null);
  });
});

describe('names across scripts and spellings', () => {
  const MIXED = worldOf([
    person('a', 'Sara Haddad'),
    person('b', 'سارة العتيبي'),
    person('c', 'محمد علي'),
    person('d', 'أحمد حسن'),
    person('e', 'ليلى خالد'),
  ]);

  it('treats Sara and سارة as the same first name, and asks which', async () => {
    for (const text of ['Call Sara tomorrow at 10', 'اتصل بسارة بكرة الساعة ١٠']) {
      const { gap } = await askFor(text, MIXED);
      assert.equal(gap?.kind, 'who-ambiguous', text);
      if (gap?.kind === 'who-ambiguous') assert.deepEqual(gap.options.map((c) => c.id).sort(), ['a', 'b'], text);
    }
  });

  it('confirms a loose match rather than guessing', async () => {
    for (const [text, id] of [
      ['Call Mohamed tomorrow at 10', 'c'],
      ['Call Ahmed tomorrow at 10', 'd'],
      ['Message Layla tomorrow at 10', 'e'],
    ] as const) {
      const { gap } = await askFor(text, MIXED);
      assert.equal(gap?.kind, 'who-ambiguous', text);
      if (gap?.kind === 'who-ambiguous') {
        assert.equal(gap.fuzzy, true, text);
        assert.deepEqual(gap.options.map((o) => o.id), [id], text);
      }
    }
  });

  it('does not offer Ahmed for Mohamed', async () => {
    const { gap } = await askFor('Call Mohamed tomorrow at 10', MIXED);
    if (gap?.kind === 'who-ambiguous') assert.ok(!gap.options.some((o) => o.id === 'd'));
  });

  it('confirms a Latin contact asked for in Arabic', async () => {
    const world = worldOf([person('x', 'Noura Haddad')]);
    const { gap } = await askFor('كلم نورة بكره الساعة ١٠', world);
    assert.equal(gap?.kind, 'who-ambiguous');
    if (gap?.kind === 'who-ambiguous') assert.deepEqual(gap.options.map((o) => o.id), ['x']);
  });
});

describe('clarify keeps working on its own drafts', () => {
  it('stops asking about who once it has been settled', async () => {
    const { draft } = await askFor('Call Sara tomorrow at 10', worldOf([person('a', 'Sara A'), person('b', 'Sara B')]));
    const world = worldOf([person('a', 'Sara A'), person('b', 'Sara B')]);
    assert.equal(clarify('Call Sara tomorrow at 10', draft, world, { who: true }), null);
    assert.ok(await localParser.parse('x', { lang: 'en', now: NOW, contacts: [] }));
  });
});

describe('time and day words', () => {
  it('reads hours said as words, with halves, quarters and parts of the day', () => {
    const table: [string, [number, number]][] = [
      ['الساعة تلاتة', [15, 0]],
      ['الساعة تلاتة ونص', [15, 30]],
      ['الساعة خمسة الا ربع', [16, 45]],
      ['الساعة واحدة', [13, 0]],
      ['الساعة اتناشر', [12, 0]],
      ['الساعة عشرة الصبح', [10, 0]],
      ['خمسة الصبح', [5, 0]],
      ['خمسة العصر', [17, 0]],
      ['الساعة ١٠ بالليل', [22, 0]],
      ['الساعه ٧', [7, 0]],
      ['الساعة 4 وربع العصر', [16, 15]],
      ['الساعة ثمانية مساء', [20, 0]],
    ];
    for (const [text, want] of table) assert.deepEqual(timeOf(text), want, text);
  });

  it('reads weekdays as the next one, never today', () => {
    const day = (text: string) => dayOf(text, NOW).date.getDate();
    assert.equal(day('on Monday'), 12);
    assert.equal(day('next Friday'), 16);
    assert.equal(day('Saturday'), 17); // today is Saturday
    assert.equal(day('الاتنين'), 12);
    assert.equal(day('الحد'), 11);
    assert.equal(day('يوم الجمعة'), 16);
    assert.equal(day('بعد بكره'), 12);
    assert.equal(day('النهارده'), 10);
    assert.equal(dayOf('hello', NOW).said, false);
  });

  it('does not read a word that merely contains a weekday or a day', () => {
    assert.equal(dayOf('الاحداث', NOW).said, false);
    assert.equal(dayOf('الحدود', NOW).said, false);
  });
});

describe('the People search', () => {
  const sara = { id: 's', name: 'Sara Family1', phone: '5551234', createdAt: NOW.toISOString() } as Contact;
  it('matches numbers only when the query is a number', () => {
    assert.equal(matchContact(sara, '555'), true);
    assert.equal(matchContact(sara, '+966 555'), false);
    assert.equal(matchContact(sara, 'family1'), true);
    assert.equal(matchContact({ ...sara, name: 'Noura' }, 'family1'), false);
  });
});

describe('answering the when-question the way people do', () => {
  const WHEN: Gap = { kind: 'when', why: 'missing' };
  const NOW = new Date('2026-10-17T08:00:00.000Z');
  const world = { contacts: [], tasks: [], followUps: [], now: NOW };

  it('reads "now" as a time, which no clock parser can', () => {
    const found = answerFromText(WHEN, 'now', world);
    assert.equal(found.kind, 'when');
    if (found.kind !== 'when') return;
    assert.ok(Date.parse(found.iso) > NOW.getTime(), 'and still ahead, so the card does not reopen the question');
    assert.ok(Date.parse(found.iso) - NOW.getTime() < 5 * 60_000);
  });

  it('reads it in Arabic too', () => {
    assert.equal(answerFromText(WHEN, 'الحين', world).kind, 'when');
  });

  /**
   * The one a phone found: "No I want it here" came back "I couldn't read
   * that", which is both wrong and a dead end.
   */
  for (const said of ['no', 'No I want it here', 'not now', 'no time', 'skip it', 'لا', 'بدون وقت', 'بعدين']) {
    it(`treats "${said}" as turning the question down, not as unreadable`, () => {
      assert.equal(answerFromText(WHEN, said, world).kind, 'refused', said);
    });
  }

  it('still takes a time inside a sentence that opens with "no"', () => {
    assert.equal(answerFromText(WHEN, 'no, make it tomorrow at 10', world).kind, 'when');
  });

  it('still calls nonsense nonsense', () => {
    assert.equal(answerFromText(WHEN, 'asdfgh', world).kind, 'unreadable');
  });
});

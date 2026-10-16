import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  capFor,
  capReached,
  edit,
  grade,
  kept,
  label,
  newCard,
  read,
  remove,
  repeats,
  savable,
  selectAll,
  summary,
  toggle,
  type Card,
} from './batch';
import { FREE_BULK_CARDS_PER_BATCH } from '@/policy/entitlements';
import type { Contact } from '@/lib/model-types';
import type { ContactFields } from '@/lib/parse/contact';

const card = (id: string, fields: ContactFields, over: Partial<Card> = {}): Card => ({
  ...newCard(id, `file://${id}.jpg`),
  fields,
  reading: false,
  ...over,
});

const whole = (id: string): Card => card(id, { name: `Name ${id}`, phone: '501234567', dial: '+966' });
const person = (id: string, over: Partial<Contact> = {}): Contact => ({
  id,
  name: `Name ${id}`,
  createdAt: '2026-10-10T09:00:00.000Z',
  ...over,
});

describe('grade', () => {
  it('is ready with a name and a way to reach them', () => {
    assert.equal(grade({ name: 'Sara Haddad', phone: '501234567' }), 'ready');
    assert.equal(grade({ name: 'Sara Haddad', email: 'sara@example.com' }), 'ready');
  });

  it('is partial with a name and no way to reach them', () => {
    assert.equal(grade({ name: 'Sara Haddad' }), 'partial');
    assert.equal(grade({ name: 'Sara Haddad', role: 'Northwind Ventures' }), 'partial');
  });

  it('is partial when the number or the email will not pass the contact form', () => {
    assert.equal(grade({ name: 'Sara Haddad', phone: '12' }), 'partial');
    assert.equal(grade({ name: 'Sara Haddad', email: 'sara@' }), 'partial');
  });

  it('is unreadable without a name, whatever else came through', () => {
    assert.equal(grade({}), 'unreadable');
    assert.equal(grade({ phone: '501234567', email: 'sara@example.com' }), 'unreadable');
    assert.equal(grade({ name: ' ' }), 'unreadable');
  });

  it('grades an Arabic card the same way', () => {
    assert.equal(grade({ name: 'سارة حداد', phone: '501234567' }), 'ready');
    assert.equal(grade({ name: 'سارة حداد' }), 'partial');
  });
});

describe('savable', () => {
  it('is false while the phone is still reading, whatever the fields say', () => {
    assert.equal(savable(card('a', { name: 'Sara', phone: '501234567' }, { reading: true })), false);
    assert.equal(savable(card('a', { name: 'Sara', phone: '501234567' })), true);
  });
});

describe('the cap', () => {
  it('is five for everyone below Pro+, and lifted for Pro+', () => {
    assert.equal(capFor('free'), FREE_BULK_CARDS_PER_BATCH);
    assert.equal(capFor('trial'), FREE_BULK_CARDS_PER_BATCH);
    assert.equal(capFor('pro'), FREE_BULK_CARDS_PER_BATCH);
    assert.equal(capFor('lapsed'), FREE_BULK_CARDS_PER_BATCH);
    assert.equal(capFor('pro_plus'), null);
  });

  it('cannot be exceeded by ticking cards one at a time', () => {
    let cards = Array.from({ length: 8 }, (_, i) => whole(String(i)));
    for (const c of cards) cards = toggle(cards, c.id, 3);
    assert.equal(kept(cards).length, 3);
    assert.deepEqual(kept(cards).map((c) => c.id), ['0', '1', '2']);
  });

  it('cannot be exceeded by reading more ready cards in', () => {
    let cards: Card[] = [];
    for (let i = 0; i < 8; i += 1) {
      cards = [...cards, newCard(String(i), 'file://x.jpg')];
      cards = read(cards, String(i), ['Sara'], { name: `Name ${i}`, phone: '501234567' }, 2);
    }
    assert.equal(kept(cards).length, 2);
  });

  it('cannot be exceeded by Select all', () => {
    const cards = selectAll(Array.from({ length: 9 }, (_, i) => whole(String(i))), 4);
    assert.equal(kept(cards).length, 4);
  });

  it('frees a place again when a card is unticked', () => {
    let cards = selectAll(Array.from({ length: 6 }, (_, i) => whole(String(i))), 3);
    assert.equal(capReached(cards, 3), true);
    cards = toggle(cards, '0', 3);
    assert.equal(capReached(cards, 3), false);
    cards = toggle(cards, '5', 3);
    assert.deepEqual(kept(cards).map((c) => c.id), ['1', '2', '5']);
  });

  it('is no cap at all for Pro+', () => {
    const cards = selectAll(Array.from({ length: 30 }, (_, i) => whole(String(i))), capFor('pro_plus'));
    assert.equal(kept(cards).length, 30);
    assert.equal(capReached(cards, capFor('pro_plus')), false);
  });
});

describe('read', () => {
  it('ticks a card that came through whole, so twenty cards are not twenty taps', () => {
    const cards = read([newCard('a', 'file://a.jpg')], 'a', ['Sara Haddad'], { name: 'Sara Haddad', phone: '501234567' }, 5);
    assert.equal(cards[0]?.reading, false);
    assert.equal(cards[0]?.keep, true);
  });

  it('leaves a card short of that unticked, so it has to be looked at', () => {
    const half = read([newCard('a', 'file://a.jpg')], 'a', ['Sara Haddad'], { name: 'Sara Haddad' }, 5);
    assert.equal(half[0]?.keep, false);
    const none = read([newCard('b', 'file://b.jpg')], 'b', [], {}, 5);
    assert.equal(none[0]?.keep, false);
    assert.equal(none[0]?.reading, false);
  });

  it('keeps the lines, for "what was read"', () => {
    const cards = read([newCard('a', 'file://a.jpg')], 'a', ['Sara Haddad', 'Northwind'], { name: 'Sara Haddad' }, 5);
    assert.deepEqual(cards[0]?.lines, ['Sara Haddad', 'Northwind']);
  });

  it('touches no other card in the batch', () => {
    const before = [whole('a'), newCard('b', 'file://b.jpg')];
    const after = read(before, 'b', ['X'], { name: 'X', phone: '501234567' }, 5);
    assert.deepEqual(after[0], before[0]);
  });
});

describe('toggle', () => {
  it('refuses a card with no usable name', () => {
    const cards = toggle([card('a', { phone: '501234567' })], 'a', 5);
    assert.equal(kept(cards).length, 0);
  });

  it('refuses a card still being read', () => {
    const cards = toggle([card('a', { name: 'Sara', phone: '501234567' }, { reading: true })], 'a', 5);
    assert.equal(kept(cards).length, 0);
  });

  it('unticks even when the cap is full', () => {
    const full = selectAll([whole('a'), whole('b')], 2);
    assert.equal(kept(toggle(full, 'a', 2)).length, 1);
  });

  it('ignores an id that is not in the batch', () => {
    const cards = [whole('a')];
    assert.deepEqual(toggle(cards, 'nope', 5), cards);
  });
});

describe('selectAll', () => {
  it('clears when anything is ticked', () => {
    const some = toggle([whole('a'), whole('b')], 'a', 5);
    assert.equal(kept(selectAll(some, 5)).length, 0);
  });

  it('takes the cards that came through whole first', () => {
    const cards = selectAll([card('half', { name: 'Half' }), whole('whole')], 1);
    assert.deepEqual(kept(cards).map((c) => c.id), ['whole']);
  });

  it('never ticks a card that cannot be saved', () => {
    const cards = selectAll([card('blank', {}), whole('a')], null);
    assert.deepEqual(kept(cards).map((c) => c.id), ['a']);
  });
});

describe('edit and remove', () => {
  it('a correction can turn a partial card into a ready one', () => {
    const cards = edit([card('a', { name: 'Sara Haddad' })], 'a', { name: 'Sara Haddad', phone: '501234567' });
    assert.equal(grade(cards[0]?.fields ?? {}), 'ready');
  });

  it('removing drops one card and leaves the rest', () => {
    assert.deepEqual(remove([whole('a'), whole('b')], 'a').map((c) => c.id), ['b']);
  });
});

describe('summary', () => {
  it('counts the batch as the heading reads it', () => {
    const cards = [whole('a'), whole('b'), card('c', { name: 'Name c' }), card('d', {}), newCard('e', 'file://e.jpg')];
    assert.deepEqual(summary(cards), { ready: 2, partial: 1, unreadable: 1, reading: 1 });
  });
});

describe('repeats', () => {
  it('flags the second shot of the same card, not the first', () => {
    const flags = repeats([whole('a'), card('b', { name: 'Name a', phone: '501234567' })], []);
    assert.equal(flags.get('a'), undefined);
    assert.equal(flags.get('b'), 'batch');
  });

  it('flags someone already in People', () => {
    const flags = repeats([card('a', { name: 'Sara Haddad', phone: '501234567' })], [person('p', { name: 'Sara Haddad' })]);
    assert.equal(flags.get('a'), 'people');
  });

  it('prefers "in this batch" when a card is both', () => {
    const cards = [card('a', { name: 'Sara Haddad', phone: '501234567' }), card('b', { name: 'Sara Haddad', phone: '501234567' })];
    const flags = repeats(cards, [person('p', { name: 'Sara Haddad' })]);
    assert.equal(flags.get('a'), 'people');
    assert.equal(flags.get('b'), 'batch');
  });

  it('says nothing about a card with no name, or one still being read', () => {
    const flags = repeats([card('a', { phone: '501234567' }), card('b', { name: 'Name a' }, { reading: true })], []);
    assert.equal(flags.size, 0);
  });

  it('matches two spellings of the same Arabic name', () => {
    const flags = repeats([card('a', { name: 'أحمد صلاح' }), card('b', { name: 'احمد صلاح' })], []);
    assert.equal(flags.get('b'), 'batch');
  });
});

describe('label', () => {
  it('tidies what was typed, so one tag does not become two', () => {
    assert.equal(label('  Conference   2026 '), 'Conference 2026');
    assert.equal(label('مؤتمر  الرياض'), 'مؤتمر الرياض');
  });
});

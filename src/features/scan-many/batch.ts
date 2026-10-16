/**
 * A stack of business cards, read in one go.
 *
 * At a conference the cards arrive faster than anyone can type them, so this
 * holds the whole stack: a shot goes in, the phone reads it in the background
 * while the camera stays open, and nothing is saved until the person has seen
 * the list. Everything here is a plain function over a list of cards, so the
 * camera screen owns only the camera.
 *
 * What this deliberately does not have is a confidence score. The readers
 * (Apple's Vision, Google's ML Kit) hand back lines of text and no measure of
 * how sure they are, so a percentage would be invented. What can be said
 * honestly is how much of a card came through — a name and a way to reach
 * them, a name alone, or nothing usable — which is also the thing the person
 * has to act on. `Grade` is that, and nothing more.
 */
import { emailInvalid, findDuplicate, nameValid, phoneInvalid, sameContact } from '@/features/contact/form-rules';
import { limitsFor, type Plan } from '@/policy/entitlements';
import { type Contact } from '@/lib/model-types';
import { type ContactFields } from '@/lib/parse/contact';

/**
 * How much of a card came through.
 *
 * `ready` — a name and at least one working way to reach them: save it as it
 * is. `partial` — a name, but nothing to reach them by, or a number or email
 * that will not pass the contact form: savable, worth a look first.
 * `unreadable` — no usable name, which is the one field a contact cannot do
 * without, so it cannot be saved until it is typed in.
 */
export type Grade = 'ready' | 'partial' | 'unreadable';

export type Card = {
  /** Stable from the moment the shutter fires, so reading, editing and keeping all find the same card. */
  id: string;
  /** The photo, shown as a thumbnail in the review list. */
  uri: string;
  /** The lines the reader found, kept for the "what was read" disclosure. */
  lines: readonly string[];
  fields: ContactFields;
  /** The phone has not finished reading this one yet. */
  reading: boolean;
  /** Ticked for saving. */
  keep: boolean;
};

/**
 * How many cards this plan may keep in one batch; `null` is unlimited.
 *
 * The number itself is in src/policy/entitlements.ts with every other limit,
 * and why it is a meter rather than a lock is written there too.
 */
export function capFor(plan: Plan): number | null {
  return limitsFor(plan).bulkCardsPerBatch;
}

export function newCard(id: string, uri: string): Card {
  return { id, uri, lines: [], fields: {}, reading: true, keep: false };
}

/** What a card's fields amount to. A card still being read is never graded. */
export function grade(fields: ContactFields): Grade {
  const name = fields.name?.trim() ?? '';
  if (!nameValid(name)) return 'unreadable';
  const phone = fields.phone?.trim() ?? '';
  const email = fields.email?.trim() ?? '';
  if (phone === '' && email === '') return 'partial';
  if (phone !== '' && phoneInvalid(phone)) return 'partial';
  if (email !== '' && emailInvalid(email)) return 'partial';
  return 'ready';
}

/** Whether this card could be saved as a contact at all. */
export function savable(card: Card): boolean {
  return !card.reading && grade(card.fields) !== 'unreadable';
}

/** How the batch reads at a glance, for the review heading. */
export function summary(cards: readonly Card[]): { ready: number; partial: number; unreadable: number; reading: number } {
  let ready = 0;
  let partial = 0;
  let unreadable = 0;
  let reading = 0;
  for (const card of cards) {
    if (card.reading) {
      reading += 1;
      continue;
    }
    const g = grade(card.fields);
    if (g === 'ready') ready += 1;
    else if (g === 'partial') partial += 1;
    else unreadable += 1;
  }
  return { ready, partial, unreadable, reading };
}

/**
 * The reader's answer folded into the batch, and the card ticked if it came
 * through whole.
 *
 * A `ready` card is ticked for the person, because twenty cards that each
 * need a tap is the typing problem again. Anything short of that is left
 * unticked so it has to be looked at — and nothing is ticked once the cap is
 * full.
 */
export function read(cards: readonly Card[], id: string, lines: readonly string[], fields: ContactFields, cap: number | null): Card[] {
  const room = cap === null ? Infinity : Math.max(0, cap - kept(cards).length);
  return cards.map((card) =>
    card.id === id ? { ...card, lines, fields, reading: false, keep: grade(fields) === 'ready' && room > 0 } : card,
  );
}

/** A correction from the review list. */
export function edit(cards: readonly Card[], id: string, fields: ContactFields): Card[] {
  return cards.map((card) => (card.id === id ? { ...card, fields } : card));
}

/** Dropped from the batch entirely — an unreadable shot, or one taken twice. */
export function remove(cards: readonly Card[], id: string): Card[] {
  return cards.filter((card) => card.id !== id);
}

export function kept(cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.keep);
}

/** Whether ticking one more card would run past the cap. */
export function capReached(cards: readonly Card[], cap: number | null): boolean {
  return cap !== null && kept(cards).length >= cap;
}

/**
 * Tick or untick one card. Unticking always works; ticking is refused for a
 * card that cannot be saved, or once the cap is full, so the cap can never be
 * exceeded by any route.
 */
export function toggle(cards: readonly Card[], id: string, cap: number | null): Card[] {
  const card = cards.find((c) => c.id === id);
  if (!card) return [...cards];
  if (card.keep) return cards.map((c) => (c.id === id ? { ...c, keep: false } : c));
  if (!savable(card) || capReached(cards, cap)) return [...cards];
  return cards.map((c) => (c.id === id ? { ...c, keep: true } : c));
}

/**
 * "Select all", and the same button clearing again.
 *
 * With a cap, all means as many as the cap allows, best first: a card that
 * came through whole before one that still needs a field, and otherwise the
 * order they were shot in. Below the cap a user picking the five that matter
 * is a tap each, which is the point of the cap being felt rather than hidden.
 */
export function selectAll(cards: readonly Card[], cap: number | null): Card[] {
  if (kept(cards).length > 0) return cards.map((card) => ({ ...card, keep: false }));
  const rank = (card: Card): number => (grade(card.fields) === 'ready' ? 0 : 1);
  const order = cards
    .filter(savable)
    .map((card, index) => ({ card, index }))
    .sort((a, b) => rank(a.card) - rank(b.card) || a.index - b.index);
  const take = new Set(order.slice(0, cap ?? order.length).map((entry) => entry.card.id));
  return cards.map((card) => ({ ...card, keep: take.has(card.id) }));
}

/** A label put on every card being saved — "Conference 2026". */
export function label(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Cards that repeat someone — another card in the same batch, or someone
 * already in People.
 *
 * Two of a person's cards in one stack is ordinary (a card handed over twice,
 * a shot retaken) and so is scanning someone already saved. Both are only
 * worth a word on the row: the person decides, and the single-card screen's
 * "update or save new" question twenty times over would be its own ordeal.
 */
export function repeats(cards: readonly Card[], contacts: readonly Contact[]): Map<string, 'batch' | 'people'> {
  const flags = new Map<string, 'batch' | 'people'>();
  // Copied once: findDuplicate takes the list as it is held on the contact form.
  const pool = [...contacts];
  const seen: { id: string; name: string; phone: string; email: string }[] = [];
  for (const card of cards) {
    if (card.reading) continue;
    const reach = {
      id: card.id,
      name: card.fields.name?.trim() ?? '',
      phone: card.fields.phone?.trim() ?? '',
      email: card.fields.email?.trim() ?? '',
    };
    if (reach.name === '') continue;
    if (seen.some((earlier) => sameContact(earlier, reach) !== null)) flags.set(card.id, 'batch');
    else if (findDuplicate(reach, pool)) flags.set(card.id, 'people');
    seen.push(reach);
  }
  return flags;
}

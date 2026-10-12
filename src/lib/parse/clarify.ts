/**
 * What is worth asking before a parsed note becomes a task.
 *
 * A parser proposes {type, title, who, when} from one sentence, and a
 * sentence is often thinner than a task: "call Daina" with two Dainas, "text
 * Sara" with nobody called Sara, "call" with nobody at all, "remind me to pay
 * the invoice" with no time. People should not have to know how to phrase it
 * so the parser can use it — this reads the sentence, the proposal and the
 * person's own world (People, recent tasks, who owes them a reply) and says
 * what to ask next, one question at a time.
 *
 * Pure and parser-agnostic: it works on the on-device rules' answer and on the
 * backend's alike, spends no Assistant request, and decides nothing by
 * itself. A screen asks the question, the person taps or types an answer, and
 * `apply*` turns the answer into the next proposal. Nothing is saved here.
 */
import { followUpStatus, type Contact, type FollowUp, type Task } from '@/lib/model-types';
import { matchContact } from '@/features/people/search';
import { dayOf, partOf, timeOf, whenOf } from './local';
import { candidateName, firstNameOf, isArabic, mentions, normalizeArabic, soundsAlike } from './names';
import type { ParsedTask } from './types';

/** The three things that need a person; a plain reminder does not. */
const NEEDS_PERSON: readonly ParsedTask['type'][] = ['call', 'email', 'whatsapp'];

export type Gap =
  /**
   * "Daina" is two people in People — or twelve. `options` is all of them,
   * best first; a screen shows the first few and lets the person type to
   * narrow the rest. With `fuzzy`, nobody matched exactly and these are the
   * ones that sound alike ("Sara" for سارة): a single option is a "did you
   * mean?" rather than a "which one?".
   */
  | { kind: 'who-ambiguous'; name: string; options: Contact[]; fuzzy?: boolean }
  /** A name was written that People has never heard of. */
  | { kind: 'who-unknown'; name: string }
  /** A call, email or message with nobody named. `suggestions` are in the order worth showing. */
  | { kind: 'who-missing'; suggestions: Contact[] }
  /** No day or time was said (`missing`), or the time said has already gone today (`past`). */
  | { kind: 'when'; why: 'missing' | 'past' };

/** Questions the person has already waved away ("No one", "Skip") — never asked twice. */
export type Settled = { who?: boolean; when?: boolean };

/** Everything outside the sentence that makes a better question possible. */
export type World = {
  contacts: Contact[];
  tasks: Task[];
  followUps: FollowUp[];
  now: Date;
};

// --- who ---------------------------------------------------------------

export type WhoReading =
  | { kind: 'one'; contact: Contact }
  | { kind: 'several'; name: string; options: Contact[]; fuzzy?: boolean };

const fold = (s: string): string => normalizeArabic(s.trim().toLowerCase());

/**
 * The people a sentence names. A full name in the text settles it; otherwise
 * the first name written does, and if several contacts share it — or sound
 * like it in the other script — the reading is "several" rather than a silent
 * pick of the first one. When nobody matches exactly, a name that merely
 * sounds like a contact's ("Sarah" for Sara, "Sara" for سارة) comes back as
 * "several" with `fuzzy`, to be confirmed.
 */
export function readWho(text: string, contacts: Contact[]): WhoReading | null {
  const folded = fold(text);
  const full = contacts.filter((c) => c.name.trim().length > 0 && folded.includes(fold(c.name)));
  if (full.length === 1 && full[0]) return { kind: 'one', contact: full[0] };

  const named = contacts.filter((c) => mentions(text, firstNameOf(c)));
  const lead = named[0];
  if (lead) {
    const leadName = firstNameOf(lead);
    const same = named.filter((c) => fold(firstNameOf(c)) === fold(leadName));
    // The same name saved in the other script is the same name to the person typing.
    const otherScript = contacts.filter(
      (c) =>
        !same.includes(c) &&
        isArabic(firstNameOf(c)) !== isArabic(leadName) &&
        soundsAlike(firstNameOf(c), leadName)
    );
    const all = [...same, ...otherScript];
    return all.length === 1 ? { kind: 'one', contact: lead } : { kind: 'several', name: leadName, options: all };
  }

  const candidate = candidateName(text);
  if (candidate) {
    const alike = contacts.filter((c) => soundsAlike(firstNameOf(c), candidate.word));
    if (alike.length > 0) return { kind: 'several', name: candidate.word, options: alike, fuzzy: true };
  }
  return null;
}

/**
 * A name the sentence uses that is not in People, or null. In English any
 * name after a person-verb counts; in Arabic only where a person must come
 * ("اتصل بـ…", "ابعت لـ…"), because a noun looks the same as a name there.
 */
export function unknownName(text: string, contacts: Contact[]): string | null {
  const candidate = candidateName(text);
  if (!candidate) return null;
  const known = contacts.some((c) => fold(firstNameOf(c)) === fold(candidate.word) || soundsAlike(firstNameOf(c), candidate.word));
  return known ? null : candidate.word;
}

/**
 * Who to offer, best first. Someone who owes you a reply comes first, then
 * people you have dealt with often lately, then People's own order (most
 * recent first). Someone with no number is a poor suggestion for a call or
 * message, and someone with no email for an email.
 */
export function rankContacts(type: ParsedTask['type'], pool: Contact[], world: World): Contact[] {
  const { tasks, followUps, now } = world;
  const month = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const uses = new Map<string, number>();
  for (const task of tasks) {
    if (task.status === 'cancelled' || new Date(task.createdAt).getTime() < month) continue;
    for (const id of task.contactIds) uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  const owed = new Map<string, number>();
  for (const f of followUps) {
    if (!f.contactId) continue;
    const status = followUpStatus(f, now);
    if (status === 'due') owed.set(f.contactId, 100);
    else if (status === 'waiting') owed.set(f.contactId, Math.max(owed.get(f.contactId) ?? 0, 40));
  }

  const reachable = (c: Contact): boolean =>
    type === 'email' ? Boolean(c.email) : type === 'call' || type === 'whatsapp' ? Boolean(c.phone) : true;

  return pool
    .map((contact, index) => ({
      contact,
      index,
      score:
        (owed.get(contact.id) ?? 0) +
        Math.min(uses.get(contact.id) ?? 0, 5) * 5 +
        Math.max(0, 20 - index) -
        (reachable(contact) ? 0 : 30),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.contact);
}

export const suggestWho = (type: ParsedTask['type'], world: World, limit = 5): Contact[] =>
  rankContacts(type, world.contacts, world).slice(0, limit);

// --- when --------------------------------------------------------------

/** Whether the sentence gives a day, a part of the day or a time the parser can actually use. */
function saysWhen(text: string, now: Date): boolean {
  return dayOf(text, now).said || timeOf(text) !== null || partOf(text) !== null;
}

/** The parser's fallback: 17:00 today. Anything else means something was read. */
function isDefaultWhen(iso: string, now: Date): boolean {
  const at = new Date(iso);
  return at.toDateString() === now.toDateString() && at.getHours() === 17 && at.getMinutes() === 0;
}

// --- the question ------------------------------------------------------

/**
 * The next thing to ask, or null when the proposal is ready for "Looks
 * right". Who comes before when: a call is worth little until you know who.
 */
export function clarify(text: string, draft: ParsedTask, world: World, settled: Settled = {}): Gap | null {
  if (!settled.who) {
    const read = readWho(text, world.contacts);
    if (read?.kind === 'several') {
      const options = rankContacts(draft.type, read.options, world);
      return { kind: 'who-ambiguous', name: read.name, options, ...(read.fuzzy ? { fuzzy: true } : {}) };
    }
    if (!read) {
      if (draft.who && !draft.contactId) return { kind: 'who-unknown', name: draft.who };
      const unknown = unknownName(text, world.contacts);
      if (unknown && !draft.contactId) return { kind: 'who-unknown', name: unknown };
      if (!draft.who && NEEDS_PERSON.includes(draft.type)) {
        return { kind: 'who-missing', suggestions: suggestWho(draft.type, world) };
      }
    }
  }

  if (!settled.when) {
    const said = saysWhen(text, world.now) || !isDefaultWhen(draft.when, world.now);
    if (!said) return { kind: 'when', why: 'missing' };
    if (timeOf(text) !== null && new Date(draft.when).getTime() <= world.now.getTime()) {
      return { kind: 'when', why: 'past' };
    }
  }
  return null;
}

// --- the answer --------------------------------------------------------

export function withWho(draft: ParsedTask, contact: Contact | null): ParsedTask {
  return { ...draft, who: contact?.name ?? null, contactId: contact?.id ?? null };
}

export function withWhen(draft: ParsedTask, iso: string): ParsedTask {
  return { ...draft, when: iso };
}

/** A quick time as the reschedule sheet writes it: [label, days from today, "HH:MM"]. */
export type QuickWhen = readonly [string, number, string];

/** The quick times still ahead of `now`, as ready-to-use instants. */
export function whenOptions(quick: readonly QuickWhen[], now: Date, limit = 5): { label: string; iso: string }[] {
  const out: { label: string; iso: string }[] = [];
  for (const [label, offset, at] of quick) {
    const [h = 0, m = 0] = at.split(':').map(Number);
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, m, 0, 0);
    if (date.getTime() > now.getTime()) out.push({ label, iso: date.toISOString() });
  }
  return out.slice(0, limit);
}

export type TextAnswer =
  | { kind: 'who'; contact: Contact }
  | { kind: 'who-several'; name: string; options: Contact[] }
  | { kind: 'who-new'; name: string }
  | { kind: 'when'; iso: string }
  | { kind: 'unreadable' };

/**
 * Reads a typed reply to the question that is open. "Sara", "sara haddad", a
 * phone number's digits or "tomorrow at 10" all work; anything else is
 * "unreadable", and the screen says so and leaves the chips up.
 */
export function answerFromText(gap: Gap, text: string, world: World): TextAnswer {
  const reply = text.trim();
  if (!reply) return { kind: 'unreadable' };

  if (gap.kind === 'when') {
    if (!saysWhen(reply, world.now)) return { kind: 'unreadable' };
    const iso = whenOf(reply, world.now);
    return new Date(iso).getTime() > world.now.getTime() ? { kind: 'when', iso } : { kind: 'unreadable' };
  }

  // Everything else is about a person. Narrow within the options when there were some.
  const pool = gap.kind === 'who-ambiguous' ? gap.options : world.contacts;
  const hits = pool.filter((c) => matchContact(c, reply));
  if (hits.length === 1 && hits[0]) return { kind: 'who', contact: hits[0] };
  if (hits.length > 1) return { kind: 'who-several', name: reply, options: hits };
  if (gap.kind === 'who-ambiguous') return { kind: 'unreadable' };

  // Nobody by that name: a name, if it looks like one, otherwise not an answer.
  const looksLikeName = /^[\p{L}][\p{L}\s'’.-]{1,38}$/u.test(reply) && !/\d/.test(reply);
  if (!looksLikeName) return { kind: 'unreadable' };
  const name = reply.replace(/\s+/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return { kind: 'who-new', name };
}

/**
 * Promises and waiting: the two things a busy person forgets.
 *
 * "I told Omar I'd send the contract Thursday" is a promise — something you
 * owe. "Waiting for Sara to reply about the quote" and "Sara hasn't answered"
 * are the other side — something you are owed, which becomes a follow-up that
 * comes back when it is time to check. Said out loud they need no form: this
 * reads the lead-in off the sentence, in English, Gulf and Egyptian Arabic,
 * and hands back what is left for the usual parser to read the day, the
 * channel and the person from.
 *
 * Pure and offline. It only recognises; the screen still shows the result for
 * "Looks right" before anything is saved.
 */
import type { Contact } from '@/lib/model-types';

import { ar, AR_LETTER, firstNameOf, mentions } from './names';

export type Loop = {
  kind: 'promise' | 'waiting';
  /** What is left after the lead-in: "send the contract Thursday", "Sara to reply about the quote". */
  body: string;
  /** A person who is waited on, when the sentence names one who is not in People. */
  name: string | null;
};

/** Questions about waiting ("what am I waiting for?") are for the follow-ups list, not a new follow-up. */
const QUESTION = ar(`^\\s*(?:what|who|which|how many|show|list|when|مين|ايه|إيه|ايش|شنو|وش|كم|منو)(?![${AR_LETTER}a-z])`);

const END = /[.!؟?،]+\s*$/;

// --- what I owe ----------------------------------------------------------

const PROMISE: RegExp[] = [
  // "I told Omar I'd send it", "I promised Sara I will call", "I said I'd reply"
  /\bi(?:'ve|’ve| have)?\s+(?:told|promised|assured|said|committed)\b[^.]*?\bi(?:['’]d|['’]ll|\s+will|\s+would)\s+(.+)$/i,
  // "I promised Sara a call tomorrow", "I owe Layla a reply"
  /\bi\s+(?:promised|owe)\s+[a-z'’-]+(?:\s+[A-Z][a-z'’-]+)?\s+(?:a|an|the)\s+(.+)$/i,
  // "I'll get back to Omar tomorrow"
  /\bi(?:['’]ll|\s+will)\s+(get back to\s+.+)$/i,
  // "وعدت عمر اني ارسله العقد", "قلت لسارة اني هكلمها بكره", "وعدتها أرد عليها"
  ar(`(?<![${AR_LETTER}])(?:وعد|قلت|قلنا|اتفقت)\\S*\\s+(?:\\S+\\s+){0,2}?(?:ان|اني|إني|أن|انى|انو)\\s+(.+)$`),
  // "وعدتها أرد عليها الصبح": the person is in the verb, so what follows is the promise itself
  ar(`(?<![${AR_LETTER}])وعد(?:تها|ته|تهم|تك|تكم)\\s+(.+)$`),
];

// --- what I am owed ------------------------------------------------------

const NAME = "([a-z][a-z'’-]{1,}(?:\\s+[a-z][a-z'’-]{1,})?)";

type Waiting = { rule: RegExp; /** Which group holds the person, if the rule names one. */ who?: number; what: number };
const WAITING: Waiting[] = [
  // "waiting for Sara to reply about the quote", "waiting on Omar for the contract"
  { rule: /\bwaiting\s+(?:for|on)\s+(.+)$/i, what: 1 },
  // "no reply from Sara"
  { rule: /\bno\s+(?:reply|response|answer)\s+from\s+(.+)$/i, what: 1 },
  // "Sara owes me the contract", "Sara hasn't replied", "Omar never answered"
  {
    rule: new RegExp(
      `\\b${NAME}\\s+(?:owes\\s+me|hasn['’]?t\\s+(?:replied|responded|answered|sent|got(?:ten)?\\s+back)|(?:has\\s+)?not\\s+(?:replied|responded|answered)|never\\s+(?:replied|responded|answered)|didn['’]?t\\s+(?:reply|respond|answer))\\b\\s*(.*)$`,
      'i'
    ),
    who: 1,
    what: 2,
  },
  // "Sara said she'd send the deck", "Omar promised to call"
  {
    rule: new RegExp(
      `\\b${NAME}\\s+(?:said|promised|told me)\\s+(?:(?:he|she|they)(?:['’]d|['’]ll|\\s+will|\\s+would)|to)\\s+(.+)$`,
      'i'
    ),
    who: 1,
    what: 2,
  },
  // Arabic: "مستني رد سارة", "منتظر العقد من عمر"
  { rule: ar(`(?<![${AR_LETTER}])(?:مستني|مستنيه|مستنى|منتظر|منتظره|بانتظر|بستنى|استنى|انتظر)\\s+(.+)$`), what: 1 },
  // Arabic: "سارة مردتش", "عمر ما ردش علي"
  {
    rule: ar(`(?<![${AR_LETTER}])(\\S+)\\s+(?:مردش|مردتش|ماردش|ما\\s*ردش|ما\\s*ردت|ما\\s*رد|لسه\\s*(?:ما|م)\\s*رد\\S*)(.*)$`),
    who: 1,
    what: 2,
  },
  // Arabic: "سارة وعدتني تبعت العرض"
  { rule: ar(`(?<![${AR_LETTER}])(\\S+)\\s+(?:وعدني|وعدتني|وعدوني)\\s+(.+)$`), who: 1, what: 2 },
];

const STOP_NAMES = new Set(['the', 'a', 'an', 'my', 'me', 'him', 'her', 'them', 'it', 'this', 'that', 'some', 'any', 'no', 'an', 'i', 'he', 'she', 'they', 'we']);

/** A person in People whose first name is in the text. */
const known = (text: string, contacts: readonly Contact[]): Contact | undefined => contacts.find((c) => mentions(text, firstNameOf(c)));

/** What is owed, without the person, the "to" / "for" / "from" in front, or the stop words. */
function whatIsOwed(rest: string, person: string): string {
  let out = rest;
  if (person) out = out.replace(new RegExp(`(?<![\\p{L}])${person.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu'), ' ');
  out = out
    .replace(/\s+/g, ' ')
    .replace(/^(?:\s*(?:to|for|on|from|about|regarding|a|an|و|من|على|علي|ل)\s+)+/i, '')
    .replace(/\s+(?:to|for|on|from)$/i, '')
    .trim();
  return /^(?:to\s+)?(?:reply|respond|answer|get back|رد|يرد|ترد)?$/i.test(out) ? '' : out;
}

/**
 * The promise or the waiting in a sentence, or null. A waiting needs a person
 * — in People, or at least a Capitalised name — because "waiting for the
 * plumber" is a thing to remember, not someone to chase.
 */
export function loopOf(text: string, contacts: readonly Contact[]): Loop | null {
  const sentence = text.trim().replace(END, '');
  if (!sentence || QUESTION.test(sentence)) return null;

  for (const rule of PROMISE) {
    const body = rule.exec(sentence)?.[1]?.trim();
    if (body) return { kind: 'promise', body, name: null };
  }

  for (const { rule, who, what } of WAITING) {
    const found = rule.exec(sentence);
    const rest = found?.[what]?.trim() ?? '';
    if (!found || (!rest && who === undefined)) continue;

    const inPeople = known(sentence, contacts);
    // The named subject, for rules that put the person first.
    const named = who !== undefined ? found[who]?.trim() : undefined;
    if (who !== undefined && !inPeople) {
      // Unknown subject: only a Capitalised, non-stop word, as written.
      const first = named?.split(/\s+/)[0] ?? '';
      if (!named || STOP_NAMES.has(first.toLowerCase()) || !/^\p{Lu}/u.test(named)) continue;
    }
    // Waiting on something with no person at all is a reminder, not a chase.
    const capital = /\b(?:for|on|from)\s+(\p{Lu}[\p{L}'’-]+)/u.exec(sentence)?.[1];
    if (!inPeople && !named && !capital) continue;

    const person = inPeople ? firstNameOf(inPeople) : (named ?? capital ?? '');
    return {
      kind: 'waiting',
      body: who !== undefined ? whatIsOwed(rest, '') : whatIsOwed(rest, person),
      name: inPeople ? null : (named ?? capital ?? null),
    };
  }
  return null;
}

/**
 * Takes the person out of a sentence, on the device, before it is ever sent.
 *
 * The owner wants to see how people really ask, so Sanad can be taught the
 * phrasings it misses. What teaches a parser is the *shape* of a sentence and
 * whether it was understood — "مين لازم ارد على {name}؟ → unknown" — and none
 * of that needs to know who {name} is. So the names, numbers and addresses
 * come out here, on the phone, and the raw sentence never leaves it.
 *
 * What is replaced:
 *
 *   {link}    a URL
 *   {email}   an address
 *   {phone}   a run of digits long enough to call
 *   {number}  any other long run of digits, Arabic-Indic ones included
 *   {name}    every contact in this person's own address book, first names
 *             too, and the name the parser can see in a sentence even when
 *             nobody by that name is saved (`candidateName`)
 *
 * What is kept is what the parser is judged on: the question words, the
 * verbs, the days, the clock, and the ordinary nouns somebody chose. A time
 * stays a time — "4" and "٤" are two characters and they are the whole
 * difference between a sentence that parses and one that does not.
 *
 * **This is best-effort on names and exact on the rest.** Patterns catch an
 * address or a number every time; a name is caught when it is in the address
 * book or where the sentence puts a name. A nickname nobody has saved, in the
 * middle of a sentence shaped like nothing in particular, can survive. That
 * is why `fullyRedacted` exists and why the caller drops anything it is not
 * sure of rather than sending it. BUILD-REVIEW §2.114.
 */
import { arg, candidateName, escapeRegExp, firstNameOf, normalizeArabic } from './names';

export type Redactable = { name: string };

/** The placeholders, so a reader of a logged line knows what came out. */
export const PLACEHOLDERS = ['{link}', '{email}', '{phone}', '{number}', '{name}'] as const;

const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;
/** Long enough to be a number somebody could ring: seven digits, however they are spaced. */
const PHONE = /\+?[\d٠-٩][\d٠-٩ ()\-.]{6,}[\d٠-٩]/g;
/** Anything else five digits or longer — an IBAN fragment, an order number, an ID. */
const LONG_NUMBER = /[\d٠-٩]{5,}/g;

/** A word short enough that masking it would take the sentence's shape with it. */
const TOO_SHORT = 2;

/**
 * The sentence with the person taken out of it.
 *
 * `contacts` is this device's own address book, which is why the work happens
 * here: the server has no business knowing which names to look for.
 */
export function redact(text: string, contacts: readonly Redactable[] = []): string {
  let out = text;

  // Patterns first, and in this order: an address holds dots and letters that
  // the number rules would otherwise chew through halfway.
  out = out.replace(URL, '{link}');
  out = out.replace(EMAIL, '{email}');
  out = out.replace(PHONE, '{phone}');
  out = out.replace(LONG_NUMBER, '{number}');

  // Then everybody in the address book, longest first, so "Sara Haddad" is
  // one {name} rather than "{name} Haddad".
  const named = new Set<string>();
  for (const contact of contacts) {
    const full = contact.name.trim();
    if (full.length > TOO_SHORT) named.add(full);
    const first = firstNameOf(contact);
    if (first.length > TOO_SHORT) named.add(first);
  }
  for (const name of [...named].sort((a, b) => b.length - a.length)) {
    out = /[؀-ۿ]/.test(name) ? out.replace(arg(escapeRegExp(name)), '{name}') : out.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi'), '{name}');
  }

  // And the name the sentence is shaped around, saved or not: "call Ahmed"
  // names Ahmed whether or not anybody by that name is in People.
  for (let i = 0; i < 4; i++) {
    const guess = candidateName(out);
    if (!guess || guess.word.length <= TOO_SHORT) break;
    const before = out;
    out = guess.script === 'arabic' ? out.replace(arg(escapeRegExp(guess.word)), '{name}') : out.replace(new RegExp(`\\b${escapeRegExp(guess.word)}\\b`, 'gi'), '{name}');
    if (out === before) break;
  }

  return out.replace(/\s{2,}/g, ' ').trim();
}

/** Latin words that open a sentence and are not somebody's name. */
const SENTENCE_START = /^(?:what|who|when|where|why|how|which|is|are|do|does|did|can|could|should|would|will|i|my|the|a|an|call|email|message|text|send|remind|add|show|give|find|tell|get|book|pay|renew)\b/i;

/**
 * Whether what is left looks safe to keep.
 *
 * The redactor is exact on patterns and best-effort on names, so the caller
 * needs a way to say "I am not sure about this one". A leftover capitalised
 * word that is not a placeholder and did not open the sentence is the shape a
 * missed name has, and a sentence carrying one is dropped rather than logged:
 * a phrasing nobody sees costs a lesson, and a name nobody consented to share
 * costs more.
 */
export function fullyRedacted(text: string): boolean {
  const withoutPlaceholders = text.replace(/\{(?:link|email|phone|number|name)\}/g, ' ');
  const words = withoutPlaceholders.split(/[\s,.;:!?؟،؛]+/).filter(Boolean);
  return !words.some((word, i) => /^[A-Z][a-z]{2,}$/.test(word) && !(i === 0 && SENTENCE_START.test(word)));
}

/** True when nothing worth learning from is left — all placeholders and punctuation. */
export function tooBare(text: string): boolean {
  const left = text.replace(/\{(?:link|email|phone|number|name)\}/g, ' ').replace(/[\s,.;:!?؟،؛0-9٠-٩]+/g, '');
  return left.length < 3;
}

/**
 * Normalised for counting: the same question asked twice is one row with a 2
 * on it. Punctuation and the apostrophe go — "what's next" and "whats next"
 * are one person's typing habit apart — but the words themselves do not, so
 * "what's next" and "what is next" stay two phrasings worth seeing.
 */
export function phrasingKey(text: string): string {
  return normalizeArabic(text.toLowerCase())
    .replace(/[.,;:!?؟،؛'’]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

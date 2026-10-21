/**
 * How people really ask Sanad, kept so Sanad can be taught what it missed.
 *
 * `./events.ts` holds the line that no analytics event may carry free text,
 * and that line stays where it is: this is a separate queue, a separate
 * table and a separate thing to declare. What it carries is not what somebody
 * wrote — it is what is left of it after `src/lib/parse/redact.ts` has taken
 * the names, numbers and addresses out **on the device**. The raw sentence
 * never leaves the phone.
 *
 * What is kept is the sentence's shape and what Sanad made of it, because
 * that pair is the whole of what improves a parser:
 *
 *     "مين لازم ارد على {name}؟"   → waiting      ✓ understood
 *     "ايه اللي اتعمل امبارح؟"      → unknown      ✗ a lesson
 *
 * The unknown ones are the point. A phrasing nobody could answer is a row in
 * `src/lib/parse/phrasings.test.ts` waiting to be written.
 * BUILD-REVIEW §2.114.
 */
import { outbox } from '../outbox';
import { fullyRedacted, redact, tooBare, type Redactable } from '../parse/redact';

/**
 * What Sanad did with the sentence.
 *
 * The data answers are `askData`'s own kinds; the rest are the other things
 * the Assistant can do with a line. `unknown` is the one worth reading: it
 * means the sentence reached the end of every rule and matched none of them.
 */
export const VERDICTS = [
  'person',
  'tasks',
  'next',
  'waiting',
  'quiet',
  'oneThing',
  'history',
  'withPerson',
  'findTask',
  'people',
  'log',
  'who',
  'nobody',
  'task',
  'dump',
  'contact',
  'attach',
  'smalltalk',
  'unknown',
] as const;

export type Verdict = (typeof VERDICTS)[number];

/** How the sentence arrived. A chip is the app's own words and teaches nothing. */
export const SOURCES = ['typed', 'spoken', 'chip', 'intro'] as const;
export type PhrasingSource = (typeof SOURCES)[number];

export type QueuedPhrasing = {
  /** Redacted on the device. Never what was typed. */
  text: string;
  verdict: Verdict;
  source: PhrasingSource;
  /** 'en' | 'ar', and the dialect separately: Egyptian is a second axis. */
  lang: string;
  dialect: string;
  at: string;
};

/**
 * A fortnight of heavy use. Smaller than the analytics cap because a phrasing
 * is a sentence rather than a name and a number, and a device offline for a
 * month must not fill its storage with them.
 */
export const MAX_QUEUED_PHRASINGS = 200;

const queue = outbox<QueuedPhrasing>('ot.phrasingQueue', MAX_QUEUED_PHRASINGS);

export const readPhrasingQueue = queue.read;
export const dropSentPhrasings = queue.dropSent;
export const clearPhrasingQueue = queue.clear;

export type NotePhrasing = {
  text: string;
  verdict: Verdict;
  source: PhrasingSource;
  lang: string;
  dialect: string;
  contacts: readonly Redactable[];
  at?: string;
};

/**
 * What would be queued for this sentence, or null for one that must not be.
 *
 * Pure, so the three reasons to drop a line can be tested without a device:
 *
 *   - **the app's own words.** A chip sends a sentence this app wrote. It is
 *     already in the phrasebook, and counting it would drown the sentences
 *     people actually chose in ones they only tapped.
 *   - **not safely redacted.** `fullyRedacted` is the device saying it is not
 *     sure it caught every name. A lesson lost costs less than a name shared.
 *   - **nothing left to learn from.** "{name} {phone}" has no shape in it.
 */
export function phrasingToQueue(note: NotePhrasing): QueuedPhrasing | null {
  if (note.source === 'chip' || note.source === 'intro') return null;
  const text = redact(note.text, note.contacts);
  if (!fullyRedacted(text) || tooBare(text)) return null;
  return { text, verdict: note.verdict, source: note.source, lang: note.lang, dialect: note.dialect, at: note.at ?? new Date().toISOString() };
}

/**
 * Records how somebody asked. Never awaited by a screen, and never allowed to
 * throw: a lesson that fails to store must not change what the user sees.
 */
export function notePhrasing(note: NotePhrasing): void {
  const row = phrasingToQueue(note);
  if (row) queue.add(row).catch(() => {});
}

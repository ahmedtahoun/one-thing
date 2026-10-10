/**
 * The contract between the app's free-text screens and the `assist` edge
 * function — one file both sides import, so they cannot drift apart.
 *
 *   POST /functions/v1/assist  AssistRequest  →  AssistResponse
 *
 * No imports: it runs in the app (React Native), in the edge function
 * (Deno) and in the tests (Node) alike. The app's own types in
 * src/lib/parse/types.ts are checked against these at compile time
 * (src/lib/parse/remote.ts).
 *
 * Everything that comes back from the model goes through `readResult`
 * before it reaches a person, on the server and again in the app: the
 * Assistant may only ever say what these shapes can hold
 * (BUILD-REVIEW.md §2.34).
 */

export type AssistOp = 'parse' | 'split' | 'interpret';
export type AssistLang = 'en' | 'ar';
export type AssistTaskType = 'call' | 'email' | 'whatsapp' | 'reminder';

export type AssistRequest = {
  op: AssistOp;
  text: string;
  lang: AssistLang;
  /** The person's "now", as an ISO instant. */
  now: string;
  /** Their IANA time zone, so "tomorrow at 10" means their 10 o'clock. */
  timeZone: string;
};

export type AssistTask = {
  type: AssistTaskType;
  title: string;
  who: string | null;
  contactId: string | null;
  /** An ISO instant. */
  when: string;
};

export type AssistIntent = { kind: 'task'; task: AssistTask } | { kind: 'plan' } | { kind: 'followups' };

export type AssistResult = AssistTask | AssistTask[] | AssistIntent;

export type AssistResponse =
  | { result: AssistResult }
  /** `limit`: the Free plan's 10 Assistant requests are used up today. */
  | { error: 'limit' | 'unauthorised' | 'bad_request' | 'unavailable' };

/** The Free plan's daily Assistant requests — must equal src/policy/entitlements.ts. */
export const FREE_ASSISTANT_REQUESTS_PER_DAY = 10;

/**
 * Quick capture and Brain dump are open on every plan; this only stops one
 * account from running up the Claude bill. It is not a product limit and is
 * never shown — BUILD-REVIEW.md §2.38.
 */
export const PARSE_REQUESTS_PER_DAY = 200;

export const MAX_TEXT = 2000;
const MAX_TASKS = 20;
const MAX_TITLE = 200;
const TYPES: readonly AssistTaskType[] = ['call', 'email', 'whatsapp', 'reminder'];

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInstant = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(x) && !Number.isNaN(Date.parse(x));

function validTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** A request as sent, or null when it is not one. */
export function readRequest(x: unknown): AssistRequest | null {
  if (!isObject(x)) return null;
  const { op, text, lang, now, timeZone } = x;
  if (op !== 'parse' && op !== 'split' && op !== 'interpret') return null;
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT) return null;
  if (lang !== 'en' && lang !== 'ar') return null;
  if (!isInstant(now)) return null;
  if (typeof timeZone !== 'string' || !validTimeZone(timeZone)) return null;
  return { op, text, lang, now, timeZone };
}

/**
 * One task, or null when it is not one. A contact ID is kept only when it is
 * one of the person's own (`contactIds`); anything else is dropped rather
 * than trusted, and the name stays.
 */
export function readTask(x: unknown, contactIds?: ReadonlySet<string>): AssistTask | null {
  if (!isObject(x)) return null;
  const { type, title, who, contactId, when } = x;
  if (typeof type !== 'string' || !TYPES.includes(type as AssistTaskType)) return null;
  if (typeof title !== 'string' || !title.trim()) return null;
  if (who !== null && typeof who !== 'string') return null;
  if (contactId !== null && typeof contactId !== 'string') return null;
  if (!isInstant(when)) return null;
  const linked = typeof contactId === 'string' && (!contactIds || contactIds.has(contactId)) ? contactId : null;
  return {
    type: type as AssistTaskType,
    title: title.trim().slice(0, MAX_TITLE),
    who: typeof who === 'string' && who.trim() ? who.trim() : null,
    contactId: linked,
    when: new Date(when).toISOString(),
  };
}

/** The result for `op`, or null when the model's output is not one. */
export function readResult(op: AssistOp, x: unknown, contactIds?: ReadonlySet<string>): AssistResult | null {
  if (op === 'parse') return readTask(x, contactIds);
  if (op === 'split') {
    const list = isObject(x) && Array.isArray(x.tasks) ? x.tasks : Array.isArray(x) ? x : null;
    if (!list) return null;
    const tasks = list.slice(0, MAX_TASKS).map((t) => readTask(t, contactIds));
    return tasks.every((t): t is AssistTask => t !== null) ? tasks : null;
  }
  if (!isObject(x)) return null;
  if (x.kind === 'plan' || x.kind === 'followups') return { kind: x.kind };
  if (x.kind === 'task') {
    const task = readTask(x.task, contactIds);
    return task ? { kind: 'task', task } : null;
  }
  return null;
}

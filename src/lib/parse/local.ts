/**
 * The on-device parser: rules, not a model. It exists so the three screens
 * can be built and tested before the backend does; it is not the product.
 *
 * It starts from the prototype's `parse()` (source/app-logic.js) — the same
 * keywords, the same 17:00 default, the same brain-dump splitting — and fixes
 * what made that a stub rather than a parser:
 *
 *   - people come from People, not two hard-coded names;
 *   - "10:30", "3pm" and "at 4" are read, and a bare hour before 7 is taken
 *     as the afternoon ("pay the invoice by 5" is 17:00, not 05:00);
 *   - Arabic-Indic digits are read as digits;
 *   - the title drops "remind me to", the day and the time instead of keeping
 *     them and cutting off at 46 characters;
 *   - "follow up" inside a task no longer reads as a question about follow-ups.
 */
import type { AssistantIntent, ParseContext, ParsedTask, ParsedType, TextParser } from './types';

/** ٠١٢٣٤٥٦٧٨٩ → 0123456789, so times written in Arabic digits are read. */
export function westernDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

const TYPE_RULES: [ParsedType, RegExp][] = [
  ['call', /\bcall\b|\bring\b|\bphone\b|اتصل|أتصل|كلم|كلّم/i],
  ['email', /\be-?mail\b|\bmail\b|إيميل|ايميل|البريد/i],
  ['whatsapp', /whatsapp|\bmessage\b|\btext\b|\breply\b|\bsend\b|واتس|رسال|أرسل|ارسل|أرد|ارد/i],
];

export function typeOf(text: string): ParsedType {
  for (const [type, rule] of TYPE_RULES) if (rule.test(text)) return type;
  return 'reminder';
}

const TOMORROW = /\btomorrow\b|بكرة|بكره|باكر/i;

/**
 * The time of day, as [hours, minutes], or null when none is written.
 * Tried in order of how sure the reading is.
 */
export function timeOf(text: string): [number, number] | null {
  const t = westernDigits(text);
  const clock = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(t);
  if (clock) return [Number(clock[1]), Number(clock[2])];

  const meridiem = /\b(1[0-2]|0?[1-9])\s*(am|pm|a\.m\.|p\.m\.)/i.exec(t);
  if (meridiem) {
    const h = Number(meridiem[1]) % 12;
    return [/^p/i.test(meridiem[2] ?? '') ? h + 12 : h, 0];
  }

  // "at 4", "by 5", "الساعة 10", or — as the prototype does — the first
  // one- or two-digit number on its own.
  const bare = /(?:\bat\s+|\bby\s+|الساعة\s*)(\d{1,2})\b/i.exec(t) ?? /(?<![\d.,%$])\b(\d{1,2})\b(?![\d%])/.exec(t);
  if (!bare) return null;
  const h = Number(bare[1]);
  if (h > 23) return null;
  // Nobody means 05:00 by "by 5". Before 7 is read as the afternoon.
  return [h >= 1 && h < 7 ? h + 12 : h, 0];
}

/** The prototype's default when no time is said. */
const DEFAULT_TIME: [number, number] = [17, 0];

export function whenOf(text: string, now: Date): string {
  const d = new Date(now);
  if (TOMORROW.test(text)) d.setDate(d.getDate() + 1);
  const [h, m] = timeOf(text) ?? DEFAULT_TIME;
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** Escapes a name for use inside a RegExp. */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The person a sentence is about: the first contact whose first name appears
 * in it as a word. Arabic attaches prepositions to names ("لمحمد", "بسارة"),
 * so a single leading ل / ب / و is allowed.
 */
export function whoOf(text: string, contacts: ParseContext['contacts']) {
  for (const c of contacts) {
    const first = c.name.trim().split(/\s+/)[0] ?? '';
    if (first.length < 3) continue;
    const latin = /^[\x00-\x7F]+$/.test(first);
    const rule = latin
      ? new RegExp(`\\b${escape(first)}\\b`, 'i')
      : new RegExp(`(^|[\\s،,])[لبو]?${escape(first)}($|[\\s،,.])`);
    if (rule.test(text)) return { who: c.name, contactId: c.id };
  }
  return { who: null, contactId: null };
}

const REMIND_ME = /^\s*(please\s+)?remind me(\s+to\b)?\s*|^\s*(ذكّرني|ذكرني)\s*/i;
const DAY_AND_TIME =
  /\b(tomorrow|today)\b|\b(at|by)\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b|\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\b\d{1,2}:\d{2}\b|بكرة|بكره|باكر|اليوم|(قبل\s+)?الساعة\s*\d{1,2}/gi;

/**
 * What to do, as the person will read it: "Remind me tomorrow at 10 to send
 * Mohammed the quote" → "Send Mohammed the quote".
 */
export function titleOf(text: string): string {
  const original = text.trim().replace(/[.。]+$/, '');
  const cleaned = westernDigits(original)
    .replace(REMIND_ME, '')
    .replace(DAY_AND_TIME, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*(to|and)\s+/i, '')
    .replace(/\s+(to|and|و)$/i, '')
    .trim();
  const title = cleaned || original;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * The prototype's brain-dump splitter — new lines, full stops, commas
 * (Latin and Arabic), semicolons and "then" — keeping pieces longer than two
 * characters.
 */
export function splitDump(text: string): string[] {
  return text
    .split(/\n|[.،,;؛]|\band then\b|\bthen\b/i)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 2);
}

const PLAN = /\b(arrange|plan)\b.*\b(day|today|my)\b|رتّب|رتب/i;
const FOLLOW_UPS = /\bwaiting\b|\bfollow-?ups\b|ينتظر|أنتظر|انتظر|المتابعات/i;

export function intentOf(text: string): 'plan' | 'followups' | 'task' {
  if (PLAN.test(text)) return 'plan';
  if (FOLLOW_UPS.test(text)) return 'followups';
  return 'task';
}

function parseNow(text: string, ctx: ParseContext): ParsedTask {
  return {
    type: typeOf(text),
    title: titleOf(text),
    ...whoOf(text, ctx.contacts),
    when: whenOf(text, ctx.now),
  };
}

export const localParser: TextParser = {
  async parse(text, ctx) {
    return parseNow(text, ctx);
  },
  async split(text, ctx) {
    return splitDump(text).map((piece) => parseNow(piece, ctx));
  },
  async interpret(text, ctx): Promise<AssistantIntent> {
    const kind = intentOf(text);
    return kind === 'task' ? { kind, task: parseNow(text, ctx) } : { kind };
  },
};

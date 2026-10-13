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
 *
 * And, since the app is used in Arabic as much as English, it reads the way
 * people write: Egyptian (النهارده, بعد بكره, ابعت, فكرني, خمسة ونص العصر) as
 * well as Gulf and standard Arabic, with the spelling variants mixed freely;
 * the day a task is for (today, tomorrow, the day after, a weekday) and the
 * part of the day ("tomorrow morning", "tonight", "بالليل", "العصر").
 */
import { ar, arw, AR_LETTER, firstNameOf, mentions } from './names';
import type { AssistantIntent, ParseContext, ParsedTask, ParsedType, TextParser } from './types';

export { firstNameOf, mentions };

/** ٠١٢٣٤٥٦٧٨٩ → 0123456789, so times written in Arabic digits are read. */
export function westernDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

// --- what kind of task ---------------------------------------------------

const TYPE_RULES: [ParsedType, RegExp][] = [
  [
    'call',
    new RegExp(
      '\\bcall\\b|\\bring\\b|\\bphone\\b|' +
        // اتصل, كلم (and هكلم / اكلم / كلمها — but not كلمة, a word), رن (alone: not برنامج), تليفون / تلفون
        'اتصل|أتصل|تليفون|تلفون|' +
        `(?<![${AR_LETTER}])(?:ا|أ|ه|ب|ع|ل|س)?(?:كلم|كلّم)(?:ي|ه|ها|هم|ني)?(?![${AR_LETTER}])|` +
        `(?<![${AR_LETTER}])رن(?![${AR_LETTER}])`,
      'i'
    ),
  ],
  ['email', new RegExp('\\be-?mail\\b|\\bmail\\b|إيميل|ايميل|اميل|البريد|' + `(?<![${AR_LETTER}])ا?ل?ميل(?![${AR_LETTER}])`, 'i')],
  [
    'whatsapp',
    // ابعت / بعت / هبعت (Egyptian "send"), ارسل / أرسل, واتس, رسالة
    /whatsapp|\bmessage\b|\btext\b|\breply\b|\bsend\b|واتس|رسال|أرسل|ارسل|بعت|أرد|ارد/i,
  ],
];

export function typeOf(text: string): ParsedType {
  for (const [type, rule] of TYPE_RULES) if (rule.test(text)) return type;
  return 'reminder';
}

// --- the day -------------------------------------------------------------

const DAY_AFTER = new RegExp(`${'day after tomorrow'}|${ar('(?<![' + AR_LETTER + '])بعد\\s+(?:بكره|باكر|غد)').source}`, 'i');
const TOMORROW = new RegExp('\\btomorrow\\b|' + arw('بكره|باكر|غدا|غد').source, 'i');
const TODAY = new RegExp(
  '\\btoday\\b|\\btonight\\b|\\bthis (?:morning|afternoon|evening)\\b|' + arw('اليوم|النهارده|انهارده|النهاردا|الليله|بالليل').source,
  'i'
);

const WEEKDAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
/** Index = Date#getDay(): Sunday first. Egyptian spellings (الاتنين, التلات, الحد) alongside the standard ones. */
const WEEKDAYS_AR = [
  arw('الاحد|الحد'),
  arw('الاتنين|الاثنين'),
  arw('التلات|الثلاثاء|التلاتاء|الثلاثا'),
  arw('الاربع|الاربعاء|الاربعا'),
  arw('الخميس'),
  arw('الجمعه|الجمعا'),
  arw('السبت'),
];

/**
 * The day a sentence is about, and whether it said so. A weekday means its
 * next occurrence, never today ("Monday" on a Monday is next week).
 */
export function dayOf(text: string, now: Date): { date: Date; said: boolean } {
  const date = new Date(now);
  const move = (days: number) => {
    date.setDate(date.getDate() + days);
    return { date, said: true };
  };
  if (DAY_AFTER.test(text)) return move(2);
  if (TOMORROW.test(text)) return move(1);
  if (TODAY.test(text)) return { date, said: true };
  for (let day = 0; day < 7; day++) {
    const english = new RegExp(`\\b${WEEKDAYS_EN[day]}\\b`, 'i');
    if (english.test(text) || WEEKDAYS_AR[day]?.test(text)) return move(((day - now.getDay() + 7) % 7) || 7);
  }
  return { date, said: false };
}

// --- the time ------------------------------------------------------------

// Raw sources (plain letters), expanded for spelling variants exactly once, where each pattern is built.
const PM_SRC = 'العصر|المغرب|مساء|المسا|بالليل|الليل|الليله|بعد الضهر|بعد الظهر|الضهر|الظهر|عشيه';
const AM_SRC = 'الصبح|الصباح|صباحا|بدري|الفجر';
const PM_WORDS = arw(PM_SRC);
const AM_WORDS = arw(AM_SRC);

/** Hours as Egyptian and standard Arabic say them: "الساعة خمسة", "تلاتة ونص". */
const HOUR_WORDS: Record<string, number> = {
  واحده: 1, اتنين: 2, اثنين: 2, اثنتين: 2, تلاته: 3, ثلاثه: 3, اربعه: 4, خمسه: 5, سته: 6, سبعه: 7,
  تمانيه: 8, ثمانيه: 8, تسعه: 9, عشره: 10, احداشر: 11, حداشر: 11, اتناشر: 12, اثناعشر: 12,
};
const HOUR_WORD_SOURCE = Object.keys(HOUR_WORDS).join('|');
const HOUR = `(\\d{1,2}|${HOUR_WORD_SOURCE})`;
const FRACTION = `(?:\\s*و\\s*(?:نص|نصف|ربع|ثلث|تلت)|\\s*(?:الا|إلا)\\s*(?:ربع|ثلث|تلت))`;
/** "الساعة خمسة ونص", "الساعة 5". */
const O_CLOCK = ar(`(?:الساعه|ساعه)\\s*(?:ال)?${HOUR}`);
/** "خمسة العصر", "5 الصبح": an hour only counts without الساعة when a part of the day follows. */
const HOUR_AND_PART = ar(`${HOUR}(?:${FRACTION})?\\s*(?:${PM_SRC}|${AM_SRC})`);

function hourValue(token: string): number {
  if (/^\d+$/.test(token)) return Number(token);
  const folded = token.replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  return HOUR_WORDS[folded] ?? NaN;
}

/** The hour and minutes after an hour word: "ونص" +30, "وربع" +15, "إلا ربع" -15. */
function withFraction(hour: number, after: string): [number, number] {
  const tail = after.slice(0, 20);
  if (/^\s*و\s*(?:نص|نصف)/.test(tail)) return [hour, 30];
  if (/^\s*و\s*ربع/.test(tail)) return [hour, 15];
  if (/^\s*و\s*(?:ثلث|تلت)/.test(tail)) return [hour, 20];
  if (/^\s*(?:الا|إلا)\s*ربع/.test(tail)) return [hour - 1, 45];
  if (/^\s*(?:الا|إلا)\s*(?:ثلث|تلت)/.test(tail)) return [hour - 1, 40];
  return [hour, 0];
}

/** Moves a bare hour into the half of the day the sentence names. */
function inPeriod(hour: number, text: string): number {
  if (PM_WORDS.test(text) && hour < 12) return hour + 12;
  if (AM_WORDS.test(text)) return hour === 12 ? 0 : hour;
  // Nobody means 05:00 by "by 5". Before 7 is read as the afternoon.
  return hour >= 1 && hour < 7 ? hour + 12 : hour;
}

function arabicClock(text: string): [number, number] | null {
  const direct = O_CLOCK.exec(text);
  const withPart = direct ? null : HOUR_AND_PART.exec(text);
  const found = direct ?? withPart;
  if (!found || found[1] === undefined) return null;
  const hour = hourValue(found[1]);
  if (!Number.isFinite(hour) || hour < 1 || hour > 23) return null;
  const rest = text.slice(found.index + (direct ? found[0].length : found[1].length));
  const [h, m] = withFraction(hour, rest);
  return [inPeriod(h, direct ? text : found[0]) % 24, m];
}

/**
 * The time of day, as [hours, minutes], or null when none is written.
 * Tried in order of how sure the reading is.
 */
export function timeOf(text: string): [number, number] | null {
  const t = westernDigits(text);
  const clock = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(t);
  if (clock) {
    const hour = Number(clock[1]);
    return [PM_WORDS.test(t) && hour >= 1 && hour < 12 ? hour + 12 : hour, Number(clock[2])];
  }

  const meridiem = /\b(1[0-2]|0?[1-9])\s*(am|pm|a\.m\.|p\.m\.)/i.exec(t);
  if (meridiem) {
    const h = Number(meridiem[1]) % 12;
    return [/^p/i.test(meridiem[2] ?? '') ? h + 12 : h, 0];
  }

  const arabic = arabicClock(t);
  if (arabic) return arabic;

  // "at 4", "by 5", or — as the prototype does — the first one- or two-digit
  // number on its own.
  const bare = /(?:\bat\s+|\bby\s+)(\d{1,2})\b/i.exec(t) ?? /(?<![\d.,%$])\b(\d{1,2})\b(?![\d%])/.exec(t);
  if (!bare) return null;
  const h = Number(bare[1]);
  if (h > 23) return null;
  return [inPeriod(h, t), 0];
}

/** The hour a part of the day stands for when no hour is given: "tomorrow morning" → 09:00. */
export function partOf(text: string): [number, number] | null {
  if (/\btonight\b|\bnight\b/i.test(text) || arw('الليله|بالليل|الليل').test(text)) return [20, 0];
  if (/\bevening\b/i.test(text) || arw('المسا|مساء|المغرب').test(text)) return [18, 0];
  if (arw('بعد الضهر|بعد الظهر').test(text) || /\bafternoon\b/i.test(text)) return [15, 0];
  if (arw('العصر').test(text)) return [16, 0];
  if (/\b(?:noon|midday)\b/i.test(text) || arw('الضهر|الظهر').test(text)) return [12, 0];
  if (/\bmorning\b/i.test(text) || arw('الصبح|الصباح|صباحا|بدري').test(text)) return [9, 0];
  return null;
}

/** The prototype's default when no time is said. */
const DEFAULT_TIME: [number, number] = [17, 0];

export function whenOf(text: string, now: Date): string {
  const d = dayOf(text, now).date;
  const [h, m] = timeOf(text) ?? partOf(text) ?? DEFAULT_TIME;
  // "Tonight at 9" is 21:00, though "at 9" alone is the morning.
  const evening =
    /\b(?:tonight|evening)\b/i.test(text) && !/\b(?:am|pm)\b/i.test(text) && timeOf(text) !== null && h >= 1 && h < 12;
  d.setHours(evening ? h + 12 : h, m, 0, 0);
  return d.toISOString();
}

// --- who -----------------------------------------------------------------

/** The person a sentence is about: the first contact whose first name appears in it. */
export function whoOf(text: string, contacts: ParseContext['contacts']) {
  for (const c of contacts) {
    if (mentions(text, firstNameOf(c))) return { who: c.name, contactId: c.id };
  }
  return { who: null, contactId: null };
}

// --- the title -----------------------------------------------------------

const REMIND_ME =
  /^\s*(please\s+)?remind me(\s+to\b)?\s*|^\s*(?:ذكّرني|ذكرني|ذكريني|فكّرني|فكرني|فكريني|نبّهني|نبهني)\s*(?:ان|إني|اني|أن)?\s*/i;

/** Everything that says when, so the title can be what to do and nothing else. */
const WHEN_PHRASES = [
  /\b(?:tomorrow|today|tonight|day after tomorrow)\b/gi,
  /\bthis (?:morning|afternoon|evening)\b|\b(?:morning|afternoon|evening|noon)\b/gi,
  /\b(?:next\s+|on\s+)?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
  /\b(at|by)\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b|\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\b\d{1,2}:\d{2}\b/gi,
  // Arabic: an o'clock with its fraction and part of the day, then the bare parts and days.
  ar(`(?:قبل\\s+|على\\s+|عند\\s+)?(?:الساعه|ساعه)\\s*(?:ال)?${HOUR}(?:${FRACTION})?(?:\\s*(?:${PM_SRC}|${AM_SRC}))?`, 'gi'),
  ar(`${HOUR}(?:${FRACTION})?\\s*(?:${PM_SRC}|${AM_SRC})`, 'gi'),
  new RegExp(
    [
      'بعد\\s+(?:بكره|باكر|غد)',
      '(?:يوم\\s+)?(?:بكره|باكر|غدا|اليوم|النهارده|انهارده|الليله|بالليل|الصبح|الضهر|العصر|المغرب|المسا)',
      '(?:يوم\\s+)?(?:الاحد|الاتنين|الاثنين|التلات|الثلاثاء|الاربع|الاربعاء|الخميس|الجمعه|السبت)',
    ]
      .map((rule) => arw(rule, true, 'gi').source)
      .join('|'),
    'gi'
  ),
];

/**
 * What to do, as the person will read it: "Remind me tomorrow at 10 to send
 * Mohammed the quote" → "Send Mohammed the quote".
 */
export function titleOf(text: string): string {
  const original = text.trim().replace(/[.。]+$/, '');
  let cleaned = westernDigits(original).replace(REMIND_ME, '');
  for (const phrase of WHEN_PHRASES) cleaned = cleaned.replace(phrase, ' ');
  cleaned = cleaned
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

const PLAN =
  /\b(arrange|plan)\b.*\b(day|today|my)\b|\bwhat(?:'|’)?s (?:on|up)(?: my (?:list|plate|agenda|schedule))?(?: today)?\b|\bwhat do i have (?:today|on)\b|\bmy (?:day|schedule|agenda)\b|\btoday(?:'|’)?s (?:tasks|plan|list)\b|رتّب|رتب|نظم يومي|نظّم يومي|عندي ايه|عندي إيه|عندي ايش|عندي شنو|مهامي|جدول يومي|خطه اليوم|خطة اليوم/i;
const FOLLOW_UPS = /\bwaiting\b|\bfollow-?ups\b|ينتظر|أنتظر|انتظر|المتابعات|مستني|مستنى|مستنين|مردش|ما ردش/i;

export function intentOf(text: string): 'plan' | 'followups' | 'task' {
  if (PLAN.test(text) && !/\bremind\b|فكرني|ذكرني|نبهني/i.test(text)) return 'plan';
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

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
import { ar, arg, arw, arx, AR_LETTER, firstNameOf, mentions } from './names';
import { loopOf, type Loop } from './promise';
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

/** "Remind me…": said to oneself, even when it mentions sending something. */
const REMIND_SELF = /\bremind me\b|ذكرني|ذكّرني|ذكريني|فكرني|فكّرني|نبهني|نبّهني|تذكرني|تفكرني/i;

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
    const minutes = Number(clock[2]);
    if (/\ba\.?m\.?\b/i.test(t) || AM_WORDS.test(t)) return [hour === 12 ? 0 : hour, minutes];
    if (/\bp\.?m\.?\b/i.test(t) || PM_WORDS.test(t)) return [hour >= 1 && hour < 12 ? hour + 12 : hour, minutes];
    // Said with no half of the day named, so read as a bare hour is: before
    // seven is the afternoon. "at 4:30" is half four, not dawn.
    return [inPeriod(hour, t), minutes];
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

// --- in an hour ------------------------------------------------------------

/**
 * "In an hour", "in 30 minutes", "كمان ساعة", "بعد نص ساعة", "بعد ساعتين":
 * a time counted from now rather than read off a clock. These came through
 * as the whole sentence for a title and 17:00 for a time (found on a phone),
 * because nothing here read them.
 */
const EN_REL =
  /\bin\s+(?:(half an?|a half)\s+hour|(an?|one|\d+(?:\.\d+)?)\s+(?:hours?|hrs?)(\s+and\s+a\s+half)?|(\d+)\s*(?:minutes?|mins?))\b/i;
const AR_REL_SRC =
  '(?:كمان|بعد)\\s+(?:(ساعه\\s+ونص|ساعه\\s+و\\s*نص)|(نص\\s+ساعه)|(ربع\\s+ساعه)|((?:ثلث|تلت)\\s+ساعه)|(ساعتين)|(\\d+)\\s*(?:ساعات|ساعه)|(ساعه)|(دقيقتين)|(\\d+)\\s*(?:دقايق|دقائق|دقيقه))';
const AR_REL = ar(AR_REL_SRC);

/** Minutes from now the sentence asks for, or null when it names no such span. */
export function relativeMinutes(text: string): number | null {
  const t = westernDigits(text);
  const en = EN_REL.exec(t);
  if (en) {
    if (en[1]) return 30;
    if (en[2]) {
      const n = /^\d/.test(en[2]) ? Number(en[2]) : 1;
      return Math.round(n * 60 + (en[3] ? 30 : 0));
    }
    if (en[4]) return Number(en[4]);
  }
  const a = AR_REL.exec(t);
  if (a) {
    if (a[1]) return 90;
    if (a[2]) return 30;
    if (a[3]) return 15;
    if (a[4]) return 20;
    if (a[5]) return 120;
    if (a[6]) return Number(a[6]) * 60;
    if (a[7]) return 60;
    if (a[8]) return 2;
    if (a[9]) return Number(a[9]);
  }
  return null;
}

/** The prototype's default when no time is said. */
const DEFAULT_TIME: [number, number] = [17, 0];

export function whenOf(text: string, now: Date): string {
  const later = relativeMinutes(text);
  if (later !== null) {
    const at = new Date(now.getTime() + later * 60_000);
    at.setSeconds(0, 0);
    return at.toISOString();
  }
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

/**
 * How people start a sentence to an assistant before saying the task: "I
 * want to", "can you", "عايز تفكرني", "ممكن تذكرني". Taken off the front, as
 * many times as they are stacked ("can you remind me to …").
 */
const LEAD_IN_EN =
  /^\s*(?:please|pls|hey|ok(?:ay)?|can you|could you|would you|will you|i want to|i wanna|i need to|i have to|i've got to|i gotta|i should|i must|i'd like to|let me|remind me(?:\s+to)?|don't let me forget to|make sure i)\b[\s,]*/i;
const LEAD_IN_AR = new RegExp(
  `^\\s*${arx('(?:لو سمحت|من فضلك|ممكن|عايزك|عاوزك|عايزه|عاوزه|عايز|عاوز|ابغاك|ابيك|ابغى|ابي|ودي|لازم|محتاج|محتاجه|تقدر|ياريت|يا ريت|تفكرني|تذكرني|فكرني|ذكرني|فكريني|ذكريني|نبهني|انك|انى|اني|ان)')}(?![${AR_LETTER}])[\\s،,]*`,
  'i'
);

/** "أكلم عبد" reads as "I call Abd"; a task is written as what to do: "كلم عبد". */
const FIRST_PERSON: [RegExp, string][] = [
  [ar('^(?:ا)كلم(?![\\u0621-\\u064A])'), 'كلم'],
  [ar('^(?:ا)راسل(?![\\u0621-\\u064A])'), 'راسل'],
  [ar('^(?:ا)تابع(?![\\u0621-\\u064A])'), 'تابع'],
  [ar('^(?:ا)شوف(?![\\u0621-\\u064A])'), 'شوف'],
  [ar('^(?:ا)خلص(?![\\u0621-\\u064A])'), 'خلّص'],
  [ar('^(?:ا)جهز(?![\\u0621-\\u064A])'), 'جهّز'],
  [ar('^(?:ا)رد(?![\\u0621-\\u064A])'), 'رد'],
];

/** "بايميل ستفني" — "by email, Stephany": the channel without its "by". */
const BY_CHANNEL = ar('^ب(?=(?:ال)?(?:ايميل|اميل|رساله|واتس))');

const EN_REPHRASE: [RegExp, string][] = [
  [/^send (?:an? )?e-?mail (?:to|for) /i, 'Email '],
  [/^send (?:a )?(?:message|text|whatsapp) (?:to|for) /i, 'Message '],
  [/^give (\S+) a call\b/i, 'Call $1'],
  [/^make a call to /i, 'Call '],
];

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
  for (let before = ''; before !== cleaned; ) {
    before = cleaned;
    cleaned = cleaned.replace(LEAD_IN_EN, '').replace(LEAD_IN_AR, '').replace(REMIND_ME, '');
  }
  cleaned = cleaned.replace(new RegExp(EN_REL.source, 'gi'), ' ').replace(ar(AR_REL_SRC, 'gi'), ' ');
  for (const phrase of WHEN_PHRASES) cleaned = cleaned.replace(phrase, ' ');
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/^\s*(to|and)\s+/i, '')
    // Taking the when out leaves the word that introduced it: "Book the
    // dentist for", "Send the deck by", "Call Sara in the". Trimmed until
    // nothing dangles — "at eight in the evening" leaves two words, not one
    // — and if that empties the title the original is used instead.
    .replace(/(?:\s+(?:to|and|at|by|on|in|for|from|the|a|an|around|about|before|after|until|till|و|في|على|من))+\s*$/i, '')
    .trim();
  for (const [rule, to] of FIRST_PERSON) cleaned = cleaned.replace(rule, to);
  cleaned = cleaned.replace(BY_CHANNEL, '');
  for (const [rule, to] of EN_REPHRASE) cleaned = cleaned.replace(rule, to);
  const title = cleaned || original;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Where a *spoken* run of errands breaks.
 *
 * The splitter below was written for typed text and divides on punctuation.
 * Speech to text supplies none — a minute of dictation arrives as one
 * unbroken run of words — so a person who held the mic and listed five
 * errands got one task with the whole minute as its title, and in Arabic
 * that is exactly what happened (BUILD-REVIEW §2.108).
 *
 * The words people join errands with are therefore the only boundaries
 * there are. **"and" alone is never one of them**: "Sara and Omar" is one
 * person and then another, not two errands. So every marker here is either a
 * connective that can only join clauses, or "and" / "و" followed by a verb
 * that opens an errand.
 *
 * Each rule replaces the connective with a newline, which the splitter
 * already divides on, so the connective does not survive into a task title.
 */
const SPOKEN_BREAKS: readonly (readonly [RegExp, string])[] = [
  // Connectives that cannot be anything but a join.
  [/\s+(?:and then|and also|and after that|after that|oh and|and plus|plus)\s+/gi, '\n'],
  [/\s+(?:also|and finally|finally|lastly|one more thing|another thing)\s+/gi, '\n'],
  // "and" or "و" immediately before a verb that starts an errand. The
  // connective is dropped; the verb begins the new piece.
  [
    /\s+and (?=(?:call|ring|phone|email|e-?mail|send|text|message|whatsapp|book|pay|ask|meet|visit|order|check|chase|reply|follow up|remind|buy|collect|confirm)\b)/gi,
    '\n',
  ],
  // Said as an obligation rather than an order: "and I need to book…".
  // "and I promised Layla I'd send the deck" is its own errand — and a
  // promise, which the parser reads differently — so it has to break away
  // from whatever was said before it.
  [/\s+(?:and )?(?=i (?:(?:need|have|must|should) to|promised|told|owe)\b)/gi, '\n'],
  [/\s+(?:and )?(?=(?:don'?t forget|make sure|remind me to)\b)/gi, '\n'],
  // Arabic and Egyptian: the same two shapes. وبعدين، وكمان، وبعد كده are
  // joins; و before a verb is a join with the verb attached to it.
  [arg('\\s+(?:وبعدين|بعدين|وبعد كده|بعد كده|وكمان|كمان|وايضا|وأيضا|وأخيرا|واخيرا)\\s+'), '\n'],
  [
    arg('\\s+و(?=(?:كلم|اتصل|ابعت|أبعت|ارسل|أرسل|احجز|أحجز|ادفع|أدفع|اسأل|أسأل|اشتري|أشتري|قابل|راجع|تابع|رد|ذكرني|فكرني|لازم|محتاج|المفروض|متنساش|ما تنسى))'),
    '\n',
  ],
];

/**
 * The prototype's brain-dump splitter — new lines, full stops, commas
 * (Latin and Arabic), semicolons and "then" — keeping pieces longer than two
 * characters, now with the spoken boundaries above applied first so a
 * dictated run divides the same way a typed one does.
 */
export function splitDump(text: string): string[] {
  let marked = text;
  for (const [rule, to] of SPOKEN_BREAKS) marked = marked.replace(rule, to);
  return marked
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

/** When to check on someone: the day said, else in two days, at the time said, else 09:00. */
function checkInWhen(text: string, now: Date): string {
  const day = dayOf(text, now);
  if (!day.said) day.date.setDate(day.date.getDate() + 2);
  const [h, m] = timeOf(text) ?? partOf(text) ?? [9, 0];
  day.date.setHours(h, m, 0, 0);
  return day.date.toISOString();
}

const CHANNEL_TYPES: readonly ParsedType[] = ['call', 'email', 'whatsapp'];

/** A promise is a task with the lead-in taken off; a waiting is a check-in with someone. */
function fromLoop(loop: Loop, text: string, ctx: ParseContext): ParsedTask {
  const found = whoOf(text, ctx.contacts);
  if (loop.kind === 'promise') {
    return { type: typeOf(loop.body), title: titleOf(loop.body), ...found, when: whenOf(text, ctx.now), kind: 'promise' };
  }
  const channel = typeOf(text);
  return {
    type: CHANNEL_TYPES.includes(channel) ? channel : 'whatsapp',
    title: loop.body ? titleOf(loop.body) : ctx.lang === 'ar' ? 'رد' : 'Reply',
    who: found.who ?? loop.name,
    contactId: found.contactId,
    when: checkInWhen(text, ctx.now),
    kind: 'waiting',
  };
}


/**
 * Spoken English clock words, written as digits.
 *
 * Arabic already reads its number words — `arabicClock` has handled اربعة
 * and عشرة and اتناشر from the start — and English read none of them, so a
 * dictated "call Sara tomorrow at four" was scheduled at the default evening
 * hour rather than at four (BUILD-REVIEW §2.108). Dictation is exactly where
 * this matters: a recogniser writes what it hears, and people say "four".
 *
 * The rewriting happens once, before the sentence is read at all, so the
 * time *and* the title both see "4" — teaching `timeOf` alone would have
 * scheduled it correctly and left "at four" sitting in the title.
 *
 * Compound forms come first: "half past four" must not be read as the four
 * in "four". And nothing here invents a time where none was said — a
 * sentence with no clock word in it comes back untouched.
 */
const EN_HOUR_WORDS: Readonly<Record<string, number>> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const EN_HOURS = Object.keys(EN_HOUR_WORDS).join('|');
const EN_MINUTE_WORDS: Readonly<Record<string, number>> = {
  'o clock': 0, "o'clock": 0, oclock: 0, five: 5, ten: 10, fifteen: 15, twenty: 20,
  'twenty five': 25, thirty: 30, 'thirty five': 35, forty: 40, 'forty five': 45, fifty: 50, 'fifty five': 55,
};
const EN_MINUTES = Object.keys(EN_MINUTE_WORDS).map((w) => w.replace(/'/g, "'?")).join('|');
const enHourOf = (word: string): number => EN_HOUR_WORDS[word.toLowerCase()] ?? 0;
const two = (n: number): string => String(n).padStart(2, '0');

export function spokenClock(text: string): string {
  let out = text;
  // "half past four", "quarter past six", "quarter to seven".
  out = out.replace(new RegExp(`\\bhalf past (${EN_HOURS}|\\d{1,2})\\b`, 'gi'), (_m, h: string) => `${/^\d/.test(h) ? h : enHourOf(h)}:30`);
  out = out.replace(new RegExp(`\\b(?:a )?quarter past (${EN_HOURS}|\\d{1,2})\\b`, 'gi'), (_m, h: string) => `${/^\d/.test(h) ? h : enHourOf(h)}:15`);
  out = out.replace(new RegExp(`\\b(?:a )?quarter to (${EN_HOURS}|\\d{1,2})\\b`, 'gi'), (_m, h: string) => {
    const hour = /^\d/.test(h) ? Number(h) : enHourOf(h);
    return `${((hour + 11 - 1) % 12) + 1}:45`;
  });
  // "four thirty", "ten fifteen", "six o'clock".
  out = out.replace(new RegExp(`\\b(${EN_HOURS})\\s+(${EN_MINUTES})\\b`, 'gi'), (whole, h: string, m: string) => {
    const mins = EN_MINUTE_WORDS[m.toLowerCase().replace(/['']/g, "'")] ?? EN_MINUTE_WORDS[m.toLowerCase()];
    return mins === undefined ? whole : `${enHourOf(h)}:${two(mins)}`;
  });
  // A bare hour word where a time is plainly meant: after at / by / around /
  // before / from, or before am / pm. "four of them" is left alone.
  out = out.replace(
    new RegExp(`\\b(at|by|around|about|before|after|from|until|till)\\s+(${EN_HOURS})\\b`, 'gi'),
    (_m, lead: string, h: string) => `${lead} ${enHourOf(h)}`
  );
  out = out.replace(new RegExp(`\\b(${EN_HOURS})\\s*(a\\.?m\\.?|p\\.?m\\.?)\\b`, 'gi'), (_m, h: string, ap: string) => `${enHourOf(h)} ${ap}`);
  return out;
}

function parseNow(said: string, ctx: ParseContext): ParsedTask {
  // Said rather than typed: "at four" becomes "at 4" before anything reads
  // it, so the time and the title agree about what was in the sentence.
  const text = spokenClock(said);
  const loop = loopOf(text, ctx.contacts);
  if (loop) return fromLoop(loop, text, ctx);
  const who = whoOf(text, ctx.contacts);
  let type = typeOf(text);
  // "Remind me … to send samples": a note to oneself. Sending only makes it a message when somebody
  // is named (a contact, or "to Layla"), or WhatsApp is.
  if (type === 'whatsapp' && REMIND_SELF.test(text) && !who.contactId && !/whatsapp|واتس/i.test(text) && !/\b(?:to|for)\s+[A-Z]/.test(text.replace(/^\s*(?:can you |could you |please )*remind me to\b/i, ''))) {
    type = 'reminder';
  }
  return { type, title: titleOf(text), ...who, when: whenOf(text, ctx.now) };
}

export const localParser: TextParser = {
  async parse(text, ctx) {
    return parseNow(text, ctx);
  },
  async split(text, ctx) {
    return splitDump(text).map((piece) => parseNow(piece, ctx));
  },
  async interpret(text, ctx): Promise<AssistantIntent> {
    // "Waiting for Sara…" with a person in it is something to remember, not the follow-ups list.
    if (loopOf(text, ctx.contacts)) return { kind: 'task', task: parseNow(text, ctx) };
    const kind = intentOf(text);
    return kind === 'task' ? { kind, task: parseNow(text, ctx) } : { kind };
  },
};

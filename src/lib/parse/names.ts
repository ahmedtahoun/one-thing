/**
 * Reading names, in English and Arabic, as people actually type them.
 *
 * Three problems live here:
 *
 *   - Arabic has several spellings of one word. أحمد / احمد, ساره / سارة and
 *     علي / على are the same name to the person typing, so a name is matched
 *     through a pattern that allows each variant (`arx`).
 *   - A contact saved in Arabic is often asked for in English, and the other
 *     way round: "call Sara" for سارة. A rough sound-alike key (`skeleton`)
 *     finds those — but only ever as a question ("did you mean …?"), because
 *     it also lets Sara, Sari and Soraya meet.
 *   - A name nobody has met yet has to be told from an ordinary word, so a
 *     candidate is only taken where a name is likely (`candidateName`).
 */

/** Escapes text for use inside a RegExp. */
export const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Arabic letters that are spelled more than one way. */
const VARIANTS: Record<string, string> = {
  ا: '[اأإآٱ]',
  أ: '[اأإآٱ]',
  إ: '[اأإآٱ]',
  آ: '[اأإآٱ]',
  ٱ: '[اأإآٱ]',
  ة: '[ةه]',
  ه: '[هة]',
  ى: '[ىي]',
  ي: '[يى]',
};

/**
 * Makes an Arabic pattern tolerant of the spellings people mix. Write the
 * source with plain letters and no character classes of its own; ASCII regex
 * syntax passes through untouched.
 */
export const arx = (source: string): string => source.replace(/[؀-ۿ]/g, (ch) => VARIANTS[ch] ?? ch);

export const ar = (source: string, flags = 'i'): RegExp => new RegExp(arx(source), flags);

/** An Arabic letter, for "not part of a longer word" checks (`\b` only knows ASCII). */
export const AR_LETTER = '\\u0621-\\u064A';

/** A whole Arabic word or phrase, tolerant of spellings, with an optional one-letter prefix (ل / و / ب). */
export const arw = (source: string, prefix = true, flags = 'i'): RegExp =>
  new RegExp(`(?<![${AR_LETTER}])${prefix ? '[لوب]?' : ''}(?:${arx(source)})(?![${AR_LETTER}])`, flags);

/** Marks people type over a name: محمّد is محمد. */
const MARKS = '[\\u064B-\\u065F\\u0670\\u0640]*';

/** A name as a pattern: each letter in its spellings, with marks allowed between. */
const namePattern = (name: string): string =>
  [...name].map((ch) => (/[\u0600-\u06FF]/.test(ch) ? (VARIANTS[ch] ?? ch) + MARKS : escapeRegExp(ch))).join('');

export const isArabic = (s: string): boolean => /[؀-ۿ]/.test(s);

/** Strips marks and folds the spellings, for comparing two Arabic words. */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

/** A contact's first name, which is what people actually write. */
export const firstNameOf = (contact: { name: string }): string => contact.name.trim().split(/\s+/)[0] ?? '';

/**
 * Whether a first name appears in the text as a word. Arabic attaches
 * prepositions to names ("لمحمد", "بسارة", "وسارة"), so up to two leading
 * ل / ب / و / ف are allowed, and the spelling variants are tolerated.
 */
export function mentions(text: string, first: string): boolean {
  if (first.length < 3) return false;
  const latin = /^[\x00-\x7F]+$/.test(first);
  const rule = latin
    ? new RegExp(`\\b${escapeRegExp(first)}\\b`, 'i')
    : new RegExp(`(^|[\\s،,؟?!])[لبوف]{0,2}${namePattern(first)}(?=$|[\\s،,.؟?!])`);
  return rule.test(text);
}

// --- sound-alike key ---------------------------------------------------

const ARABIC_SOUNDS: Record<string, string> = {
  ب: 'b', ت: 't', ث: 's', ج: 'j', ح: 'h', خ: 'k', د: 'd', ذ: 'z', ر: 'r', ز: 'z', س: 's', ش: 's', ص: 's',
  ض: 'd', ط: 't', ظ: 'z', غ: 'x', ف: 'f', ق: 'k', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', پ: 'b', چ: 's', گ: 'j',
};

/**
 * A rough key two spellings of one name share: Sara = سارة = Sarah,
 * Mohamed = Mohammed = محمد, Ahmed = أحمد, Noura = نورة, Khaled = خالد.
 * Vowels (and Arabic ا و ي ة ع) are dropped, similar consonants fold, and a
 * trailing h goes. Two letters or fewer is too little to compare.
 */
export function skeleton(name: string): string {
  let key: string;
  if (isArabic(name)) {
    key = [...normalizeArabic(name)].map((ch) => ARABIC_SOUNDS[ch] ?? '').join('');
  } else {
    key = name
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/(.)\1/g, '$1')
      .replace(/sh|ch/g, 's')
      .replace(/kh/g, 'k')
      .replace(/gh/g, 'x')
      .replace(/th/g, 's')
      .replace(/ph/g, 'f')
      .replace(/[qc]/g, 'k')
      .replace(/g/g, 'j')
      .replace(/p/g, 'b')
      .replace(/v/g, 'f')
      .replace(/[aeiouyw]/g, '');
  }
  return key.replace(/h$/, '');
}

/** Two names that sound alike across spellings, or scripts. Both must be long enough to mean something. */
export function soundsAlike(a: string, b: string): boolean {
  const ka = skeleton(a);
  return ka.length >= 2 && ka === skeleton(b);
}

// --- a name nobody has met yet ------------------------------------------

/** Words that follow a verb without being anyone. */
const NOT_A_NAME = new Set([
  'the', 'a', 'an', 'my', 'me', 'him', 'her', 'them', 'us', 'you', 'it', 'this', 'that', 'back', 'about', 'again',
  'someone', 'anyone', 'everyone', 'somebody', 'team', 'office', 'home', 'work', 'later', 'now', 'soon', 'today',
  'tonight', 'tomorrow', 'morning', 'evening', 'noon', 'afternoon', 'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december', 'next', 'last', 'all', 'both', 'out', 'up', 'on', 'in', 'at',
  'by', 'and', 'or', 'then', 'with', 'for', 'to', 'of', 'if', 'when', 'what', 'who', 'how', 'why', 'follow',
]);

const AR_NOT_A_NAME = new Set(
  [
    'بكره', 'باكر', 'غدا', 'غد', 'النهارده', 'انهارده', 'اليوم', 'بعدين', 'تاني', 'دلوقتي', 'الان', 'حد', 'اي', 'ايه',
    'كل', 'الصبح', 'العصر', 'المغرب', 'مساء', 'بالليل', 'الليله', 'ده', 'دي', 'دا', 'هو', 'هي', 'انا', 'انت', 'اللي',
    'عشان', 'علشان', 'لو', 'بس', 'كمان', 'برضه', 'الساعه', 'ساعه', 'واتس', 'واتساب', 'رساله', 'ايميل', 'ميل', 'بعد',
    'قبل', 'مع', 'على', 'علي', 'الى', 'الي', 'في', 'من', 'عن', 'ان', 'او',
  ].map(normalizeArabic)
);

const NAME = "[A-Za-z][A-Za-z'’-]{2,}";
/** Verbs whose next word is the person, even in lowercase: "call sara". */
const DIRECT = new RegExp(`\\b(?:call|ring|phone|message|text|whatsapp|dm)\\s+(?:to\\s+)?(${NAME})`, 'i');
/** Other verbs and prepositions: only a Capitalised word counts ("email the quote" is not a person). */
const MARKED =
  /\b(?:email|e-mail|mail|send|reply(?:\s+to)?|tell|told|ask|asked|promised|owe|remind|meet|see|visit|follow\s+up\s+with|catch\s+up\s+with|to|with|for)\s+([A-Za-z][a-z'’-]{2,})/i;

const WORD = `[${AR_LETTER}]{2,}`;
const NOT_IN_WORD = `(?<![${AR_LETTER}])`;
/**
 * After a calling word the next word is a person: "اتصل بسارة", "رن على سارة",
 * "كلم نورة", "هكلم محمد". The verb must stand alone, so كلمة (a word) and
 * برنامج (a programme) do not count.
 */
const AR_DIRECT = ar(
  `${NOT_IN_WORD}(?:ا|ه|ب|ع|ل|س)?(?:كلم|اتصل|رن)(?:ي|ه|ها|هم|ني)?(?![${AR_LETTER}])\\s+(?:(?:على|علي|الى|مع)\\s+)?(${WORD})`
);
/** After a sending word only a ل-word is a recipient: "ابعت لسارة", "ابعت واتس لمحمد". */
const AR_SEND = ar(
  `${NOT_IN_WORD}(?:ه|ب|ع)?(?:ابعت|بعت|ارسل|ابعث)(?![${AR_LETTER}])\\s+(?:(?:واتس\\S*|رساله|ايميل|ميل)\\s+)?ل\\s*(${WORD})`
);

/** A word with its attached ب / ل taken off ("بسارة" → "سارة"), unless that leaves too little. */
function bareArabic(word: string): string {
  return /^[بل]/.test(word) && word.length > 3 ? word.slice(1) : word;
}

export type Candidate = { word: string; script: 'latin' | 'arabic' };

/**
 * The name a sentence seems to be about, as written, or null. A name is taken
 * after a verb that is followed by a person; ordinary words are filtered out.
 * It does not know whether the person is in People — that is for the caller.
 */
export function candidateName(text: string): Candidate | null {
  for (const rule of [DIRECT, MARKED]) {
    const word = rule.exec(text)?.[1];
    if (!word || NOT_A_NAME.has(word.toLowerCase())) continue;
    // After a verb that is not a person-verb, only a Capitalised word is a name.
    if (rule === MARKED && !/^[A-Z]/.test(word)) continue;
    return { word: word.charAt(0).toUpperCase() + word.slice(1), script: 'latin' };
  }
  for (const rule of [AR_DIRECT, AR_SEND]) {
    const raw = rule.exec(text)?.[1];
    if (!raw) continue;
    const word = rule === AR_DIRECT ? bareArabic(raw) : raw;
    if (/^ال/.test(normalizeArabic(word))) continue; // "المدير", "الفاتورة": a thing, not a name
    if (AR_NOT_A_NAME.has(normalizeArabic(word))) continue;
    return { word, script: 'arabic' };
  }
  return null;
}

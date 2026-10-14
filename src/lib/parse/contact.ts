/**
 * Saving a contact by talking: "save this number, name is Sara Haddad, phone
 * zero five zero one two three four five six seven, email sara at gmail dot
 * com", "احفظ رقم احمد ٠١٠٠١٢٣٤٥٦٧", "ضيف جهة اتصال جديدة".
 *
 * Reads a name, a number (with its country code), an email and a company or
 * role out of one sentence — or out of the short answers that follow when
 * something is missing — in English, Gulf / standard Arabic and Egyptian
 * Arabic. Pure and on-device: it proposes, the Assistant shows the card, and
 * only "Save contact" writes anything.
 */
import { splitNumber } from '@/lib/phone-contacts/draft';
import { COUNTRIES, DEFAULT_DIAL } from '@/content/countries';
import { AR_LETTER, arx, normalizeArabic } from './names';
import { extractEmail, extractPhone, spokenDigits, westernDigits } from './spoken';

export type ContactFields = {
  name?: string;
  /** National part, without the code or a leading 0. */
  phone?: string;
  /** "+20". */
  dial?: string;
  email?: string;
  /** Company or role. */
  role?: string;
  /** The email was written from letters heard in Arabic; worth a second look. */
  guessedEmail?: boolean;
};

/** What the Assistant still needs from the person. */
export type Missing = 'name' | 'detail' | null;

const fold = (s: string): string => normalizeArabic(s.toLowerCase());

// --- is this a request to save someone? --------------------------------------

const NOT_A_SAVE = /\bremind(?:er)?\b|\btask\b|\bto-?do\b|فكرني|ذكرني|فكريني|مهمه|مهمة/i;
const SAVE_EN = new RegExp(
  '\\b(?:save|add|create|store|record|register|make|new|enter|put)\\b[^.!?]{0,36}?\\b(?:contacts?|numbers?|phone(?:\\s*number)?s?|person|people|friend|colleague|client|customer|guy|him|her|them|email|e-?mail)\\b' +
    '|\\bnew contact\\b|\\bsave (?:this|his|her|their|my)\\b|\\bsave\\s+(?:a\\s+)?(?:new\\s+)?(?:number|contact)\\b',
  'i'
);
const SAVE_VERB_AR = '(?:احفظ|احفظلي|احفظ لي|احفضلي|سجل|سجلي|ضيف|ضيفلي|ضيف لي|اضف|اضيف|اضفلي|خزن|خزنلي|سيف|سيڤ|دخل|دخلي|انشئ|اعمل|اعملي|عمل)';
const SAVE_NOUN_AR = '(?:الرقم|رقم|ارقام|الارقام|جهه|جهات|اتصال|شخص|صديق|صاحبي|عميل|زميل|اسم|الاسم|كونتاكت|الكونتاكت|كونتاكتس|نمبر|ايميل|الايميل|الموبايل|موبايل|تليفون|التليفون)';
const SAVE_AR = new RegExp(`(?<![${AR_LETTER}])${SAVE_VERB_AR.replace(/ا/g, '[اأإآ]').replace(/ه/g, '[هة]')}(?![${AR_LETTER}])[^.!?؟]{0,30}?(?<![${AR_LETTER}])ل?${SAVE_NOUN_AR.replace(/ا/g, '[اأإآ]').replace(/ه/g, '[هة]')}(?![${AR_LETTER}])`, 'i');
const HAS_FIELD_WORD = /\b(?:number|phone|mobile|cell|email|e-?mail|contact)\b|رقم|ايميل|موبايل|تليفون|كونتاكت|جهه اتصال|جهة اتصال/i;
/** "My number is …": the person's own details, not someone to save. */
const OWN_DETAILS = /\bmy\s+(?:own\s+)?(?:number|phone|mobile|cell|email|e-?mail)\b|رقمي|ايميلي|موبايلي|تليفوني/i;
const TASK_VERB = /\bcall\b|\bring\b|\bremind\b|\bsend\b|\bmessage\b|\btext\b|اتصل|كلم|رن\b|ابعت|ارسل|راسل|فكرني|ذكرني/i;

/**
 * Whether the text asks to save a person. "Save this number", "add a new
 * contact", "احفظ الرقم ده" — or a number or email said with its label and no
 * task in it ("Sara's number is 0501234567"). A task that merely mentions an
 * address ("send the quote to sara@x.com") is not one.
 */
export function isContactCommand(text: string): boolean {
  if (NOT_A_SAVE.test(text)) return false;
  if (SAVE_EN.test(text) || SAVE_AR.test(text)) return true;
  if (TASK_VERB.test(text) || OWN_DETAILS.test(text)) return false;
  const hasData = extractPhone(text).phone !== null || extractEmail(text) !== null;
  return hasData && HAS_FIELD_WORD.test(text);
}

// --- reading the fields -------------------------------------------------------

/** Words that are never part of a name. */
const FILLER = new Set(
  [
    // English
    'save', 'saving', 'add', 'create', 'store', 'record', 'register', 'make', 'new', 'enter', 'put', 'contact', 'contacts', 'number', 'numbers',
    'phone', 'mobile', 'cell', 'email', 'e-mail', 'mail', 'address', 'name', 'is', 'are', 'and', 'his', 'her', 'their', 'this', 'that', 'these',
    'the', 'a', 'an', 'to', 'for', 'of', 'my', 'me', 'please', 'called', 'named', 'with', 'in', 'it', 'its', "it's", 'hi', 'hey', 'assistant', 'can', 'you', 'could',
    'would', 'i', 'want', 'need', 'like', 'person', 'friend', 'colleague', 'client', 'customer', 'guy', 'him', 'them', 'also', 'plus', 'on', 'under',
    'his/her', 'telephone', 'tel', 'whatsapp', 'is:', 'number:', 'one', 'now', 'just', 'about', 'new:', 'who',
    // Arabic (folded)
    ...[
      'احفظ', 'احفظلي', 'سجل', 'سجلي', 'ضيف', 'ضيفلي', 'اضف', 'اضيف', 'خزن', 'خزنلي', 'سيف', 'سيڤ', 'دخل', 'دخلي', 'انشئ', 'اعمل', 'اعملي', 'عمل',
      'رقم', 'الرقم', 'ارقام', 'جهه', 'جهات', 'اتصال', 'شخص', 'صديق', 'صاحبي', 'عميل', 'زميل', 'اسم', 'الاسم', 'اسمه', 'اسمها', 'اسمو', 'اسمي',
      'كونتاكت', 'الكونتاكت', 'نمبر', 'ايميل', 'الايميل', 'ايميله', 'ايميلها', 'البريد', 'بريد', 'موبايل', 'الموبايل', 'موبايله', 'تليفون',
      'التليفون', 'تليفونه', 'رقمه', 'رقمها', 'رقمو', 'جديد', 'جديده', 'هذا', 'هذه', 'ده', 'دي', 'دا', 'هو', 'هي', 'و', 'لي', 'ليا', 'لو', 'سمحت',
      'من', 'فضلك', 'عايز', 'عاوز', 'اريد', 'ابغي', 'ابي', 'ممكن', 'تقدر', 'يا', 'في', 'على', 'علي', 'عن', 'الي', 'الى', 'مع', 'كمان', 'برضه',
      'واتس', 'واتساب', 'الواتس', 'الواتساب', 'للشخص', 'دول', 'ديه', 'ذا', 'انا', 'بس', 'ال',
    ].map(normalizeArabic),
  ]
);

/** Where a name (or a role) ends: the next thing being described. */
const FIELD_WORDS = new Set(
  [
    'and', 'his', 'her', 'their', 'phone', 'number', 'mobile', 'cell', 'email', 'e-mail', 'mail', 'works', 'work', 'from', 'company', 'job', 'title',
    'role', 'position', 'who', 'whatsapp', 'tel', 'telephone',
    'رقم', 'رقمه', 'رقمها', 'رقمو', 'الرقم', 'ايميل', 'ايميله', 'ايميلها', 'الايميل', 'موبايل', 'موبايله', 'الموبايل', 'تليفون', 'تليفونه', 'التليفون',
    'شغال', 'شغاله', 'بيشتغل', 'يشتغل', 'شركه', 'وظيفته', 'وظيفتها', 'منصبه', 'واتس', 'واتساب', 'الواتس', 'البريد',
  ].map(normalizeArabic)
);

const tokensOf = (s: string): string[] => s.split(/[\s,،;؛:!?؟]+/).map((t) => t.replace(/^[.]+|[.]+$/g, '')).filter(Boolean);

/** The leading words of a phrase, up to the next field word — at most four, as a name. */
function untilField(phrase: string, keepFirst = false): string[] {
  const out: string[] = [];
  for (const token of tokensOf(phrase)) {
    const f = fold(token);
    if (!(keepFirst && out.length === 0) && (FIELD_WORDS.has(f) || (f.startsWith('و') && FIELD_WORDS.has(f.slice(1))))) break;
    out.push(token);
    if (out.length === 4) break;
  }
  return out;
}

const titleCase = (words: string[]): string =>
  words
    .map((w) => w.replace(/['’]s$/i, ''))
    .filter((w) => /[A-Za-z؀-ۿ]/.test(w))
    .map((w) => (/^[a-z]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();

const NAME_EN = /(?:\bname\s*(?:is|:|=)\s*|\bnamed\s+|\bis called\s+|\bcalled\s+|\bit(?:'|’)?s\s+|\bthis is\s+|\bwith the name\s+)([^,.;]+)/i;
const NAME_AR = new RegExp(`(?<![${AR_LETTER}])(?:الاسم|اسمه|اسمها|اسمو|اسمي?|اسم)(?![${AR_LETTER}])\\s*(?:هو\\s+|هي\\s+|:\\s*)?([^,،.;؛]+)`, 'i');

const ROLE_EN = /\b(?:works?\s+(?:at|for|in|with)|working\s+(?:at|for)|from|company\s*(?:is|:|=)?|(?:job\s*)?title\s*(?:is|:|=)|role\s*(?:is|:|=)|position\s*(?:is|:|=))\s+([^,.;]+)/i;
const ROLE_AR = new RegExp(
  arx(`(?<![${AR_LETTER}])(?:(?:شغاله|شغال|بيشتغل|يشتغل|تشتغل)\\s*(?:في|عند|مع|ب)?|(?=شركه)|(?:وظيفته|وظيفتها|منصبه)\\s*(?:هي|هو|:)?)\\s*([^,،.;؛]+)`),
  'i'
);
const NOT_A_ROLE = new Set(['work', 'home', 'here', 'there', 'school', 'it', 'him', 'her', 'them', 'me', 'now']);

/** Whether a Latin-letter name is spelled in the sentence like a person would be. */
function removeSpan(s: string, from: number, length: number): string {
  return `${s.slice(0, from)} ${s.slice(from + length)}`.replace(/\s+/g, ' ').trim();
}

/** The country code and national number of a number said or written in full. */
export function splitDialled(raw: string, region?: string): { dial?: string; phone: string } {
  let digits = raw.replace(/[^\d+]/g, '');
  // International without a +: "966501234567", "201001234567".
  if (!digits.startsWith('+') && !digits.startsWith('00') && !digits.startsWith('0') && digits.length >= 11) {
    const dial = COUNTRIES.map((c) => c.dial)
      .sort((a, b) => b.length - a.length)
      .find((d) => digits.startsWith(d.slice(1)));
    if (dial) digits = `+${digits}`;
  }
  // Egyptian mobiles are the one local shape that tells its own country (01x xxxx xxxx), whatever the phone's region.
  if (/^01[0125]\d{8}$/.test(digits)) return { dial: '+20', phone: digits.slice(1) };
  const split = splitNumber(digits, region);
  return split.dial ? { dial: split.dial, phone: split.phone } : { phone: split.phone };
}

export type ReadOptions = {
  /** What the Assistant just asked for: a bare answer is that thing. */
  expect?: Missing;
  /** The sentence is the request itself ("save this number …"), so loose words are the name. */
  command?: boolean;
  /** Device region, "EG": the country of a number said without its code. */
  region?: string;
};

/** Everything a sentence says about a person, and nothing it does not. */
export function readContact(text: string, options: ReadOptions = {}): ContactFields {
  const fields: ContactFields = {};
  let rest = text.trim();

  const email = extractEmail(rest);
  if (email) {
    fields.email = email.email;
    if (email.guessed) fields.guessedEmail = true;
    rest = email.rest;
  }

  const phone = extractPhone(rest);
  if (phone.phone) {
    Object.assign(fields, splitDialled(phone.phone, options.region));
    rest = phone.rest;
  }
  // From here on numbers are plain words.
  rest = spokenDigits(rest);

  const roleMatch = ROLE_EN.exec(rest) ?? ROLE_AR.exec(rest);
  if (roleMatch?.[1]) {
    const role = untilField(roleMatch[1], true).join(' ').trim();
    if (role && !NOT_A_ROLE.has(role.toLowerCase())) {
      fields.role = role.charAt(0).toUpperCase() + role.slice(1);
      rest = removeSpan(rest, roleMatch.index, roleMatch[0].length);
    }
  }

  // A name said outright wins over one inferred from what is left.
  const outright = NAME_EN.exec(rest) ?? NAME_AR.exec(rest);
  if (outright?.[1]) {
    const name = titleCase(untilField(outright[1]).filter((w) => !FILLER.has(fold(w)) || /^[A-Z]/.test(w)));
    if (name) {
      fields.name = name;
      return fields;
    }
  }

  if (options.command || options.expect === 'name') {
    const words = tokensOf(rest.replace(/\d+/g, ' ')).filter((w) => !FILLER.has(fold(w)));
    // "Ahmed, Sara" is not one name; stop at the first word that is a field label.
    const name = titleCase(untilField(words.join(' ')));
    if (name) fields.name = name;
  }
  return fields;
}

// --- the draft as it fills in ---------------------------------------------------

/** New fields on top of the draft; what was not said stays. */
export function mergeFields(draft: ContactFields, patch: ContactFields): ContactFields {
  const next: ContactFields = { ...draft };
  for (const key of Object.keys(patch) as (keyof ContactFields)[]) {
    const value = patch[key];
    if (value !== undefined && value !== '') (next as Record<string, unknown>)[key] = value;
  }
  // A new number replaces the old one, code and all.
  if (patch.phone && !patch.dial && draft.dial) next.dial = draft.dial;
  if (patch.email && !patch.guessedEmail) delete next.guessedEmail;
  return next;
}

/**
 * Whether a message is some other errand rather than an answer to "what's
 * their name?": a task verb, or too long to be a name.
 */
export function looksLikeTask(text: string): boolean {
  return TASK_VERB.test(text) || tokensOf(text).length > 6;
}

/** One field typed into a contact card. A typed number is split into its code and national part. */
export type ContactEdit = Partial<Pick<ContactFields, 'name' | 'email' | 'role'>> & { phoneText?: string };

export function applyEdit(fields: ContactFields, edit: ContactEdit, region?: string): ContactFields {
  let next: ContactFields = { ...fields };
  if (edit.name !== undefined) next.name = edit.name;
  if (edit.email !== undefined) {
    next.email = edit.email;
    delete next.guessedEmail;
  }
  if (edit.role !== undefined) next.role = edit.role;
  if (edit.phoneText !== undefined) {
    const typed = westernDigits(edit.phoneText).replace(/[^\d+]/g, '');
    if (/^(\+|00)/.test(typed)) next = { ...next, ...splitDialled(typed, region) };
    else next.phone = typed.replace(/^0+/, '');
  }
  return next;
}

/** What is still needed: a name first, then at least a number or an email. */
export function missingOf(draft: ContactFields): Missing {
  if (!draft.name) return 'name';
  if (!draft.phone && !draft.email) return 'detail';
  return null;
}

/** Whether a contact has anything to say beyond what the form already holds. */
export function hasFields(fields: ContactFields): boolean {
  return Boolean(fields.name || fields.phone || fields.email || fields.role);
}

// --- yes and no -------------------------------------------------------------------

const YES = /^(?:yes|yeah|yep|yup|ok|okay|sure|save|save it|save contact|confirm|correct|right|looks right|that'?s right|do it|go ahead|done|تمام|ايوه|ايوا|أيوه|اه|آه|نعم|احفظ|احفظه|احفظها|احفظ الجهة|حفظ|ماشي|طيب|اوكي|أوكي|اوك|صح|صحيح|زي ما هو|اكيد|أكيد)[.!؟?\s]*$/i;
const NO = /^(?:no|nope|cancel|never ?mind|stop|discard|don'?t|forget it|لا|لأ|الغاء|إلغاء|الغي|ألغي|بلاش|مش عايز|مش عاوز|سيبك|اوقف|وقف)[.!؟?\s]*$/i;

export function answerKind(text: string): 'yes' | 'no' | null {
  const t = text.trim();
  if (YES.test(fold(t)) || YES.test(t)) return 'yes';
  if (NO.test(fold(t)) || NO.test(t)) return 'no';
  return null;
}

/** "Sara Haddad" for display: the dial code and number as one line. */
export function numberLine(fields: ContactFields): string {
  if (!fields.phone) return '';
  return `${fields.dial ?? ''} ${fields.phone}`.trim();
}

/** The code for a number with none: the person's own country, else the app's default. */
export function dialFor(fields: ContactFields, region?: string): string {
  return fields.dial ?? COUNTRIES.find((c) => c.iso === region?.toUpperCase())?.dial ?? DEFAULT_DIAL;
}

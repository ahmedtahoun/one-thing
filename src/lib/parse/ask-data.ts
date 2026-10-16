/**
 * Questions the app can answer from what it already knows.
 *
 * The Assistant's parser turns everything into a task, which is right for
 * "call Sara tomorrow" and wrong for "what's Sara's number?" — a question
 * came back as a to-do about asking the question. Worse, every one of those
 * spent one of the day's Assistant requests and sent the words to a server to
 * get an answer the phone was already holding.
 *
 * So this reads the question here instead. Everything it answers with is on
 * the device: People, tasks, follow-ups, history, favourites and each
 * person's keep-in-touch rhythm. No request is spent, nothing is sent
 * anywhere, and it works on a plane.
 *
 * It answers in **shapes, not sentences**: `DataAnswer` carries the people,
 * tasks or follow-ups that answer the question, and the screen writes the
 * line in the person's language (src/content/additions.ts) and draws the
 * buttons. That keeps this file pure, testable and free of copy.
 *
 * Three outcomes, and the difference between the last two is the point:
 *
 *   null              — nothing to look up. It goes to the parser as before,
 *                       so "call Sara tomorrow" still becomes a task and
 *                       "waiting for Sara to reply" still becomes a
 *                       follow-up.
 *   {kind:'unknown'}  — a question, but not one of these. The screen says so
 *                       and offers examples, rather than saving a task
 *                       about it.
 *   anything else     — the answer.
 */
import { COLD_DAYS } from '@/features/next/build';
import { dateKey, type Contact, type FollowUp, type HistoryEntry, type Task } from '@/lib/model-types';
import { readWho } from './clarify';
import { intentOf } from './local';
import { loopOf } from './promise';
import { ar, AR_LETTER, normalizeArabic } from './names';

/** Everything an answer can be read from. All of it is already on the device. */
export type DataWorld = {
  contacts: readonly Contact[];
  tasks: readonly Task[];
  followUps: readonly FollowUp[];
  history: readonly HistoryEntry[];
  favorites: ReadonlySet<string>;
  /** Contact id → days between contacts (src/lib/cadence.ts). */
  cadence: ReadonlyMap<string, number>;
  now: Date;
};

/** Which stretch of the list a question is about. */
export type Span = 'today' | 'tomorrow' | 'week' | 'late';

/** Which detail of a person was asked for; `all` is "who is Sara?". */
export type Want = 'all' | 'phone' | 'email' | 'work';

export type QuietPerson = { contact: Contact; days: number };

export type DataAnswer =
  /** Their details, with the buttons to reach them. */
  | { kind: 'person'; want: Want; contact: Contact }
  /** The name fits several people: the screen offers the choice, as the who-question does. */
  | { kind: 'who'; name: string; options: Contact[] }
  /** A question about a person who is not in People. */
  | { kind: 'nobody'; name: string | null }
  | { kind: 'history'; contact: Contact; entries: HistoryEntry[] }
  | { kind: 'tasks'; span: Span; tasks: Task[] }
  | { kind: 'waiting'; items: FollowUp[] }
  | { kind: 'quiet'; items: QuietPerson[] }
  /** "How many clients?", "who's tagged Lead", "show my favourites". */
  | { kind: 'people'; of: 'label' | 'favorites' | 'all'; label: string | null; contacts: Contact[] }
  | { kind: 'unknown' };

const DAY_MS = 86_400_000;

// --- is this a question at all? -----------------------------------------

/** "?" in either script, or a word that opens a question. */
const ASK_WORD = new RegExp(
  '\\b(?:what|whats|how|why|who|whose|whom|when|where|which|anything|any)\\b|' +
    "\\bwhat(?:'|’)s\\b|" +
    ar(
      `(?<![${AR_LETTER}])(?:وش|ايش|إيش|كيف|ازاي|إزاي|ليش|لماذا|مين|منو|من هو|متى|امتى|إمتى|فين|وين|اين|أين|كام|كم|ايه|إيه|شنو|هل)(?![${AR_LETTER}])`
    ).source,
  'i'
);

/** Asking to be shown a list is a question in everything but punctuation. */
const SHOW_WORD = new RegExp(
  '\\b(?:show|list|tell me|give me|find|look ?up|do i have|have i|am i)\\b|' +
    ar(`(?<![${AR_LETTER}])(?:ورني|اعطني|عطني|هات|اعرض|وريني|عندي|عندى)(?![${AR_LETTER}])`).source,
  'i'
);

/**
 * An instruction, not a question. "Remind me to ask Sara what the price is"
 * holds a question word and is still a task, so a task verb wins — unless the
 * sentence is punctuated as a question, which no imperative is.
 */
const TASK_VERB = new RegExp(
  '\\b(?:remind me|remember to|add (?:a )?task|schedule|book|set (?:a )?reminder|follow up with)\\b|' +
    ar(
      `(?<![${AR_LETTER}])(?:فكرني|فكّرني|ذكرني|ذكّرني|نبهني|نبّهني|حط|سجل|ضيف|اضف|أضف)(?![${AR_LETTER}])`
    ).source,
  'i'
);

export function isQuestion(text: string): boolean {
  const t = text.trim();
  if (t === '') return false;
  if (/[?؟]\s*$/.test(t)) return true;
  if (TASK_VERB.test(t)) return false;
  const folded = normalizeArabic(t);
  return ASK_WORD.test(t) || ASK_WORD.test(folded) || SHOW_WORD.test(t) || SHOW_WORD.test(folded);
}

// --- what is being asked about ------------------------------------------

const PHONE_WORD = new RegExp(
  '\\b(?:number|phone|mobile|cell|whatsapp)\\b|' +
    ar(`(?<![${AR_LETTER}])(?:رقم|رقمه|رقمها|موبايل|تليفون|تلفون|جوال|واتس)(?![${AR_LETTER}])`).source,
  'i'
);
const EMAIL_WORD = new RegExp('\\be-?mail\\b|' + ar('(?:ايميل|إيميل|ايميله|ايميلها|البريد|بريد)').source, 'i');
const WORK_WORD = new RegExp(
  '\\b(?:work|works|working|company|employer|job|role|title|position)\\b|' +
    ar(`(?<![${AR_LETTER}])(?:يشتغل|تشتغل|شغله|شغلها|شركته|شركتها|شركة|وظيفته|وظيفتها|منصبه|منصبها|مسماه)(?![${AR_LETTER}])`).source,
  'i'
);
/** "Who is Sara?", "tell me about Omar", "Sara's details". */
const ABOUT_WORD = new RegExp(
  '\\b(?:who is|about|details|info|information|contact details)\\b|' +
    ar(`(?<![${AR_LETTER}])(?:مين|منو|معلومات|بيانات|تفاصيل)(?![${AR_LETTER}])`).source,
  'i'
);

/** "When did I last speak to Layla?", "what did I send Omar?" */
const HISTORY_WORD = new RegExp(
  '\\b(?:last (?:talk|talked|spoke|speak|call|called|messaged|emailed|contacted|heard)|' +
    'did i (?:send|say|tell|email|message|call)|sent (?:to|him|her)|said to|history|talked to|spoke to)\\b|' +
    ar(
      '(?:اخر مرة|آخر مرة|اخر مره|كلمته|كلمتها|تكلمت مع|ارسلت ل|أرسلت ل|بعتت ل|قلت ل|سجل المحادثات)'
    ).source,
  'i'
);

/**
 * Being owed a reply. `intentOf` has its own list for the Assistant's
 * `followups` intent, and it is narrower than the way people ask — it knows
 * "waiting" but not "owes me a reply" — so both are consulted.
 */
const WAITING_WORD = new RegExp(
  "\\b(?:owes? me|owed|waiting (?:for|on)|hasn(?:'|’)?t (?:replied|answered|got back)|" +
    "haven(?:'|’)?t heard back|no reply|chasing|to chase)\\b|" +
    ar('(?:يدين لي|مدين لي|ما رد|مردش|مستني|مستنى|لسه ما رد|ينتظر ردي|مستني ردي)').source,
  'i'
);

const LATE_WORD = new RegExp(
  '\\b(?:late|overdue|behind|missed|slipped)\\b|' + ar('(?:متأخر|متاخر|فايت|فاتت|متأخرة|متاخره)').source,
  'i'
);
const TODAY_WORD = new RegExp(
  '\\b(?:today|tonight|this evening)\\b|' + ar(`(?<![${AR_LETTER}])(?:اليوم|النهارده|النهاردة|الليلة|الليله)(?![${AR_LETTER}])`).source,
  'i'
);
const TOMORROW_WORD = new RegExp(
  '\\btomorrow\\b|' + ar(`(?<![${AR_LETTER}])(?:بكرة|بكره|باكر|غدا|غداً|الغد)(?![${AR_LETTER}])`).source,
  'i'
);
const WEEK_WORD = new RegExp(
  '\\bth(?:is|e) week\\b|\\bweek\\b|' + ar('(?:الاسبوع|الأسبوع|هذا الاسبوع|هذا الأسبوع|الاسبوع ده)').source,
  'i'
);

/** "Who haven't I talked to in a while?", "who's gone quiet?" */
/**
 * Going quiet. The subject sits inside the verb in English — "haven't **I**
 * talked to" — so the gap is part of the pattern; without it the commonest
 * way to ask this never matched.
 */
const QUIET_WORD = new RegExp(
  "\\b(?:haven(?:'|’)?t|hasn(?:'|’)?t|didn(?:'|’)?t|not)\\s+(?:i\\s+|we\\s+)?(?:talk|talked|spoke|speak|call|called|messag|messaged|contact|contacted|heard)|" +
    '\\b(?:gone quiet|going quiet|out of touch|a while|ages|too long|neglect|neglected|' +
    'should i (?:contact|call|message|reach)|(?:need|due) (?:to )?(?:a )?(?:catch|check|follow))\\b|' +
    ar('(?:ما كلمته|ما كلمتهم|ما تكلمت|مو مكلم|من زمان|صار له وقت|صارلي|مهملين|قطعت|مقطوع)').source,
  'i'
);

/**
 * A question that opens with "who" is after a list, even when a name happens
 * to sit in it: "who haven't I talked to in a while?" is everyone who has
 * gone quiet, not the history of somebody called in passing.
 */
const WHO_OPENER = new RegExp(
  '^\\s*(?:so\\s+)?who(?:m|se)?\\b|' + ar(`^\\s*(?:مين|منو|من هو)(?![${AR_LETTER}])`).source,
  'i'
);

const FAVOURITE_WORD = new RegExp('\\bfavourites?\\b|\\bfavorites?\\b|\\bstarred\\b|' + ar('(?:المفضلة|المفضله|مفضل)').source, 'i');
const COUNT_WORD = new RegExp('\\bhow many\\b|\\bcount\\b|' + ar(`(?<![${AR_LETTER}])(?:كم|عدد)(?![${AR_LETTER}])`).source, 'i');
const PEOPLE_WORD = new RegExp(
  '\\b(?:people|contacts|persons)\\b|' + ar(`(?<![${AR_LETTER}])(?:اشخاص|أشخاص|ناس|جهات|عملاء)(?![${AR_LETTER}])`).source,
  'i'
);
const TAGGED_WORD = new RegExp(
  '\\b(?:tagged|labelled|labeled|label|tag|marked)\\b|' + ar(`(?<![${AR_LETTER}])(?:مصنف|تصنيف|وسم|تاج|مسمى)(?![${AR_LETTER}])`).source,
  'i'
);

const fold = (s: string): string => normalizeArabic(s.trim().toLowerCase());

/**
 * The built-in labels, as they are asked for in Arabic. Labels are stored as
 * the person typed them, and the three the app suggests are English
 * ("Client", "Lead", "Supplier"), so an Arabic question would otherwise never
 * find them. Only these three: a label someone invented is matched by its own
 * spelling, whichever script that is in.
 */
const LABEL_WORDS: readonly (readonly [RegExp, string])[] = [
  [ar('(?:عميل محتمل|عملاء محتملين|محتمل)'), 'Lead'],
  [ar('(?:عميل|عملاء|العميل|العملاء)'), 'Client'],
  [ar('(?:مورد|موردين|المورد|الموردين)'), 'Supplier'],
];

// --- the answers --------------------------------------------------------

/** Open tasks in a stretch of the list, soonest first. */
export function tasksIn(span: Span, world: DataWorld): Task[] {
  const open = world.tasks.filter((task) => task.status === 'open' && task.dueAt !== null);
  const at = (task: Task) => Date.parse(task.dueAt ?? '');
  const nowMs = world.now.getTime();
  let found: Task[];
  if (span === 'late') {
    found = open.filter((task) => at(task) < nowMs);
  } else if (span === 'today') {
    const day = dateKey(world.now);
    found = open.filter((task) => dateKey(new Date(task.dueAt ?? '')) === day);
  } else if (span === 'tomorrow') {
    const day = dateKey(new Date(nowMs + DAY_MS));
    found = open.filter((task) => dateKey(new Date(task.dueAt ?? '')) === day);
  } else {
    // The week ahead: from the start of today to the end of the seventh day.
    const start = new Date(world.now);
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + 7 * DAY_MS;
    found = open.filter((task) => at(task) >= start.getTime() && at(task) < end);
  }
  return found.filter((task) => Number.isFinite(at(task))).sort((a, b) => at(a) - at(b));
}

/** Everyone still owed a reply, and everyone due a check-in. */
export function waitingIn(world: DataWorld): FollowUp[] {
  return world.followUps
    .filter((f) => f.status !== 'done')
    .sort((a, b) => Date.parse(a.nextAt ?? a.createdAt ?? '') - Date.parse(b.nextAt ?? b.createdAt ?? ''));
}

/**
 * People who have not heard from you for longer than their own rhythm — the
 * same rule the Next queue uses (src/features/next/build.ts), so the two
 * screens never disagree about who has gone quiet. Someone with no rhythm of
 * their own is only counted when they are a favourite.
 */
export function quietIn(world: DataWorld): QuietPerson[] {
  const nowMs = world.now.getTime();
  const out: QuietPerson[] = [];
  for (const contact of world.contacts) {
    const every = world.cadence.get(contact.id) ?? (world.favorites.has(contact.id) ? COLD_DAYS : 0);
    if (every <= 0) continue;
    const last = Date.parse(contact.touchedAt ?? contact.createdAt);
    if (!Number.isFinite(last)) continue;
    const days = Math.floor((nowMs - last) / DAY_MS);
    if (days < every) continue;
    out.push({ contact, days });
  }
  return out.sort((a, b) => b.days - a.days);
}

/** What was said to someone, newest first. */
export function historyWith(contact: Contact, world: DataWorld): HistoryEntry[] {
  return world.history
    .filter((entry) => entry.contactId === contact.id)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** The label a question names, matched against the labels actually in use. */
export function labelIn(text: string, world: DataWorld): string | null {
  const folded = fold(text);
  const used = [...new Set(world.contacts.flatMap((c) => c.labels ?? []))].filter((label) => label.trim() !== '');
  // The longest match wins, so "Lead" does not answer a question about "Lead East".
  const spelled = used.filter((label) => folded.includes(fold(label))).sort((a, b) => b.length - a.length)[0];
  if (spelled) return spelled;
  // Asked for in Arabic, stored in English. The longest Arabic word wins too,
  // so "عميل محتمل" is a Lead rather than a Client.
  for (const [pattern, label] of LABEL_WORDS) {
    if (pattern.test(text) && used.some((l) => fold(l) === fold(label))) return label;
  }
  return null;
}

const withLabel = (label: string, world: DataWorld): Contact[] =>
  world.contacts.filter((c) => (c.labels ?? []).some((l) => fold(l) === fold(label)));

/** Which detail of a person the question wants. */
function wantOf(text: string): Want | null {
  if (PHONE_WORD.test(text)) return 'phone';
  if (EMAIL_WORD.test(text)) return 'email';
  if (WORK_WORD.test(text)) return 'work';
  if (ABOUT_WORD.test(text)) return 'all';
  return null;
}

/** A person named in the question, or what to ask back. */
function personAnswer(text: string, want: Want, world: DataWorld): DataAnswer {
  const found = readWho(text, world.contacts as Contact[]);
  if (!found) return { kind: 'nobody', name: null };
  if (found.kind === 'one') return { kind: 'person', want, contact: found.contact };
  return { kind: 'who', name: found.name, options: found.options };
}

/**
 * The question, answered — or null when it is not a question and should go to
 * the parser as before.
 *
 * The order matters. A person named with a history word is about the history;
 * a person named with a detail word is about the detail; and the stretches of
 * the list come before the catch-all, so "what's late?" never reaches it.
 */
export function askData(text: string, world: DataWorld): DataAnswer | null {
  const t = text.trim();
  if (t === '') return null;
  // "I told Omar I'd send it", "waiting for Sara to reply": something to
  // remember, not something to look up. `loopOf` turns its own questions down
  // already, so this only takes the statements away.
  if (loopOf(t, world.contacts as Contact[])) return null;
  // Asked as a question, or said as one of the two errands the app already
  // recognises by name — "Arrange my day" is an instruction with no question
  // in it, and the answer is still sitting on the phone.
  if (!isQuestion(t) && intentOf(t) === 'task') return null;

  const named = readWho(t, world.contacts as Contact[]);
  const waiting = WAITING_WORD.test(t) || intentOf(t) === 'followups';
  // The lists get first refusal: they are asked for with the same words a
  // question about one person uses ("who", "haven't I"), and "ما كلمته" sits
  // in both the history list and the going-quiet one.
  const listy = QUIET_WORD.test(t) || waiting || FAVOURITE_WORD.test(t) || TAGGED_WORD.test(t);

  if (QUIET_WORD.test(t) && (!named || WHO_OPENER.test(t))) return { kind: 'quiet', items: quietIn(world) };

  // --- a person -------------------------------------------------------
  // Only with somebody named: "who haven't I talked to?" is the list above,
  // not a history nobody is in.
  if (HISTORY_WORD.test(t) && named) {
    if (named.kind === 'several') return { kind: 'who', name: named.name, options: named.options };
    return { kind: 'history', contact: named.contact, entries: historyWith(named.contact, world) };
  }

  const want = wantOf(t);
  if (want && !listy) {
    // A detail word with nobody named is a question about People, not a person.
    if (named || want !== 'all') return personAnswer(t, want, world);
  }

  // --- the lists ------------------------------------------------------
  if (QUIET_WORD.test(t)) return { kind: 'quiet', items: quietIn(world) };
  if (waiting) return { kind: 'waiting', items: waitingIn(world) };
  // A history word and nobody we know: say who is missing rather than guess.
  if (HISTORY_WORD.test(t)) return { kind: 'nobody', name: null };

  if (LATE_WORD.test(t)) return { kind: 'tasks', span: 'late', tasks: tasksIn('late', world) };
  if (TOMORROW_WORD.test(t)) return { kind: 'tasks', span: 'tomorrow', tasks: tasksIn('tomorrow', world) };
  if (WEEK_WORD.test(t)) return { kind: 'tasks', span: 'week', tasks: tasksIn('week', world) };
  if (TODAY_WORD.test(t) || intentOf(t) === 'plan') return { kind: 'tasks', span: 'today', tasks: tasksIn('today', world) };

  // --- people, labels and counts --------------------------------------
  if (FAVOURITE_WORD.test(t)) {
    const favourites = world.contacts.filter((c) => world.favorites.has(c.id));
    return { kind: 'people', of: 'favorites', label: null, contacts: favourites };
  }
  const label = labelIn(t, world);
  if (label && (TAGGED_WORD.test(t) || COUNT_WORD.test(t) || SHOW_WORD.test(t) || /[?؟]\s*$/.test(t))) {
    return { kind: 'people', of: 'label', label, contacts: withLabel(label, world) };
  }
  if (COUNT_WORD.test(t) && PEOPLE_WORD.test(t)) {
    return { kind: 'people', of: 'all', label: null, contacts: [...world.contacts] };
  }

  // A person named and nothing else asked for: their details.
  if (named) return personAnswer(t, 'all', world);

  // A question, and none of the above.
  return { kind: 'unknown' };
}

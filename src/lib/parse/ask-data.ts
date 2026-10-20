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
import { dateKey, displayName, type Contact, type FollowUp, type HistoryEntry, type OneThing, type Task } from '@/lib/model-types';
import { readWho } from './clarify';
import { intentOf } from './local';
import { loopOf } from './promise';
import { ar, AR_LETTER, candidateName, normalizeArabic } from './names';

/** Everything an answer can be read from. All of it is already on the device. */
export type DataWorld = {
  contacts: readonly Contact[];
  tasks: readonly Task[];
  followUps: readonly FollowUp[];
  history: readonly HistoryEntry[];
  favorites: ReadonlySet<string>;
  /** Contact id → days between contacts (src/lib/cadence.ts). */
  cadence: ReadonlyMap<string, number>;
  /** Today's One Thing, or null when none has been named. */
  oneThing: OneThing | null;
  now: Date;
};

/**
 * Who the conversation is still about.
 *
 * A chat where every line is read alone is not a conversation: ask "what's
 * Dana's number?" and then "and her email?" and the second question names
 * nobody, so it used to come back "I don't know who you mean". The screen
 * remembers the person the last answer was about and hands it back here.
 *
 * Deliberately only a person, and deliberately only for the questions that
 * are *about* a person with nobody named — a detail or a history question.
 * Everything else still has to say who it means.
 */
export type Subject = { contact: Contact } | null;

/** Which stretch of the list a question is about. */
export type Span = 'today' | 'tomorrow' | 'week' | 'late';

/** Which detail of a person was asked for; `all` is "who is Sara?". */
export type Want = 'all' | 'phone' | 'email' | 'work';

export type QuietPerson = { contact: Contact; days: number };

export type DataAnswer =
  /** Their details, with the buttons to reach them. */
  | { kind: 'person'; want: Want; contact: Contact }
  /**
   * The name fits several people: the screen offers the choice, as the
   * who-question does. `want` is what was asked about them, so choosing one
   * answers *that* rather than dropping the person on their profile and
   * leaving the question behind.
   */
  | { kind: 'who'; name: string; options: Contact[]; want: Want }
  /** A question about a person who is not in People — `want` for the same reason. */
  | { kind: 'nobody'; name: string | null; want: Want }
  | { kind: 'history'; contact: Contact; entries: HistoryEntry[] }
  | { kind: 'tasks'; span: Span; tasks: Task[] }
  | { kind: 'waiting'; items: FollowUp[] }
  | { kind: 'quiet'; items: QuietPerson[] }
  /** "How many clients?", "who's tagged Lead", "show my favourites". */
  | { kind: 'people'; of: 'label' | 'favorites' | 'all'; label: string | null; contacts: Contact[] }
  /** "What's my one thing today?" — the answer is a screen of its own, so it carries the state too. */
  | { kind: 'oneThing'; oneThing: OneThing | null }
  /** "What's next?" — the single thing to do now, late first. */
  /** `late` when the next thing is already overdue, so it is not called just "Next". */
  | { kind: 'next'; task: Task | null; late?: boolean }
  /** "What did I do today?" — from history, which is the only thing the app dates. */
  | { kind: 'log'; span: 'today' | 'yesterday' | 'week'; entries: HistoryEntry[] }
  /**
   * Everything still open with one person: their own tasks and the replies
   * they still owe. "Anything pending with Sara?" — the question this app
   * exists for, and the one it used to answer with her phone number.
   */
  | { kind: 'withPerson'; contact: Contact; tasks: Task[]; followUps: FollowUp[] }
  /**
   * A task found by its own words: "when is the dentist?". People remember
   * the thing, not the date, and the date is what the app is holding.
   */
  | { kind: 'findTask'; query: string; tasks: Task[] }
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
  // "my tasks" on its own is a request to see them, not a task called "my
  // tasks" — it has no verb in it. A task verb is checked first, so
  // "remind me to do my tasks tomorrow" is still a task.
  return (
    ASK_WORD.test(t) || ASK_WORD.test(folded) || SHOW_WORD.test(t) || SHOW_WORD.test(folded) || TASKS_WORD.test(t) || TASKS_WORD.test(folded)
  );
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
      '(?:اخر مرة|آخر مرة|اخر مره|كلمته|كلمتها|كلمت|تكلمت مع|اتكلمت مع|سجل المحادثات|' +
        // Egypt puts the question word in the middle: "بعتت ايه لعمر؟",
        // "قلت ايه لعمر؟". The Gulf forms had the verb and the ل touching.
        '(?:ارسلت|أرسلت|بعتت|بعت|ابعت|قلت)(?:\\s+(?:ايه|إيه|ايش|إيش))?\\s+ل)'
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
  '\\b(?:late|overdue|behind|missed|slipped)\\b|' +
    // Asked as a reproach rather than a status: "what should I have done?",
    // "did I miss anything?" — both are the late list.
    "\\bshould i have (?:done|finished|sent|called)\\b|\\bwas i supposed to\\b|\\bdid i miss\\b|\\bwhat(?:'|’)?s slipping\\b|" +
    ar('(?:متأخر|متاخر|فايت|فاتت|متأخرة|متاخره|فاتني|وش فاتني|كان لازم)').source,
  'i'
);

/**
 * The day's list asked for without the word "today" in it: "what tasks do I
 * have", "my tasks", "what's on". A phone showed "What tasks should I have
 * done" answered with "I'm best with your people and your follow-ups",
 * which is this app saying it cannot read its own list.
 */
const TASKS_WORD = new RegExp(
  "\\b(?:what|which) tasks?\\b|\\bmy tasks?\\b|\\bthe tasks?\\b|\\bwhat(?:'|’)?s on\\b|" +
    '\\bwhat do i have\\b|\\bwhat have i got\\b|\\banything (?:on|due|left|to do)\\b|\\bto-?do list\\b|' +
    ar(`(?<![${AR_LETTER}])(?:مهامي|مهماتي|وش مهامي|ايش مهامي|وش عندي|ايش عندي|شنو عندي|وش علي|ايش علي|قائمة مهامي)(?![${AR_LETTER}])`).source,
  'i'
);
const TODAY_WORD = new RegExp(
  '\\b(?:today|tonight|this evening)\\b|' + ar(`(?<![${AR_LETTER}])(?:اليوم|النهارده|النهاردة|الليلة|الليله)(?![${AR_LETTER}])`).source,
  'i'
);
const YESTERDAY_WORD = new RegExp(
  // امبارح is how Egypt says it, and مبارح could not match inside it: the
  // lookbehind sees the leading ا as part of a longer word. Until this was
  // added, "مين كلمت امبارح؟" was answered with *today's* log — a wrong day
  // rather than an unread question, which is the worse of the two.
  '\\byesterday\\b|\\blast night\\b|' +
    ar(`(?<![${AR_LETTER}])(?:امس|أمس|البارحة|البارحه|مبارح|امبارح|إمبارح)(?![${AR_LETTER}])`).source,
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
    ar(
      '(?:ما كلمته|ما كلمتهم|ما تكلمت|مو مكلم|من زمان|صار له وقت|صارلي|مهملين|قطعت|مقطوع|مكلمتوش|مكلمتهمش|' +
        // "who should I call?" — the English pattern has this and the Arabic
        // did not, so the commonest Egyptian way of asking it fell through.
        // No character class of its own here: `arx` expands ا into
        // [اأإآٱ], so [اأ] would become a class nested inside a class. A
        // plain ا? is already tolerant of every spelling (see names.ts).
        '(?:المفروض|لازم|محتاج)\\s+ا?(?:كلم|تصل|راسل|تواصل))'
    ).source,
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
const COUNT_WORD = new RegExp('\\bhow many\\b|\\bcount\\b|' + ar(`(?<![${AR_LETTER}])(?:كم|كام|عدد)(?![${AR_LETTER}])`).source, 'i');
const PEOPLE_WORD = new RegExp(
  // كام takes the singular after it — "عندي كام شخص؟", "كام حد عندي؟" — so
  // the plurals alone never matched the way Egypt asks for a count.
  '\\b(?:people|contacts|persons)\\b|' +
    ar(`(?<![${AR_LETTER}])(?:اشخاص|أشخاص|ناس|جهات|عملاء|شخص|حد|افراد|أفراد)(?![${AR_LETTER}])`).source,
  'i'
);
const TAGGED_WORD = new RegExp(
  '\\b(?:tagged|labelled|labeled|label|tag|marked)\\b|' + ar(`(?<![${AR_LETTER}])(?:مصنف|تصنيف|وسم|تاج|مسمى)(?![${AR_LETTER}])`).source,
  'i'
);

/**
 * Today's One Thing, asked for by its own name. Narrow on purpose: "what do
 * I have today?" is the day's list and must not be answered with one task.
 */
const ONE_THING_WORD = new RegExp(
  '\\bone thing\\b|\\bmain (?:thing|task|focus|job)\\b|\\b(?:my |the )?(?:top )?priority\\b|\\bmost important\\b|' +
    ar('(?:الشي الواحد|الشيء الواحد|شغلي الاساسي|شغلي الأساسي|شغلك الاساسي|شغلك الأساسي|أولويتي|اولويتي|الاهم|الأهم)').source,
  'i'
);

/** "What's next?", "what should I do now?" — one thing, not a list. */
const NEXT_WORD = new RegExp(
  "\\bwhat(?:'|’)?s next\\b|\\bwhat next\\b|\\bnext (?:task|thing|up|one)\\b|" +
    '\\bwhat should i (?:do|start)(?: now| next)?\\b|\\bwhat do i do now\\b|' +
    ar('(?:وش بعده|ايش بعده|إيش بعده|وش التالي|ايش التالي|الجاي|اللي جاي|وش اسوي الحين|ايه اللي بعده|وش بعدين|ايه التالي|اعمل ايه دلوقتي|ايه اللي بعد كده)').source,
  'i'
);

/**
 * "What did I do today?" — answered from history, which is the only thing
 * this app dates. A `Task` has no finished-at (see `src/features/recap/
 * week.ts`), so how many tasks were closed today is not knowable and is not
 * claimed here either.
 */
const LOG_WORD = new RegExp(
  "\\b(?:what (?:did|have) i (?:do|done|sent?|said)|what i did|who did i (?:talk|speak|call|contact|message|email)|" +
    'did i (?:do|send) anything|my (?:day|week) so far|my activity|how was my (?:day|week))\\b|' +
    ar(
      '(?:وش سويت|ايش سويت|إيش سويت|وش عملت|ايه عملت|سويت ايه|عملت ايه|عملت إيه|' +
        'مين كلمت|كلمت مين|مع مين تكلمت|اتكلمت مع مين|نشاطي|سجل اليوم)'
    ).source,
  'i'
);

/**
 * What is still open *with one person*: "anything pending with Sara?", "do I
 * owe Omar anything?", "what's left with Layla?".
 *
 * Deliberately not the bare word "with": "when did I last speak with Sara"
 * is a history question and is read before this one. What is matched here is
 * the sense of something outstanding, which is the sense this app is about.
 *
 * Arabic leaves out عليّ — once diacritics are stripped (askData does that
 * first) it is indistinguishable from the name علي, and reading a question
 * about Ali as a question about a debt would be a wrong answer rather than
 * a missing one.
 */
const WITH_WORD = new RegExp(
  '\\b(?:pending|outstanding|owe|owes|owed|owing|left|remaining|still open|open with|due with)\\b|' +
    '\\b(?:anything|everything|what|whats|all)\\b[^?\u061F]{0,24}\\b(?:with|for|from)\\b|' +
    ar(`(?<![${AR_LETTER}])(?:باقي|متبقي|فاضل|لسه|المتبقي|الباقي|مستحق)(?![${AR_LETTER}])`).source,
  'i'
);

/**
 * "Did Sara reply?" — one person's side of a follow-up, asked the way people
 * ask it. `WAITING_WORD` is the *list* of everyone owed a reply; this is one
 * name, and the two are told apart by whether the question opens with "who".
 */
const REPLIED_WORD = new RegExp(
  "\\b(?:did|has|have|hasn(?:'|\u2019)?t|haven(?:'|\u2019)?t)\\b[^?\u061F]{0,24}\\b(?:repl(?:y|ied)|answer(?:ed)?|respond(?:ed)?|got back|get back|come back|came back)\\b|" +
    ar(`(?<![${AR_LETTER}])(?:رد|ردت|ردوا|جاوب|جاوبت|جاوبوا|رجع لي|ردها|رده)(?![${AR_LETTER}])`).source,
  'i'
);

/**
 * Arabic says "with" and nothing more: "وش عندي مع عمر؟" is the same
 * question as "what do I have with Omar?", which the English pattern above
 * already reads.
 *
 * Bare مع is far too common to sit in `WITH_WORD` — "تكلمت مع سارة" is a
 * history question and "ارسل العرض مع سارة" is a task — so it counts only
 * when the question names one person the app knows, only in a question, and
 * only after the history and detail questions have had their turn.
 */
const AR_WITH_WORD = ar(`(?<![${AR_LETTER}])مع(?![${AR_LETTER}])`);

/**
 * Words too common to find a task by. Everything that opens a question, the
 * articles and the auxiliaries: without this list "what is the plan?" would
 * match every task with "is" in it, which is a search that always succeeds
 * and therefore never answers anything.
 */
const STOP_WORDS = new Set([
  'what', 'whats', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'the', 'and', 'for', 'with', 'from', 'about',
  'did', 'does', 'do', 'done', 'have', 'has', 'had', 'got', 'get', 'was', 'were', 'are', 'is', 'am', 'been', 'being', 'will',
  'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall', 'any', 'anything', 'something', 'everything', 'all',
  'some', 'my', 'mine', 'me', 'our', 'ours', 'you', 'your', 'his', 'her', 'hers', 'its', 'their', 'them', 'they', 'this',
  'that', 'these', 'those', 'there', 'here', 'now', 'then', 'again', 'still', 'left', 'open', 'next', 'last', 'time', 'times',
  'show', 'tell', 'give', 'find', 'list', 'need', 'want', 'know', 'see', 'look', 'much', 'many', 'more', 'most', 'please',
  'يوم', 'ايه', 'إيه', 'وش', 'ايش', 'إيش', 'مين', 'منو', 'متى', 'امتى', 'إمتى', 'فين', 'وين', 'كيف', 'ازاي', 'إزاي', 'ليش',
  'كم', 'كام', 'هل', 'عندي', 'عندك', 'على', 'عن', 'في', 'من', 'مع', 'الى', 'إلى', 'اللي', 'التي', 'الذي', 'هذا', 'هذه',
  'هذي', 'ده', 'دي', 'كان', 'يكون', 'لسه', 'باقي', 'فاضل', 'شي', 'شيء', 'حاجة', 'حاجه', 'ورني', 'وريني', 'اعرض', 'هات',
]);

/**
 * The person already being talked about: "and her email?", "his number".
 * English needs the pronoun; Arabic usually carries it inside the word —
 * "رقمها" is already in `PHONE_WORD` — so a question with no name in it is
 * the real signal, and this only widens it.
 */
const PRONOUN_WORD = new RegExp(
  '\\b(?:he|him|his|she|her|hers|they|them|their|that one)\\b|' +
    ar(`(?<![${AR_LETTER}])(?:هو|هي|له|لها|عنه|عنها|معه|معها|إياه|اياها)(?![${AR_LETTER}])`).source,
  'i'
);

/**
 * The question is about the person asking, not about anybody remembered.
 * "What's my number?" must never be answered with the last person's.
 */
const MINE_WORD = new RegExp(
  '\\b(?:my|mine)\\b|' + ar(`(?<![${AR_LETTER}])(?:رقمي|ايميلي|إيميلي|بريدي|حسابي|عندي|لي)(?![${AR_LETTER}])`).source,
  'i'
);

/**
 * A name a *question* is about, which `candidateName` does not find: it
 * reads task sentences, where a name follows a verb, and "what's Jane's
 * number?" has no verb in it.
 *
 * Only two shapes, both unambiguous: the English possessive ("Jane's"),
 * minus the contractions that look like one, and an Arabic name standing
 * after the thing being asked for ("رقم جين"), minus anything with the
 * article on it, which makes it a thing rather than a person.
 *
 * It exists for one decision: whether a question names somebody. Found in
 * a browser run — with Sara remembered from the question before,
 * "what's Jane's number?" came back with Sara's number, because nothing
 * noticed that a different person had been named.
 */
const CONTRACTION = new Set([
  'what', 'that', 'it', 'there', 'here', 'who', 'let', 'he', 'she', 'how', 'where', 'when', 'why', 'this', 'one', 'today', 'tomorrow', 'everyone', 'someone', 'anyone', 'nobody',
]);
const POSSESSIVE = /(?:^|\s)(\p{L}[\p{L}'’-]*)(?:'|’)s\b/giu;
const AR_AFTER = new RegExp(ar('(?:رقم|ايميل|إيميل|بريد|جوال|تليفون|موبايل)').source + `\\s+([${AR_LETTER}]{2,})`, 'u');
const AR_NOT_A_NAME = new Set(['الجوال', 'الهاتف', 'التليفون', 'الموبايل', 'العمل', 'البيت', 'الشركة', 'المكتب']);

export function namedInQuestion(text: string): string | null {
  for (const [, word] of text.matchAll(POSSESSIVE)) {
    if (!word || CONTRACTION.has(word.toLowerCase())) continue;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  const arabic = AR_AFTER.exec(text);
  const after = arabic?.[1];
  if (after && !/^ال/.test(normalizeArabic(after)) && !AR_NOT_A_NAME.has(after)) return after;
  return null;
}

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
 * The same list as one entry per person, most overdue first. Four emails to
 * Maria are one person owing a reply, so "Who am I waiting on?" names her
 * once, and "Replied" closes all four.
 */
export function waitingByPerson(items: FollowUp[]): FollowUp[][] {
  const groups = new Map<string, FollowUp[]>();
  for (const f of items) {
    const key = f.contactId ? `id:${f.contactId}` : `who:${f.who.trim().toLowerCase()}`;
    const group = groups.get(key);
    if (group) group.push(f);
    else groups.set(key, [f]);
  }
  return [...groups.values()];
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

/**
 * The one thing to do now: the most overdue if anything is late, otherwise
 * the soonest still to come. Null when nothing open has a time on it — which
 * is an answer, not an empty list.
 */
export function nextTask(world: DataWorld): Task | null {
  const late = tasksIn('late', world);
  if (late.length > 0) return late[0] ?? null;
  const nowMs = world.now.getTime();
  const ahead = world.tasks
    .filter((task) => task.status === 'open' && task.dueAt !== null && Date.parse(task.dueAt) >= nowMs)
    .sort((a, b) => Date.parse(a.dueAt ?? '') - Date.parse(b.dueAt ?? ''));
  return ahead[0] ?? null;
}

/**
 * What was actually done in a stretch, newest first — history entries, which
 * carry a date. Not tasks: `Task` has no finished-at, so "how many did I
 * close today" cannot be answered honestly and is not answered at all
 * (`src/features/recap/week.ts` settled that).
 */
export function logIn(span: 'today' | 'yesterday' | 'week', world: DataWorld): HistoryEntry[] {
  const start = new Date(world.now);
  start.setHours(0, 0, 0, 0);
  const midnight = start.getTime();
  // Yesterday is a day with an end as well as a beginning; the other two run
  // up to now. Answering "who did I call yesterday?" with today's log would
  // be a wrong answer rather than a missing one.
  const from = span === 'week' ? midnight - 6 * DAY_MS : span === 'yesterday' ? midnight - DAY_MS : midnight;
  const until = span === 'yesterday' ? midnight : world.now.getTime();
  return world.history
    .filter((entry) => {
      const at = Date.parse(entry.at);
      return Number.isFinite(at) && at >= from && at < until;
    })
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

/** Whether a task or a follow-up is about this person at all. */
const aboutPerson = (who: string | undefined, ids: readonly string[] | undefined, contact: Contact): boolean => {
  if (ids?.includes(contact.id)) return true;
  if (!who) return false;
  // A task typed as "Call Sara" carries her name as text and no id, which is
  // most of them: the first word of the stored name is what a person types.
  const said = fold(who);
  const full = fold(contact.name);
  const first = fold(displayName(contact.name));
  return said.includes(full) || (first.length >= 2 && said.includes(first));
};

/**
 * Everything still open with one person: their own tasks, soonest first, and
 * every reply they still owe.
 *
 * Undated tasks are kept rather than dropped, unlike `tasksIn`. There a
 * question about *a day* can only be answered by things with a day on them;
 * here the question is about a person, and "send Sara the contract, no date
 * yet" is exactly the thing being asked after.
 */
export function openWith(contact: Contact, world: DataWorld): { tasks: Task[]; followUps: FollowUp[] } {
  const at = (task: Task) => (task.dueAt ? Date.parse(task.dueAt) : Number.POSITIVE_INFINITY);
  const tasks = world.tasks
    .filter((task) => task.status === 'open' && aboutPerson(task.who, task.contactIds, contact))
    .sort((a, b) => at(a) - at(b));
  const followUps = world.followUps
    .filter((f) => f.status !== 'done' && aboutPerson(f.who, f.contactId ? [f.contactId] : [], contact))
    .sort((a, b) => Date.parse(a.nextAt ?? a.createdAt ?? '') - Date.parse(b.nextAt ?? b.createdAt ?? ''));
  return { tasks, followUps };
}

/** The words of a question worth matching a task by. */
export function contentWords(text: string): string[] {
  const out: string[] = [];
  for (const raw of fold(text).split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 3) continue;
    if (STOP_WORDS.has(raw)) continue;
    if (/^\d+$/.test(raw)) continue;
    if (!out.includes(raw)) out.push(raw);
  }
  return out;
}

/**
 * An open task the question names rather than describes: "when is the
 * dentist?", "what time is the bank meeting?".
 *
 * Reached only where the answer would otherwise be "I can't help with
 * that", so at worst it turns a refusal into a wrong task — which is why
 * the match is on the question's *content* words and a bare question with
 * none of them finds nothing. Most hits first, then soonest.
 */
export function findTasks(text: string, world: DataWorld): Task[] {
  const words = contentWords(text);
  if (words.length === 0) return [];
  const at = (task: Task) => (task.dueAt ? Date.parse(task.dueAt) : Number.POSITIVE_INFINITY);
  return world.tasks
    .filter((task) => task.status === 'open')
    .map((task) => ({ task, hits: words.filter((w) => fold([task.title, task.who ?? '', task.notes ?? ''].join(' ')).includes(w)).length }))
    .filter((scored) => scored.hits > 0)
    .sort((a, b) => b.hits - a.hits || at(a.task) - at(b.task))
    .map((scored) => scored.task);
}

/** Which detail of a person the question wants. */
function wantOf(text: string): Want | null {
  if (PHONE_WORD.test(text)) return 'phone';
  if (EMAIL_WORD.test(text)) return 'email';
  if (WORK_WORD.test(text)) return 'work';
  if (ABOUT_WORD.test(text)) return 'all';
  return null;
}

/** A person named in the question, or what to ask back. */
function personAnswer(text: string, want: Want, world: DataWorld, about: Subject = null): DataAnswer {
  const found = readWho(text, world.contacts as Contact[]);
  if (!found) {
    // Nobody named, and a person already being talked about: "and her
    // email?" is about them. Never when the question says "my", and never
    // when it names somebody — "what's Jane's number?" is about Jane, who
    // is not in People, and answering it with the last person's number
    // would be worse than saying so.
    const named = candidateName(text) ?? (namedInQuestion(text) ? { word: namedInQuestion(text) as string } : null);
    if (about && !named && !MINE_WORD.test(text)) return { kind: 'person', want, contact: about.contact };
    return { kind: 'nobody', name: named?.word ?? null, want };
  }
  if (found.kind === 'one') return { kind: 'person', want, contact: found.contact };
  return { kind: 'who', name: found.name, options: found.options, want };
}

/**
 * The question, answered — or null when it is not a question and should go to
 * the parser as before.
 *
 * The order matters. A person named with a history word is about the history;
 * a person named with a detail word is about the detail; and the stretches of
 * the list come before the catch-all, so "what's late?" never reaches it.
 */
export function askData(text: string, world: DataWorld, about: Subject = null): DataAnswer | null {
  // Diacritics and the stretching tatweel are dropped: "مردّش" is asked the same as "مردش".
  const t = text.trim().replace(/[\u064B-\u0652\u0640]/g, '');
  if (t === '') return null;
  // "I told Omar I'd send it", "waiting for Sara to reply": something to
  // remember, not something to look up. `loopOf` declines a sentence that
  // *opens* as a question, but it strips the trailing mark before testing,
  // so "is Sara waiting on me?" reached it as a follow-up to record and the
  // question went unanswered. A mark at the end is the plainest statement of
  // intent there is, and `isQuestion` already treats it as decisive.
  if (!/[?؟]\s*$/.test(t) && loopOf(t, world.contacts as Contact[])) return null;
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
  // "When did I last talk to him?" — the person is the one the last answer
  // was about, which is the only place a pronoun can point.
  const carried = !named && !MINE_WORD.test(t) ? (about?.contact ?? null) : null;
  if (HISTORY_WORD.test(t) && !named && carried) {
    return { kind: 'history', contact: carried, entries: historyWith(carried, world) };
  }
  // Only with somebody named: "who haven't I talked to?" is the list above,
  // not a history nobody is in.
  if (HISTORY_WORD.test(t) && named) {
    if (named.kind === 'several') return { kind: 'who', name: named.name, options: named.options, want: 'all' };
    return { kind: 'history', contact: named.contact, entries: historyWith(named.contact, world) };
  }

  // --- what is open with one person -----------------------------------
  // After the history questions, which are also asked with a name and the
  // word "with", and before the lists, because a name makes the question
  // specific: "is Sara waiting on me?" is about Sara, while "who's waiting?"
  // is about everybody. A question opening with "who" is always the list.
  const asksOpen =
    WITH_WORD.test(t) ||
    REPLIED_WORD.test(t) ||
    (AR_WITH_WORD.test(t) && named?.kind === 'one') ||
    (WAITING_WORD.test(t) && !WHO_OPENER.test(t));
  if (asksOpen && !QUIET_WORD.test(t) && !wantOf(t)) {
    if (named?.kind === 'several') return { kind: 'who', name: named.name, options: named.options, want: 'all' };
    // `carried` lets "did she reply?" follow the person the chat is about,
    // the same thread memory a detail question already has.
    const person = named?.kind === 'one' ? named.contact : carried;
    if (person) return { kind: 'withPerson', contact: person, ...openWith(person, world) };
  }

  const want = wantOf(t);
  if (want && !listy) {
    // A detail word with nobody named is a question about People, not a person.
    if (named || want !== 'all') return personAnswer(t, want, world, about);
  }

  // --- the lists ------------------------------------------------------
  if (QUIET_WORD.test(t)) return { kind: 'quiet', items: quietIn(world) };
  if (waiting) return { kind: 'waiting', items: waitingIn(world) };
  // A history word and nobody we know: say who is missing rather than guess
  // — unless the question is about a stretch of time rather than a person.
  // "Who did I call yesterday?" reads as both, and it is the day being
  // asked about, so the log answers it below.
  if (HISTORY_WORD.test(t) && !LOG_WORD.test(t)) return { kind: 'nobody', name: null, want: 'all' };

  // --- the day itself -------------------------------------------------
  // Before the stretches of the list, because each of these is asked with
  // "today" in it and none of them is the day's list.
  if (ONE_THING_WORD.test(t)) return { kind: 'oneThing', oneThing: world.oneThing };
  if (NEXT_WORD.test(t)) {
    const task = nextTask(world);
    const late = task?.dueAt ? Date.parse(task.dueAt) < world.now.getTime() : false;
    return { kind: 'next', task, ...(late ? { late } : {}) };
  }
  if (LOG_WORD.test(t)) {
    const span = WEEK_WORD.test(t) ? 'week' : YESTERDAY_WORD.test(t) ? 'yesterday' : 'today';
    return { kind: 'log', span, entries: logIn(span, world) };
  }

  if (LATE_WORD.test(t)) return { kind: 'tasks', span: 'late', tasks: tasksIn('late', world) };
  if (TOMORROW_WORD.test(t)) return { kind: 'tasks', span: 'tomorrow', tasks: tasksIn('tomorrow', world) };
  if (WEEK_WORD.test(t)) return { kind: 'tasks', span: 'week', tasks: tasksIn('week', world) };
  if (TODAY_WORD.test(t) || intentOf(t) === 'plan') return { kind: 'tasks', span: 'today', tasks: tasksIn('today', world) };
  // "What tasks do I have?" with no day in it is today's list: the day is
  // what this app is about, and a list of everything open is not an answer.
  if (TASKS_WORD.test(t)) return { kind: 'tasks', span: 'today', tasks: tasksIn('today', world) };

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
  // "What about him?", "who is she?" — the person the chat is already about.
  if (carried && PRONOUN_WORD.test(t)) return { kind: 'person', want: 'all', contact: carried };

  // Last of all: the question may name a *task* rather than a person —
  // "when is the dentist?". Only reached where the answer would otherwise
  // be "I can't help with that", so it can only turn a refusal into an
  // answer, never take a question away from one that was already right.
  const like = findTasks(t, world);
  if (like.length > 0) return { kind: 'findTask', query: t, tasks: like };

  // A question, and none of the above.
  return { kind: 'unknown' };
}

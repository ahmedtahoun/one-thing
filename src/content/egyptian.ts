/**
 * Egyptian Arabic, from the app's Arabic copy.
 *
 * The Arabic copy is written once, in Gulf Arabic, across ~1,300 strings.
 * Writing all of them a second time would mean two copies that drift apart
 * every time a sentence changes, so Egyptian is made from the Gulf text: a
 * table of the words and short phrases that differ between the two (وش →
 * إيه, ما فيه → مفيش, الحين → دلوقتي, تبي → عايز, جوال → موبايل …), then
 * the Egyptian negation (ما خلصت → مخلصتش), then `EXACT` for the lines a
 * word swap cannot get right and that people read most.
 *
 * Only whole words are swapped: a rule never fires inside a longer word, and
 * a leading و / ف / ب / ل stays attached ("ووش" → "وإيه"). Names, numbers,
 * Latin text and placeholders like {n} pass through untouched.
 *
 * The privacy policy, the terms and the microphone notice are left exactly
 * as written: they are the text a lawyer approved, and the notice has to be
 * the policy's own words (src/features/voice/mic-notice.test.ts).
 */
import { EGYPTIAN_LINES } from './egyptian-lines';

/** An Arabic letter or mark, for "not inside a longer word". */
const L = '\\u0621-\\u064A\\u064B-\\u0652\\u0670';
const word = (src: string, prefix = true): RegExp => new RegExp(`(?<![${L}])(${prefix ? '[وفبل]?' : ''})(?:${src})(?![${L}])`, 'g');

/**
 * The words after which ما means "what" or "as long as", not "not":
 * "متى ما تبي", "طول ما", "قبل ما", "بدل ما", "حسب ما".
 */
const RELATIVE_BEFORE = /(?:حسب|كل|مثل|زي|بعد|قبل|بدل|بدون|عن|على|من|اللي|لما|بما|متى|إمتى|وقت|طول|لحد|لين|أول|اول)\s+$/;

/** A fixed negation, unless ما there means "what" ("قبل ما أحد ينتظر"). */
const negation = (src: string, to: string): [RegExp, string | ((...a: string[]) => string)] => [
  word(src),
  (all: string, prefix: string, offset: unknown, text: unknown) =>
    typeof offset === 'number' && typeof text === 'string' && RELATIVE_BEFORE.test(text.slice(0, offset)) ? all : `${prefix}${to}`,
];

const FIXED_NEGATION: [RegExp, string | ((...a: string[]) => string)][] = [
  negation('ما فيه أحد|ما في أحد|ما أحد|ما حد', 'محدش'),
  negation('ما فيه شيء|ما فيه شي|ما في شيء|ما في شي', 'مفيش حاجة'),
  negation('ما فيه|ما في', 'مفيش'),
  negation('ما عندي', 'معنديش'),
  negation('ما عندك', 'معندكش'),
  negation('ما عنده', 'معندوش'),
  negation('ما عندها', 'معندهاش'),
  negation('ما عندهم', 'معندهمش'),
  negation('ما يحتاج|ما تحتاج', 'مش محتاج'),
  negation('ما هو|ما هي|ما هم', 'مش'),
  [word('مو|مب'), '$1مش'],
];

/**
 * "ما خلصت" → "مخلصتش", "ما ردّت" → "مردّتش", "ما راح تزاحم" → "مش
 * هتزاحم": ما before a verb becomes م…ش around it. A word starting ال or م
 * is a noun or already negated and left alone, as is ما after a word that
 * makes it "what".
 */
function negate(text: string): string {
  return text.replace(
    new RegExp(`(?<![${L}])([وف]?)ما\\s+([${L}]{3,})(?:\\s+([${L}]+))?(?![${L}])`, 'g'),
    (all, prefix: string, verb: string, next: string | undefined, offset: number) => {
      if (RELATIVE_BEFORE.test(text.slice(0, offset))) return all;
      const rest = next ? ` ${next}` : '';
      if (verb === 'راح' && next) return `${prefix}مش ه${next.replace(/^[أا]/, '')}`;
      if (/^(?:عايز|محتاج|مستني)/.test(verb)) return `${prefix}مش ${verb}${rest}`;
      if (/^(?:ال|م|ان|اسم|رقم)/.test(verb) || ['لم', 'لا', 'لن', 'كان', 'دام', 'زال'].includes(verb)) return all;
      const stem = verb.endsWith('ى') ? `${verb.slice(0, -1)}ا` : verb;
      return `${prefix}م${stem}ش${rest}`;
    }
  );
}

/** Gulf → Egyptian, longest phrases first. `$1` keeps a leading و / ف / ب / ل. */
const RULES: [RegExp, string][] = [
  // Whole phrases first.
  [word('متى ما تبي|وقت ما تبي|متى ما تبغى|وقت ما تبغى'), '$1وقت ما تحب'],
  [word('اللي تبي|اللي تبغى'), '$1اللي انت عايزه'],
  [word('لين الحين'), '$1لحد دلوقتي'],
  [word('هذا المساء'), '$1النهارده بالليل'],
  // Egypt puts "this" after the noun: الأسبوع ده, البطاقة دي.
  [new RegExp(`(?<![${L}])([وفبل]?)هذا\\s+((?!اللي)ال[${L}]+)`, 'g'), '$1$2 ده'],
  [new RegExp(`(?<![${L}])([وفبل]?)(?:هذي|هذه)\\s+((?!اللي)ال[${L}]+)`, 'g'), '$1$2 دي'],
  // Things that agree in gender once شي becomes حاجة.
  [word('شي واحد|شيء واحد|حاجة واحد'), '$1حاجة واحدة'],
  [word('شي صغير|شيء صغير|حاجة صغير'), '$1حاجة صغيرة'],
  [word('شي متأخر|شيء متأخر|حاجة متأخر'), '$1حاجة متأخرة'],
  [word('شي مسجّل|شيء مسجّل|حاجة مسجّل'), '$1حاجة متسجلة'],
  [word('شي مجدول|شيء مجدول|حاجة مجدول'), '$1حاجة متجدولة'],
  [word('شي مقفول|شيء مقفول|حاجة مقفول'), '$1حاجة مقفولة'],
  [word('شي ينقل|شيء ينقل|حاجة ينقل'), '$1حاجة تتنقل'],
  [word('شي يحتاجك|شيء يحتاجك|حاجة يحتاجك'), '$1حاجة محتاجاك'],
  [word('شي نعرضه|شيء نعرضه|حاجة نعرضه'), '$1حاجة نعرضها'],
  [word('شي يتزامن|شيء يتزامن|حاجة يتزامن'), '$1حاجة تتزامن'],
  [word('شي شاغل|شيء شاغل'), '$1حاجة شاغلة'],
  [word('شيئين'), '$1حاجتين'],
  // Questions.
  [word('وش|ايش|إيش'), '$1إيه'],
  [word('ليش'), '$1ليه'],
  [word('وين'), '$1فين'],
  [word('كيف|شلون'), '$1إزاي'],
  [word('متى'), '$1إمتى'],
  [word('كم'), '$1كام'],
  // Wanting.
  [word('تبيني'), '$1عايزني'],
  [word('تبينا'), '$1عايزنا'],
  [word('تبيه|تبغاه'), '$1عايزه'],
  [word('تبيها|تبغاها'), '$1عايزها'],
  [word('تبين|تبغين'), '$1عايزة'],
  [word('تبون|تبغون|نبي|نبغى'), '$1عايزين'],
  [word('تبي|تبغى|أبي|ابي|أبغى|ابغى|يبي|يبغى'), '$1عايز'],
  [word('ودك'), '$1نفسك'],
  // Reminding.
  [word('ذكّرني|ذكرني'), '$1فكّرني'],
  [word('ذكّريني|ذكريني'), '$1فكّريني'],
  [word('أذكّرك|أذكرك|اذكرك'), '$1أفكّرك'],
  [word('نذكّرك|نذكرك'), '$1نفكّرك'],
  [word('بذكّرك|بذكرك'), '$1هفكّرك'],
  // Time.
  [word('اللحين|الحين'), '$1دلوقتي'],
  [word('للحين'), '$1لسه'],
  [word('أمس|امس'), '$1امبارح'],
  [word('باكر'), '$1بكرة'],
  [new RegExp(`(?<![${L}])بعد(?=\\s*(?:[.،؟!]|$))`, 'g'), 'لسه'],
  // This, that, so.
  [word('هذا'), '$1ده'],
  [word('هذي|هذه'), '$1دي'],
  [word('هذولا|هذول|هؤلاء'), '$1دول'],
  [word('كذا'), '$1كده'],
  // Doing, happening, becoming.
  [word('تسويها'), '$1تعملها'],
  [word('تسويه'), '$1تعمله'],
  [word('تسوي'), '$1تعمل'],
  [word('أسوي|اسوي'), '$1أعمل'],
  [word('يسوي'), '$1يعمل'],
  [word('نسوي'), '$1نعمل'],
  [word('سوّيت|سويت'), '$1عملت'],
  [word('سوّى|سوى'), '$1عمل'],
  [word('صارت'), '$1حصلت'],
  [word('صار'), '$1حصل'],
  [word('يصير'), '$1يبقى'],
  [word('تصير'), '$1تبقى'],
  [word('خلّك|خلك'), '$1خليك'],
  [word('عطني'), '$1إديني'],
  // Sending.
  [word('أُرسلت'), '$1اتبعتت'],
  [word('أرسلت'), '$1بعت'],
  [word('يُرسل'), '$1يتبعت'],
  [word('أرسلها|ارسلها'), '$1ابعتها'],
  [word('أرسله|ارسله'), '$1ابعته'],
  [word('أرسل|ارسل'), '$1ابعت'],
  [word('يرسل'), '$1يبعت'],
  [word('ترسلها'), '$1تبعتها'],
  [word('ترسله'), '$1تبعته'],
  [word('ترسل'), '$1تبعت'],
  [word('نرسل'), '$1نبعت'],
  // Waiting and giving.
  [word('ينتظرك'), '$1يستناك'],
  [word('ينتظرون|ينتظروا'), '$1يستنوا'],
  [word('ينتظر'), '$1يستنى'],
  [word('تنتظر'), '$1تستنى'],
  [word('ننتظر'), '$1نستنى'],
  [word('أنتظر|انتظر'), '$1استنى'],
  [word('يعطيها'), '$1يديها'],
  [word('يعطيك'), '$1يديك'],
  [word('تعطينا'), '$1تدينا'],
  [word('يعطينا'), '$1يدينا'],
  [word('وحدة'), '$1واحدة'],
  // Things, people, amounts.
  [word('شيء|شي'), '$1حاجة'],
  [word('أشياء'), '$1حاجات'],
  [word('أحدًا|أحداً|أحد'), '$1حد'],
  [word('زين'), '$1كويس'],
  [word('وايد|كثير'), '$1كتير'],
  [word('كثيرة'), '$1كتيرة'],
  [word('أكثر|اكثر'), '$1أكتر'],
  [word('شوي'), '$1شوية'],
  [word('ثاني'), '$1تاني'],
  [word('ثانية'), '$1تانية'],
  [word('الثاني'), '$1التاني'],
  [word('أبدًا|أبداً|أبد'), '$1خالص'],
  [new RegExp(`(?<![${L}])([وفبل]?)لين(?=\\s+[تينأ])`, 'g'), '$1لحد ما'],
  [word('لين'), '$1لحد'],
  [word('إذا|اذا'), '$1لو'],
  [word('جوّالك|جوالك'), '$1موبايلك'],
  [word('جوّال|جوال'), '$1موبايل'],
  [word('الجوّال|الجوال'), '$1الموبايل'],
  [word('عليّ'), '$1عليا'],
  [word('أبشر'), '$1حاضر'],
  [word('تكفى'), '$1من فضلك'],
  // "Today", except "per day" (10 في اليوم).
  [new RegExp(`(?<![${L}])(?<!في )(و|ل)?اليوم(?![${L}])`, 'g'), '$1النهارده'],
];

/** "تاخذ" → "تاخد": the ذ Egypt says as د, only in the verb "take". */
const TAKE = new RegExp(`(?<![${L}])([وفبله]?)(تاخ|ناخ|ياخ|آخ|اخ)ذ(ها|ه|هم)?(?![${L}])`, 'g');

/**
 * Lines a word swap cannot get right, or that are read often enough to be
 * written by hand. Keyed by the Gulf text exactly.
 */
const EXACT: Record<string, string> = {
  'تنتظر ردّهم: {n}': 'مستني ردّهم: {n}',
  'ما فيه أحد تنتظر ردّه.': 'مفيش حد مستني ردّه.',
  '{n} ما ردّوا للحين': '{n} لسه مردّوش',
  'واحد ما ردّ للحين': 'واحد لسه مردّش',
  'مين ما ردّ؟': 'مين مردّش؟',
  'مين أنتظر منه رد؟': 'مين أنا مستني رده؟',
  'وصل الرد': 'ردّ عليّا',
  'مو موجود في الأشخاص.': 'مش موجود في الأشخاص.',
  'ما تواصلت معهم من فترة: {n}': 'متكلمتش معاهم من فترة: {n}',
  'أنتظر رد عمر على العقد': 'مستني رد عمر على العقد',
  'جرّب: «وعدت سارة اني ارسل لها العرض الخميس» أو «أنتظر رد عمر».': 'جرّب: «وعدت سارة إني أبعتلها العرض الخميس» أو «مستني رد عمر».',
  'وعدت سارة اني ارسل لها العرض الخميس': 'وعدت سارة إني أبعتلها العرض الخميس',
  'أيوه، ذكّرني': 'أيوه، فكّرني',
  // Egyptian asks with إيه at the end.
  'وش تشتغل؟': 'بتشتغل إيه؟',
  'وش تحب نناديك؟': 'تحب نناديك بإيه؟',
  'وش رقم جوالك؟': 'رقم موبايلك إيه؟',
  'وش سبب الزيارة؟': 'الزيارة عشان إيه؟',
  'وش تبي تتعلّم؟': 'عايز تتعلّم إيه؟',
  'وش صار؟': 'إيه اللي حصل؟',
  'كيف كان يومك؟': 'يومك كان عامل إزاي؟',
  'كيف تبيني أذكّرك؟': 'عايزني أفكّرك إزاي؟',
  'متى أذكّرك؟': 'أفكّرك إمتى؟',
  'متى يناسبك أكثر؟': 'إمتى يناسبك أكتر؟',
  'ترسل إيميل لمين؟': 'هتبعت إيميل لمين؟',
  'ترسل واتساب لمين؟': 'هتبعت واتساب لمين؟',
  'وش المتأخر؟': 'إيه اللي متأخر؟',
  'وش التالي؟': 'إيه اللي بعده؟',
  'وش في بالك؟': 'إيه اللي في بالك؟',
  'بهدوء افتراضياً، وتقدر تغيّرها متى ما تبي.': 'بهدوء من الأول، وتقدر تغيّرها وقت ما تحب.',
  'رسائل بين فترة وفترة. تقدر توقفها متى ما تبي.': 'رسايل كل فترة. تقدر توقفها وقت ما تحب.',
  'تمام. ما اسمه؟': 'تمام. اسمه إيه؟',
  'اليوم له شغلة وحدة فوق. «ابدأ التركيز» يعطيها ٤٥ دقيقة بهدوء، وكل شي ثاني ينتظر.': 'النهارده فيه حاجة واحدة فوق الكل. «ابدأ التركيز» بيديلها ٤٥ دقيقة بهدوء، وكل حاجة تانية تستنى.',
  'تمام، {n}. ما رقمه أو إيميله؟': 'تمام، {n}. رقمه أو إيميله إيه؟',
  'ما عاد يحتاج': 'مبقاش محتاج',
  'ما عليك شي': 'مفيش عليك حاجة',
  'ما عندك أحد محفوظ بهذا.': 'معندكش حد محفوظ بالاسم ده.',
  'وش تشتغل؟ (اختياري)': 'بتشتغل إيه؟ (اختياري)',
  'هنا يطلع لك وش تسوي بعدين': 'هنا هيطلعلك هتعمل إيه بعدين',
  'المسودة جاهزة · ما انرسلت': 'المسودة جاهزة · متبعتتش',
  'لا، ما أرسلتها لسا': 'لا، لسه مبعتهاش',
  'قل لنا وش صار أو وش تبينا نغيّر:': 'قولنا إيه اللي حصل أو عايزنا نغيّر إيه:',
};

/** Copy that must stay exactly as written: see the note at the top. */
const KEEP = new Set(['terms', 'priv', 'micNotice']);

const cache = new Map<string, string>();

/** One string in Egyptian. Strings with no Arabic in them come back as they are. */
export function toEgyptian(text: string): string {
  if (!/[؀-ۿ]/.test(text)) return text;
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  let out = EGYPTIAN_LINES[text] ?? EXACT[text];
  if (out === undefined) {
    out = text;
    for (const [rule, to] of FIXED_NEGATION) out = out.replace(rule, to as string);
    for (const [rule, to] of RULES) out = out.replace(rule, to);
    out = negate(out);
    out = out.replace(TAKE, '$1$2د$3');
  }
  cache.set(text, out);
  return out;
}

const objects = new WeakMap<object, unknown>();

/** A whole copy object (C.ar, added('ar') …) in Egyptian, made once and kept. */
export function egyptian<T>(copy: T): T {
  if (typeof copy === 'string') return toEgyptian(copy) as T;
  if (!copy || typeof copy !== 'object') return copy;
  const known = objects.get(copy as object);
  if (known) return known as T;
  const out = (Array.isArray(copy)
    ? copy.map((item) => egyptian(item))
    : Object.fromEntries(Object.entries(copy as Record<string, unknown>).map(([k, v]) => [k, KEEP.has(k) ? v : egyptian(v)]))) as T;
  objects.set(copy as object, out);
  return out;
}

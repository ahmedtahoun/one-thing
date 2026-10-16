/**
 * The small things a person says to an assistant that are not tasks: "hi",
 * "what can you do?", "thanks", "what's Sara's number?". Recognised on the
 * device, answered without spending one of the day's Assistant requests.
 * English, Gulf / standard Arabic and Egyptian Arabic.
 */
import { AR_LETTER, normalizeArabic } from './names';

export type Small =
  | { kind: 'hello' }
  | { kind: 'thanks' }
  | { kind: 'help' }
  /** Asks for a detail of someone in People. The name is found by the caller, in the same text. */
  | { kind: 'lookup'; what: 'phone' | 'email' };

const END = '[\\s!.؟?،,]*$';
const HELLO = new RegExp(
  `^\\s*(?:hi|hello|hey|hiya|yo|good (?:morning|afternoon|evening)|salam|salaam|مرحبا|مرحبتين|اهلا|اهلين|هلا|هاي|هلو|السلام عليكم|سلام عليكم|صباح الخير|مساء الخير|صباحو|يا هلا)(?: there| assistant| بيك| فيك| يا مساعد)?${END}`,
  'i'
);
const THANKS = new RegExp(
  `^\\s*(?:thanks|thank you|thx|cheers|great thanks|شكرا|شكراً|شكرًا|مشكور|مشكورة|تسلم|تسلمي|يعطيك العافيه|يعطيك العافية|متشكر|ميرسي|الله يخليك|جزاك الله خير)(?: a lot| so much| جدا| كتير)?${END}`,
  'i'
);
const HELP =
  /\b(?:what can you do|what do you do|how do(?:es)? (?:this|it) work|how can you help|help me|help|what are you|who are you)\b|تقدر تعمل|تقدر تسوي|ايش تقدر|وش تقدر|ايه اللي تقدر|بتعمل ايه|بتعمل إيه|ساعدني|مساعده|مساعدة|كيف استخدم|ازاي استخدم|ايش تسوي|وش تسوي|انت مين|من انت/i;

const NUMBER_EN = /\b(?:what(?:'|’)?s|what is|give me|show me|tell me|find|get|look up|lookup|do i have)\b.*\b(number|phone|mobile|cell|email|e-?mail)\b|\b\w+(?:'|’)s\s+(number|phone|mobile|cell|email|e-?mail)\b.*\?/i;
const NUMBER_AR = new RegExp(
  `(?<![${AR_LETTER}])(?:رقم|ايميل|إيميل|موبايل|تليفون|رقمه|رقمها|ايميله|ايميلها)(?![${AR_LETTER}]).*(?:كام|ايه|إيه|وش|ايش|شو|\\?|؟|هات|ورني|اعطني|ابغى)|(?:كام|ايه|إيه|وش|ايش|شو|هات|ورني|اعطني|عطني|ابغى|ابي)\\s+(?:هو\\s+)?(?:رقم|ايميل|إيميل|موبايل|تليفون)`,
  'i'
);
const EMAILISH = /e-?mail|ايميل|إيميل|بريد/i;

export function smallTalk(text: string): Small | null {
  const t = text.trim();
  if (HELLO.test(normalizeArabic(t)) || HELLO.test(t)) return { kind: 'hello' };
  if (THANKS.test(normalizeArabic(t)) || THANKS.test(t)) return { kind: 'thanks' };
  // A question about someone's details, but not "save this number".
  if (NUMBER_EN.test(t) || NUMBER_AR.test(t)) {
    if (/\b(?:save|add|create|store|remind)\b|احفظ|سجل|ضيف|اضف|خزن|فكرني/i.test(t)) return null;
    return { kind: 'lookup', what: EMAILISH.test(t) ? 'email' : 'phone' };
  }
  // A short question, not a task that happens to say "help".
  if (t.split(/\s+/).length <= 7 && !/\bremind\b|\bto\b|فكرني|ذكرني/i.test(t) && HELP.test(t)) return { kind: 'help' };
  return null;
}

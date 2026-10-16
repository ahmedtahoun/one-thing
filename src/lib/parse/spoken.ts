/**
 * Turning what a recogniser writes down into what the person meant.
 *
 * Dictation is good at sentences and bad at data. A phone number comes back
 * as "zero five zero one two three", "٠٥٠ ١٢٣ ٤٥٦٧" or "صفر خمسة صفر واحد…";
 * an address as "ahmed dot tahoun at gmail dot com" or "احمد دوت طاهون آت
 * جيميل دوت كوم". Nothing here saves or decides anything — it only reads
 * digits and email addresses out of text, in English, standard / Gulf Arabic
 * and Egyptian Arabic, so a contact can be said instead of typed.
 *
 * Pure and offline: no model, no request.
 */
import { normalizeArabic } from './names';

// --- digits ----------------------------------------------------------------

const DIGIT_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  // Arabic, written the way normalizeArabic folds it (ة→ه, أ→ا).
  صفر: '0', زيرو: '0', واحد: '1', واحده: '1', وحده: '1',
  اثنين: '2', اتنين: '2', تنين: '2', اثنان: '2', اثنتين: '2',
  ثلاثه: '3', تلاته: '3', ثلاث: '3', تلات: '3',
  اربعه: '4', اربع: '4', خمسه: '5', خمس: '5', سته: '6', ست: '6', سبعه: '7', سبع: '7',
  ثمانيه: '8', تمانيه: '8', ثماني: '8', تمان: '8', تمنيه: '8', تسعه: '9', تسع: '9',
};
const MULTIPLIERS: Record<string, number> = { double: 2, triple: 3, دبل: 2, دابل: 2, تربل: 3, تريبل: 3 };
const PLUS_WORDS = new Set(['plus', 'زائد', 'بلس']);

/** Punctuation recognisers hang on the ends of words. */
const TRIM = /^[\s.,،;؛:!?؟"'“”()[\]]+|[\s.,،;؛:!?؟"'“”()[\]]+$/g;
const fold = (token: string): string => normalizeArabic(token.toLowerCase().replace(TRIM, ''));

/** Arabic-Indic and Persian digits → 0–9. */
export function westernDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** The digits a token stands for: "٠٥٠", "050-123", "خمسة", "وستة"; null when it is not a number. */
function digitsOf(token: string): { digits: string; word: boolean } | null {
  const plain = westernDigits(token.replace(TRIM, ''));
  if (/^\+?[\d().-]*\d[\d().-]*$/.test(plain)) return { digits: plain.replace(/\D/g, ''), word: false };
  const f = fold(token);
  const word = DIGIT_WORDS[f] ?? (f.startsWith('و') ? DIGIT_WORDS[f.slice(1)] : undefined);
  return word === undefined ? null : { digits: word, word: true };
}

/**
 * Joins the numbers in a sentence the way they are dictated: "zero five zero
 * 123 4567" → "0501234567", "double five" → "55", "plus two zero" → "+20".
 * A run made only of words needs five digits to count, so "one" in "one
 * moment" stays a word; digits written as digits are always joined.
 */
export function spokenDigits(text: string): string {
  const tokens = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    // A run starts here when this token (optionally after "plus") is a number.
    let j = i;
    let plus = false;
    if (PLUS_WORDS.has(fold(tokens[j] ?? '')) || tokens[j] === '+') {
      plus = true;
      j++;
    } else if ((tokens[j] ?? '').startsWith('+')) plus = true;
    let digits = '';
    let sawNumeral = false;
    let end = j;
    while (end < tokens.length) {
      const raw = tokens[end] ?? '';
      const multiplier = MULTIPLIERS[fold(raw)];
      const next = tokens[end + 1] === undefined ? null : digitsOf(tokens[end + 1] ?? '');
      if (multiplier && next) {
        digits += next.digits.repeat(multiplier);
        sawNumeral = true;
        end += 2;
        continue;
      }
      if (/^[-–—.]$/.test(raw) && digits && tokens[end + 1] && digitsOf(tokens[end + 1] ?? '')) {
        end++;
        continue;
      }
      const d = digitsOf(raw);
      if (!d) break;
      digits += d.digits;
      sawNumeral ||= !d.word;
      end++;
    }
    const joined = digits.length > 0 && (sawNumeral || digits.length >= 5);
    if (joined) {
      out.push((plus ? '+' : '') + digits);
      i = end;
    } else {
      out.push(tokens[i] ?? '');
      i++;
    }
  }
  return out.join(' ');
}

/** The first phone number in the text (7–15 digits, optional + or 00), and the text without it. */
export function extractPhone(text: string): { phone: string | null; rest: string } {
  const spoken = spokenDigits(text);
  const found = /(?<![\w@.])(\+|00)?\d{7,15}(?![\w@])/.exec(spoken);
  if (!found) return { phone: null, rest: text };
  const phone = found[0].replace(/^00/, '+');
  return { phone, rest: `${spoken.slice(0, found.index)} ${spoken.slice(found.index + found[0].length)}`.replace(/\s+/g, ' ').trim() };
}

// --- email -----------------------------------------------------------------

const AT_WORDS = new Set(['at', '@', 'ات', 'اتش', 'ايت']);
const DOT_WORDS = new Set(['dot', 'period', 'point', 'نقطه', 'دوت', 'بوينت', '.']);
const UNDERSCORE_WORDS = new Set(['underscore', 'اندرسكور', 'اندر']);
const DASH_WORDS = new Set(['dash', 'hyphen', 'داش', 'هايفن', 'شرطه']);
const LOCAL_STOP = new Set([
  'is', 'are', 'the', 'my', 'his', 'her', 'their', 'email', 'e-mail', 'mail', 'address', 'and', 'with', 'also', 'it', 'its', 'to', 'for',
  'ايميل', 'ايميله', 'ايميلها', 'الايميل', 'ميل', 'البريد', 'بريد', 'بريده', 'عنوان', 'هو', 'هي', 'و', 'ال', 'ده', 'دي', 'على', 'علي',
]);
const PROVIDERS: Record<string, string> = {
  gmail: 'gmail', جيميل: 'gmail', جيمايل: 'gmail', جميل: 'gmail',
  yahoo: 'yahoo', ياهو: 'yahoo', hotmail: 'hotmail', هوتميل: 'hotmail', outlook: 'outlook', اوتلوك: 'outlook',
  icloud: 'icloud', ايكلاود: 'icloud', live: 'live', لايف: 'live',
};
const TLDS: Record<string, string> = {
  com: 'com', كوم: 'com', net: 'net', نت: 'net', org: 'org', اورج: 'org', edu: 'edu', io: 'io', co: 'co', sa: 'sa', eg: 'eg', ae: 'ae', uk: 'uk',
};
/** Two-word providers recognisers split: "جي ميل", "هوت ميل". */
const PAIRS: Record<string, string> = { 'جي ميل': 'gmail', 'جي مايل': 'gmail', 'هوت ميل': 'hotmail', 'اوت لوك': 'outlook', 'اي كلاود': 'icloud' };

/** Common names, so a name said in Arabic letters gets the spelling people use in an address. */
const LATIN_NAMES: Record<string, string> = {
  احمد: 'ahmed', محمد: 'mohamed', محمود: 'mahmoud', مصطفي: 'mostafa', علي: 'ali', عمر: 'omar', عمرو: 'amr', خالد: 'khaled',
  يوسف: 'youssef', ابراهيم: 'ibrahim', اسماعيل: 'ismail', حسن: 'hassan', حسين: 'hussein', كريم: 'karim', طارق: 'tarek',
  سعيد: 'saeed', سالم: 'salem', فهد: 'fahad', سلطان: 'sultan', عبدالله: 'abdullah', عبدالرحمن: 'abdelrahman', ياسر: 'yasser',
  سارة: 'sara', ساره: 'sara', نوره: 'noura', نورا: 'noura', فاطمه: 'fatma', مريم: 'mariam', منى: 'mona', مني: 'mona',
  هدى: 'hoda', هدي: 'hoda', ليلى: 'laila', ليلي: 'laila', اميره: 'amira', دينا: 'dina', رنا: 'rana', ريم: 'reem',
};

const LETTERS: Record<string, string> = {
  ا: 'a', ب: 'b', ت: 't', ث: 's', ج: 'g', ح: 'h', خ: 'kh', د: 'd', ذ: 'z', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd',
  ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'o', ي: 'y', ء: '', ئ: 'e', ؤ: 'o',
};

/**
 * Arabic letters → Latin, for an address said in Arabic. Known names use their
 * usual spelling; others get a vowel between consonants. Always a guess —
 * the screen shows it for the person to correct.
 */
export function latinise(word: string): string {
  const key = normalizeArabic(word);
  const known = LATIN_NAMES[key];
  if (known) return known;
  let out = '';
  let lastWasConsonant = false;
  for (const ch of key) {
    const letter = LETTERS[ch];
    if (letter === undefined) {
      out += ch;
      lastWasConsonant = false;
      continue;
    }
    const vowel = ch === 'ا' || ch === 'و' || ch === 'ي' || ch === 'ع';
    if (!vowel && lastWasConsonant) out += 'a';
    out += letter;
    lastWasConsonant = !vowel;
  }
  return out;
}

const isFragment = (token: string): boolean => /^\w{1,2}$/.test(token) || /^\d+$/.test(token);

export type EmailReading = { email: string; guessed: boolean; rest: string };

/**
 * An email address, as written ("sara@gmail.com") or as said ("sara dot
 * haddad at gmail dot com", "ساره آت جيميل دوت كوم"). `guessed` is true when
 * Arabic letters had to be turned into Latin ones, or a missing ".com" was
 * assumed — the person should look at it. `rest` is the text without it.
 */
export function extractEmail(text: string): EmailReading | null {
  // Already an address.
  const written = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(westernDigits(text));
  if (written) {
    const at = text.indexOf(written[0]);
    const rest = at >= 0 ? `${text.slice(0, at)} ${text.slice(at + written[0].length)}` : text;
    return { email: written[0].toLowerCase(), guessed: false, rest: rest.replace(/\s+/g, ' ').trim() };
  }

  // "Two-word" providers become one token first.
  let source = text;
  for (const [pair, provider] of Object.entries(PAIRS)) source = source.replace(new RegExp(pair.trim().replace(' ', '\\s+'), 'g'), provider);
  const tokens = source.split(/\s+/).filter(Boolean);

  for (let at = 1; at < tokens.length; at++) {
    if (!AT_WORDS.has(fold(tokens[at] ?? ''))) continue;

    // The domain: a provider or word, then (dot word)* or a bare ending like كوم.
    let end = at + 1;
    const first = fold(tokens[end] ?? '');
    if (!first) continue;
    let domain = PROVIDERS[first] ?? first;
    let guessed = false;
    end++;
    for (;;) {
      const t = fold(tokens[end] ?? '');
      if (DOT_WORDS.has(t) && tokens[end + 1]) {
        const label = fold(tokens[end + 1] ?? '');
        domain += `.${PROVIDERS[label] ?? TLDS[label] ?? label}`;
        end += 2;
      } else if (TLDS[t] && !domain.includes('.')) {
        domain += `.${TLDS[t]}`;
        end++;
      } else break;
    }
    if (!domain.includes('.')) {
      if (!Object.values(PROVIDERS).includes(domain)) continue;
      domain += '.com';
      guessed = true;
    }
    // "gmail.com." and the like.
    domain = domain.replace(/\.+$/, '');

    // The local part: the word before "at", plus whatever is spelled onto it.
    let start = at - 1;
    const localOk = (t: string) => t.length > 0 && !LOCAL_STOP.has(fold(t));
    if (!localOk(tokens[start] ?? '')) continue;
    for (;;) {
      const first = fold(tokens[start] ?? '');
      const prevRaw = tokens[start - 1];
      if (prevRaw === undefined) break;
      const prev = fold(prevRaw);
      const connector = DOT_WORDS.has(prev) || UNDERSCORE_WORDS.has(prev) || DASH_WORDS.has(prev);
      const firstIsConnector = DOT_WORDS.has(first) || UNDERSCORE_WORDS.has(first) || DASH_WORDS.has(first);
      if (connector && tokens[start - 2] !== undefined && localOk(tokens[start - 2] ?? '')) start -= 2;
      else if (!connector && !firstIsConnector && isFragment(first) && localOk(prevRaw) && (isFragment(prev) || /^[a-z]+$|[؀-ۿ]/.test(prev))) start -= 1;
      else break;
    }

    let local = '';
    for (let k = start; k < at; k++) {
      const t = fold(tokens[k] ?? '');
      if (DOT_WORDS.has(t)) local += '.';
      else if (UNDERSCORE_WORDS.has(t)) local += '_';
      else if (DASH_WORDS.has(t)) local += '-';
      else {
        const digits = digitsOf(tokens[k] ?? '');
        const piece = /[؀-ۿ]/.test(t) && !digits ? latinise(t) : digits ? digits.digits : t;
        if (/[؀-ۿ]/.test(t) && !digits) guessed = true;
        local += piece;
      }
    }
    local = local.replace(/[^\w.+-]/g, '').toLowerCase();
    domain = domain
      .split('.')
      .map((label) => (/[؀-ۿ]/.test(label) ? latinise(label) : label))
      .join('.');
    if (/[؀-ۿ]/.test(domain)) guessed = true;
    if (!local || !/^[\w-]+(?:\.[\w-]+)+$/.test(domain)) continue;
    const rest = [...tokens.slice(0, start), ...tokens.slice(end)].join(' ');
    return { email: `${local}@${domain}`.toLowerCase(), guessed, rest };
  }
  return null;
}

// --- picking among alternatives ----------------------------------------------

/**
 * A recogniser offers several readings of the same sentence. When one of
 * them contains a name the person actually has, that reading is the one they
 * meant; otherwise the recogniser's own first choice stands.
 */
export function bestHeard(alternatives: { transcript: string; confidence?: number }[], names: string[]): string {
  const first = alternatives[0]?.transcript?.trim() ?? '';
  if (alternatives.length < 2 || names.length === 0) return first;
  const wanted = names.map((n) => fold(n)).filter((n) => n.length >= 3);
  let best = first;
  let bestScore = 0;
  alternatives.forEach((alternative) => {
    const heard = fold(alternative.transcript);
    // Names found, then the recogniser's own confidence to break a tie.
    const found = wanted.filter((name) => heard.includes(name)).length;
    const score = found === 0 ? 0 : found * 10 + Math.max(alternative.confidence ?? 0, 0);
    if (score > bestScore) {
      bestScore = score;
      best = alternative.transcript.trim();
    }
  });
  return best;
}

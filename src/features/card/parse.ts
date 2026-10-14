/**
 * What a business card says, from the lines a text reader found on it.
 *
 * OCR gives lines in roughly reading order and no idea which is which. A card
 * has a convention, though — a name, a job title, a company, a mobile, an
 * email — and these rules find each by what it looks like, in English and
 * Arabic, so the person only has to correct, not type. It proposes; the card
 * screen shows every field editable before anything is saved.
 */
import { splitDialled } from '@/lib/parse/contact';
import { westernDigits } from '@/lib/parse/spoken';

export type CardFields = {
  name?: string;
  /** "Title · Company", as the contact form shows it. */
  role?: string;
  dial?: string;
  phone?: string;
  email?: string;
};

const EMAIL = /[^\s@<>,;:]+@[^\s@<>,;]+\.[A-Za-z]{2,}/;
const SITE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|co|sa|ae|eg|app|dev|me|info|vc)\b(?!@)/i;
const ADDRESS = /\b(?:p\.?\s?o\.?\s?box|street|st\.|road|rd\.|avenue|ave\.|building|bldg|floor|tower|suite|district|zip|postcode)\b|ص\.?\s?ب|شارع|طريق|برج|حي |مبني|الدور|صندوق/i;
const FAX = /\b(?:fax|f)\s*[:.]|فاكس/i;
const MOBILE = /\b(?:mobile|mob|cell|m)\s*[:.]|\bwhats?app\b|جوال|موبايل|محمول|واتس/i;

const TITLE =
  /\b(?:ceo|cto|cfo|coo|cmo|founder|co-?founder|owner|president|vice president|vp|chairman|managing|director|manager|head of|lead|engineer|developer|designer|consultant|partner|sales|marketing|executive|specialist|officer|architect|doctor|dr\.?|attorney|lawyer|accountant|supervisor|assistant|advisor|analyst|coordinator)\b|مدير|رئيس|مؤسس|مهندس|مستشار|محامي|طبيب|دكتور|محاسب|مشرف|شريك|مسؤول|مسئول|خبير|نائب|مالك|صاحب|مصمم|مطور|منسق|اخصائي|أخصائي/i;
const COMPANY =
  /\b(?:ltd|llc|inc|corp|co\.|company|group|holding|holdings|trading|solutions|technologies|technology|studio|agency|bank|clinic|center|centre|enterprises|international|industries|services|consulting|partners|labs|ventures|capital|foundation|university|institute|factory|store|shop)\b|شركة|مؤسسة|مجموعة|للتجارة|للتقنية|للتسويق|للاستشارات|مكتب|مصنع|عيادة|مركز|بنك|أكاديمية|اكاديمية|وكالة|استوديو|جامعة|معهد|مطعم|مقهى/i;

const hasArabic = (s: string): boolean => /[؀-ۿ]/.test(s);
const words = (s: string): string[] => s.split(/\s+/).filter(Boolean);

/** "NORTHWIND VENTURES" → "Northwind Ventures"; mixed case is left as printed. */
function tidy(s: string): string {
  const clean = s.replace(/^[\s|•·\-–—:]+|[\s|•·\-–—:]+$/g, '').replace(/\s+/g, ' ');
  return /[a-z]/.test(clean) || !/[A-Z]/.test(clean) ? clean : clean.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** A line that could be a person's name: two to four words of letters, nothing else. */
function nameLike(line: string): boolean {
  if (line.length > 34 || /[\d@/\\]/.test(line)) return false;
  if (TITLE.test(line) || COMPANY.test(line) || ADDRESS.test(line) || SITE.test(line)) return false;
  const w = words(line);
  return w.length >= 2 && w.length <= 4 && w.every((x) => /^[\p{L}][\p{L}'’.\-]*$/u.test(x));
}

/**
 * Fields from OCR lines. `prefer` is the script a name should be in when the
 * card prints it twice, in English and in Arabic.
 */
export function parseCard(rawLines: readonly string[], options: { region?: string; prefer?: 'en' | 'ar' } = {}): CardFields {
  const lines = rawLines.map((l) => westernDigits(l).trim()).filter((l) => l.length > 1);
  const used = new Set<number>();
  const fields: CardFields = {};

  // Email.
  lines.forEach((line, i) => {
    const found = EMAIL.exec(line);
    if (found && !fields.email) {
      fields.email = found[0].replace(/^[(<]+|[)>.]+$/g, '').toLowerCase();
      used.add(i);
    }
  });

  // Phone: the labelled mobile first, then any number that is not a fax.
  const numbers: { line: number; text: string; score: number }[] = [];
  lines.forEach((line, i) => {
    if (used.has(i)) return;
    const found = /(?:\+|00)?\d[\d\s().-]{6,}\d/.exec(line);
    if (!found || found[0].replace(/\D/g, '').length < 7 || found[0].replace(/\D/g, '').length > 15) return;
    const score = FAX.test(line) ? -1 : MOBILE.test(line) ? 3 : /^\s*(?:\+|00)/.test(found[0]) ? 2 : 1;
    numbers.push({ line: i, text: found[0], score });
  });
  numbers.sort((a, b) => b.score - a.score || a.line - b.line);
  const best = numbers.find((n) => n.score > 0);
  if (best) Object.assign(fields, splitDialled(best.text.trim(), options.region));
  for (const n of numbers) used.add(n.line);

  // What is left: set aside the web address and the street, then read name, title and company.
  const rest = lines.map((text, i) => ({ text, i })).filter(({ text, i }) => !used.has(i) && !SITE.test(text) && !ADDRESS.test(text));

  const titleAt = rest.findIndex(({ text }) => TITLE.test(text) && !nameLike(text));
  let title = titleAt >= 0 ? (rest[titleAt]?.text ?? '') : '';
  let company = '';
  // "Founder, KitchenTrace" or "CEO at Northwind": a title with its company on the same line.
  const split = /^(.*?)(?:\s*,\s*|\s+at\s+|\s+@\s+|\s+[-–|]\s+)(.+)$/i.exec(title);
  if (split && TITLE.test(split[1] ?? '') && !TITLE.test(split[2] ?? '')) {
    title = split[1] ?? title;
    company = split[2] ?? '';
  }

  const candidates = rest.map((r, index) => ({ ...r, index })).filter(({ text }) => nameLike(text));
  const wanted = options.prefer === 'ar' ? hasArabic : (s: string) => !hasArabic(s);
  const pool = candidates.some(({ text }) => wanted(text)) ? candidates.filter(({ text }) => wanted(text)) : candidates;
  let pick = pool[0];
  if (titleAt >= 0) {
    // The name sits just above or below the title.
    pick = pool.find(({ index }) => index === titleAt - 1) ?? pool.find(({ index }) => index === titleAt + 1) ?? pool[0];
  }
  if (pick) fields.name = tidy(pick.text);

  if (!company) {
    const byWord = rest.find(({ text }) => COMPANY.test(text) && text !== pick?.text && !TITLE.test(text));
    if (byWord) company = byWord.text;
    else if (titleAt >= 0) {
      // No telltale word: the other line beside the title.
      const near = [rest[titleAt - 1], rest[titleAt + 1]].find((r) => r && r.text !== pick?.text && !nameLike(r.text) && r.text.length < 45);
      company = near?.text ?? '';
    }
  }
  const role = [title && tidy(title), company && tidy(company)].filter(Boolean).join(' · ');
  if (role) fields.role = role;
  return fields;
}

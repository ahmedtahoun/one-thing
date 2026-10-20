/**
 * Which Arabic the app speaks. `Lang` stays 'en' | 'ar' — direction, digits,
 * the parser and every `lang === 'ar'` check are the same for both — and the
 * dialect is a second choice that only changes the words: the Arabic copy is
 * written in Gulf Arabic, and "مصري" rewrites it in Egyptian
 * (src/content/egyptian.ts).
 *
 * Kept in a module setting as well as the language context, the way the
 * clock's language is (src/lib/clock-format.ts), so `added(lang)` — called
 * from deep inside label builders — answers in the right dialect without
 * every caller passing it down.
 */
export type Dialect = 'gulf' | 'egypt';

/** What Settings offers: English, Arabic (Gulf) or Egyptian. */
export type LanguageChoice = 'en' | 'ar' | 'eg';

let current: Dialect = 'gulf';

/** Called by the language provider whenever the choice changes. */
export function setDialect(next: Dialect): void {
  current = next;
}

export function currentDialect(): Dialect {
  return current;
}

export function choiceOf(lang: 'en' | 'ar', dialect: Dialect): LanguageChoice {
  return lang === 'en' ? 'en' : dialect === 'egypt' ? 'eg' : 'ar';
}

/**
 * Keeps a number or an address in its own left-to-right order inside a line of
 * Arabic. A nested <Text> with `writingDirection: 'ltr'` does not isolate it
 * on the web, so the line is marked with Unicode's isolate characters instead,
 * which every platform honours.
 */
export const ltr = (text: string): string => `⁦${text}⁩`;

const ARABIC = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;

/**
 * Lets a line that mixes Arabic and English take its direction from its own
 * first letter rather than the screen's. "رسالة لـKhaled" saved in Arabic and
 * read in the English app otherwise comes out as "Khaled" glued to the wrong
 * end. A line in one script is returned as it is.
 */
export const own = (text: string): string => (ARABIC.test(text) && LATIN.test(text) ? `\u2068${text}\u2069` : text);

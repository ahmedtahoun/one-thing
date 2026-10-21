/**
 * The one quiet line under a name on People: who somebody is, and how to reach
 * them when both still fit.
 *
 * The row gives that line a single line of a fixed-width column, so the old
 * rule — always print the role *and* the number — had nowhere to put a long
 * one. On the owner's own list "General Manager · @speranza · +20 100 123
 * 4567" came out as "General Manager · @speranza · +2…": two characters of a
 * phone number, which is noise rather than information. Printing only the
 * role fixed that row and emptied the roomy ones: "Travel · info@test.com"
 * became "Travel", though it had 83pt of its 228 to spare.
 *
 * So the line is measured. Both are shown when they fit; the reach is dropped
 * when they do not, because it is the one of the two that is unreadable in
 * part — half a role still reads, half a number does not — and because the
 * profile a tap away carries it in full. BUILD-REVIEW §2.111.
 *
 * `emWidth` is an estimate, not a measurement: React Native has no
 * synchronous text metric, and `onTextLayout` arrives a frame after the row is
 * drawn, so measuring for real would mean drawing the wrong thing first and
 * correcting it — a flicker down a scrolling list. The tables below are the
 * app's own font, measured in a browser and bucketed to a twentieth of an em
 * by scripts/measure-line.js, which prints them in this shape to paste.
 *
 * The estimate has two ways to be wrong and they are not equally bad. Call an
 * overflow a fit, and a number is cut to a stub — the fault this started as.
 * Call a fit an overflow, and a row shows the role alone where the address
 * would have squeezed in; nobody can see what is missing. So `MARGIN` holds
 * the estimate to 96% of the column, and `quiet-line.test.ts` asserts the
 * asymmetry against every pair the browser measured.
 */
import { type } from '@/design/tokens';
import { ltr } from '@/lib/bidi';

/** Latin, punctuation and digits: advance width in ems. Additive to within 1%. */
const LATIN: readonly (readonly [number, string])[] = [
  [0.25, " '"],
  [0.3, '!,.:;ijl'],
  [0.35, '()[]ft{}·'],
  [0.4, '-Ir|'],
  [0.45, '"/\\'],
  [0.5, '?Lcsvyz'],
  [0.55, '*J_aegkox'],
  [0.6, '0123456789$+<=>EFSTZ^`bdhnpqu~–'],
  [0.65, '#ABCPRVXY'],
  [0.7, '&DGHKNOQU'],
  [0.8, 'Mw—'],
  [0.85, '…'],
  [0.9, '@m'],
  [0.95, '%W'],
];

/**
 * Arabic, *isolated*. These do not add up: Arabic letters join, and a letter
 * inside a word is drawn without the tail it has on its own, so the shaped run
 * is narrower than its glyphs end to end — "مسؤول المشتريات" sums to 9.27em
 * and draws at 7.31em. `SHRINK` takes that back out.
 */
const ARABIC_LETTERS: readonly (readonly [number, string])[] = [
  [0, 'ًٌٍَُِّْ'],
  [0.1, 'ـ'],
  [0.25, 'اآأإ'],
  [0.3, 'رز٠١'],
  [0.45, 'هءة'],
  [0.5, 'دذوؤ٢٤٦'],
  [0.55, '٥٧٨٩'],
  [0.6, 'جحخم'],
  [0.65, 'عغل٣'],
  [0.7, 'ن'],
  [0.75, 'طظقيىئ'],
  [0.8, 'ك'],
  [0.85, 'بتث'],
  [0.95, 'ف'],
  [1.15, 'سش'],
  [1.3, 'صض'],
];

/**
 * What joining takes off an isolated Arabic glyph, on average over real roles.
 * Fitted as the smallest shrink that never calls an overflow a fit, and the
 * largest that never drops a reach with room to spare: at 0.8 both are zero
 * across the measured pairs, and the worst an Arabic line is underestimated by
 * is 3.8% — inside `MARGIN`, so the two hold together by construction and not
 * merely by luck. scripts/measure-line.js re-fits it.
 */
const SHRINK = 0.8;

const EM = new Map<string, number>();
for (const [width, chars] of LATIN) for (const char of chars) EM.set(char, width);
for (const [width, chars] of ARABIC_LETTERS) for (const char of chars) EM.set(char, width * SHRINK);

/** Anything neither table names, counted wide so the estimate errs the safe way. */
const UNKNOWN_EM = 0.6;

/** Bidi isolates and marks: they steer the order of what is drawn, and draw nothing. */
const INVISIBLE = /[​-‏⁦-⁩‪-‮؜]/;

/** Roughly how wide a string is, in multiples of the font size. */
export function emWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    if (INVISIBLE.test(char)) continue;
    width += EM.get(char) ?? UNKNOWN_EM;
  }
  return width;
}

/**
 * How wide the quiet line's column is on a window this wide: the screen less
 * its padding, the picture, the two gaps and the date beside the row. Checked
 * against both reference frames — 402pt leaves 228, 360pt leaves 186.
 */
export function lineWidth(windowWidth: number): number {
  return Math.max(0, windowWidth - 174);
}

/** How much of the column the estimate is allowed to claim. See the note above. */
const MARGIN = 0.96;

/** The separator between who somebody is and how to reach them. */
const JOIN = ' · ';

/**
 * Who somebody is, and how to reach them when the two fit on one line of a
 * column this wide. The reach is isolated so a number keeps its own direction
 * inside an Arabic line (src/lib/bidi.ts).
 */
export function identityLine(role: string | undefined, reach: string, width: number): string {
  const who = role?.trim() ?? '';
  const how = reach.trim();
  if (!who) return how ? ltr(how) : '';
  if (!how) return who;
  const both = `${who}${JOIN}${ltr(how)}`;
  return emWidth(both) * type.bodyS.size <= width * MARGIN ? both : who;
}

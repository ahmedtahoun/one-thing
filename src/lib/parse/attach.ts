/**
 * "Import my Excel", "scan a card" — the two ways a pile of people arrives,
 * asked for in words instead of found in a menu.
 *
 * The Assistant's input row has a paperclip that opens the same three
 * choices; this is for the person who types or says it instead, which is
 * faster once they know the app. It recognises only: a camera scan, a card
 * already in the photo library, and a file of contacts. Everything is read on
 * the phone — src/lib/card-reader.ts and src/features/people-import — and
 * nothing is uploaded.
 *
 * Pure, and deliberately narrow. "Scan the contract" is not about a business
 * card and "send Omar the spreadsheet" is not an import, so both need a word
 * that says what is being opened before anything matches.
 */
import { ar, AR_LETTER } from './names';

export type Attach = 'scan' | 'photo' | 'file';

/** A business card, in either script. */
const CARD = new RegExp(
  '\\b(?:business ?card|name ?card|visiting ?card|card)\\b|' +
    ar(`(?<![${AR_LETTER}])(?:كرت|كارت|بطاقة|بطاقه|بزنس كارد)(?![${AR_LETTER}])`).source,
  'i'
);

/** A file that holds people. */
const FILE = new RegExp(
  '\\b(?:file|excel|xlsx|spreadsheet|sheet|csv|pdf|vcard|vcf|contacts? list|address ?book)\\b|' +
    ar(`(?<![${AR_LETTER}])(?:ملف|اكسل|إكسل|اكسيل|شيت|جدول|قائمة|قايمة|كشف|دفتر)(?![${AR_LETTER}])`).source,
  'i'
);

/** Asking for something to be brought in. */
const BRING = new RegExp(
  '\\b(?:import|upload|read|add|load|bring|open|take|get|scan|snap|photograph)\\b|' +
    ar(
      `(?<![${AR_LETTER}])(?:استورد|إستورد|ارفع|إرفع|اقرأ|اقرا|ضيف|اضف|أضف|افتح|إفتح|حمل|صور|صوّر|امسح|إمسح|خذ|هات)(?![${AR_LETTER}])`
    ).source,
  'i'
);

/** Already taken: it is in the photo library, not in front of the camera. */
const FROM_PHOTOS = new RegExp(
  '\\bfrom (?:my )?(?:photos|gallery|camera roll|library|album)\\b|\\b(?:photos|gallery|camera roll)\\b|' +
    ar('(?:من الصور|من الاستديو|من الألبوم|من الالبوم|من المعرض)').source,
  'i'
);

/** The camera, said outright. */
const CAMERA = new RegExp(
  '\\b(?:camera|take a photo|take a picture)\\b|' + ar(`(?<![${AR_LETTER}])(?:الكاميرا|كاميرا|صور|صوّر)(?![${AR_LETTER}])`).source,
  'i'
);

/**
 * Which of the three the person asked for, or null when it is something else
 * and should be read as a task or a question as before.
 *
 * A card already in the photo library wins over the camera, because "scan a
 * card from my photos" says both and means the library — and that pair alone
 * needs no verb, since it is how the sheet labels the choice.
 */
export function attachCommand(text: string): Attach | null {
  const t = text.trim();
  if (t === '') return null;
  // A card and the library together need no verb: "card from photos" is the
  // sheet's own label, and someone who reads it out loud means it.
  if (CARD.test(t) && FROM_PHOTOS.test(t)) return 'photo';
  if (!BRING.test(t)) return null;
  if (CARD.test(t)) return 'scan';
  if (FILE.test(t)) return 'file';
  // "Scan from my photos" with no word for what: a card is the only thing the
  // reader knows how to read.
  if (FROM_PHOTOS.test(t) && CAMERA.test(t)) return 'photo';
  return null;
}

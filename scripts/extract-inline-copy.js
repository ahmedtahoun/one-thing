/**
 * Extracts the copy that lives only in the handoff's source/app-logic.js.
 *
 * README.md calls source/app-content.js the single source of truth for
 * strings, but it is not complete: dozens of EN/AR pairs are written inline in
 * app-logic.js. This pulls them out verbatim so no string is ever retyped.
 *
 * They come in two shapes, and both have to be read:
 *   `ar ? '…' : '…'`            — a local boolean (the first-run card, greetings)
 *   `lang === 'ar' ? '…' : '…'` — the comparison written out (status pills,
 *                                 relative times, the contact form)
 * Only the first shape was read at first, which left strings like "Overdue"
 * and " min" to be typed by hand. Anything matching either shape must now be
 * named below — as copy, or as explicitly not copy — or this script fails.
 *
 * Two lines need patterns of their own — Settings' reminder-style
 * descriptions and the follow-up Nudge's task — see the note above them.
 *
 *   node scripts/extract-inline-copy.js <path to design_handoff_the_one_thing>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { handoffDir } = require('./handoff.js');

const SRC = path.join(handoffDir(process.argv[2]), 'source', 'app-logic.js');
const OUT = path.join(__dirname, '..', 'src', 'content', 'inline-copy.ts');

/**
 * Names for the pairs, keyed by "<line>:<english>" so a change upstream fails
 * loudly instead of silently renaming something. Pairs that are not copy
 * (the '-18px' / '18px' layout offset) are deliberately absent.
 */
const NAMES = {
  // Settings' collapsed Reminders row abbreviates: " د", not the " دقيقة"
  // that relative times use under the same English " min".
  "183: min": 'minSuffixShort',
  '183:On': 'on',
  '183: on': 'onSuffix',
  '186:Notifications': 'notifications',
  '186:Allow notifications': 'allowNotifications',
  "186:Managed in your phone’s Settings": 'managedInSettings',
  '186:On': 'notificationsOn',
  '187:Opening phone Settings…': 'openingSettings',
  '187:Sound': 'sound',
  '187:Vibration': 'vibration',
  '239:Set. Gentle reminders are on — change it anytime in Settings.': 'firstRunToast',
  '240:FIRST THING': 'firstRunEyebrow',
  '240:What’s the one thing that would make today a good day?': 'firstRunQuestion',
  '241:Type it here…': 'firstRunPlaceholder',
  '241:Set': 'firstRunSet',
  '241:Or pick one': 'firstRunOrPick',
  '245:Later — just show me my day': 'firstRunLater',
  '252:Search country or code': 'countrySearch',
  '252:No country found': 'countryNone',
  '253:Phone number': 'phoneNumber',
};

const PAIR = /ar \? '((?:[^'\\]|\\.)*)' : '((?:[^'\\]|\\.)*)'/g;

/** The written-out form. Same capture order: Arabic first, then English. */
const PAIR_LANG = /lang === 'ar' \? '((?:[^'\\]|\\.)*)' : '((?:[^'\\]|\\.)*)'/g;

/** Names for the pairs in the written-out form, keyed the same way. */
const NAMES_LANG = {
  '76:Last time': 'lastTime',
  '230:What do you do? (optional)': 'rolePlaceholder',
  '247:See all': 'seeAllShort',
  '314:Mail': 'mailAppName',
  '329:Not needed': 'notNeeded',
  '365:Tmw ': 'tmwPrefix',
  '388:h ': 'hourSuffix',
  '388:m': 'minuteSuffix',
  '388: min': 'minSuffix',
  '499:Overdue': 'overdue',
  '499:Snoozed': 'snoozed',
  '542:h ': 'hourSuffix',
  '542:m': 'minuteSuffix',
  '542: min': 'minSuffix',
  '574:Contact details (optional)': 'contactDetailsOptional',
  '575:Save contact': 'saveContact',
  '576:Opens WhatsApp with a draft — you hit send': 'opensWhatsApp',
  '576:Opens Mail with a draft — you hit send': 'opensMail',
  '576:Opens your phone app': 'opensPhone',
  '577:Delete contact': 'deleteContact',
  '578:Delete this contact? Their history goes too.': 'deleteContactConfirm',
  '578:Contact deleted': 'toastContactDeleted',
  '580:Open': 'openLink',
  '613:From yesterday': 'fromYesterday',
  '632:Where do you talk to people?': 'channelsQuestion',
  '632:I write the draft. You send it from the app you already use.': 'channelsNote',
  '652:Resume · ': 'resumePrefix',
  '652: left': 'resumeSuffix',
  '671:Calling…': 'calling',
  '672:No, I didn’t send it yet': 'notSentYet',
  '672:Okay — the draft is saved. Still on your list.': 'draftSavedToast',
  '700:Show all': 'showAll',
  '702:Rest → tomorrow': 'restToTomorrow',
};

/**
 * Pairs in that shape which are not copy, with why. Listed rather than
 * pattern-matched so a new one upstream has to be looked at.
 */
const NOT_COPY_LANG = {
  '67:Khalid': "the demo user's first name — demo data, not UI copy",
  '83:en-GB': 'a locale identifier',
  '180:chevR': 'an icon name (the chevron mirrors in Arabic)',
  '190:18px': 'a layout offset',
  '246:Khalid': "the demo user's first name again",
  '267:Mohammed Al-Saadi': 'a demo contact name',
  '267:Sara': 'a demo contact name',
  '614:Tmw 09:00': "a demo-state label, set by the prototype's own demo tools",
  '622:ltr': 'a writing-direction value',
  '636:18px': 'a layout offset',
};

const lines = fs.readFileSync(SRC, 'utf8').split('\n');
const found = {};

/**
 * Several lines share a name ("h " and "m" on two lines each). That is only
 * right while they agree in both languages — " min" was once named once for
 * three lines whose Arabic differs, and Settings would have shown the wrong
 * one. So a name that comes back with different copy fails the run.
 */
function record(key, pair) {
  const had = found[key];
  if (had && (had.en !== pair.en || had.ar !== pair.ar)) {
    throw new Error(`"${key}" names two different strings: ${JSON.stringify(had)} and ${JSON.stringify(pair)}`);
  }
  found[key] = pair;
}
const unnamed = [];

lines.forEach((line, i) => {
  const lineNo = i + 1;
  for (const m of line.matchAll(PAIR)) {
    const ar = m[1];
    const en = m[2];
    const key = NAMES[`${lineNo}:${en}`];
    if (!key) {
      unnamed.push({ line: lineNo, en, ar });
      continue;
    }
    record(key, { en, ar });
  }
});

lines.forEach((line, i) => {
  const lineNo = i + 1;
  for (const m of line.matchAll(PAIR_LANG)) {
    const key = `${lineNo}:${m[2]}`;
    if (key in NOT_COPY_LANG) continue;
    const name = NAMES_LANG[key];
    if (!name) {
      unnamed.push({ line: lineNo, en: m[2], ar: m[1] });
      continue;
    }
    record(name, { en: m[2], ar: m[1] });
  }
});

const missing = [...Object.values(NAMES), ...Object.values(NAMES_LANG)].filter((k) => !(k in found));
if (missing.length) {
  throw new Error('Expected pairs not found in app-logic.js: ' + missing.join(', '));
}

// Anything new upstream should be reviewed, not silently dropped — but the
// known layout offset is not copy, so it is allowed through.
const unexpected = unnamed.filter((u) => u.en !== '18px');
if (unexpected.length) {
  throw new Error(
    'New inline strings appeared in app-logic.js; add them to NAMES:\n' +
      unexpected.map((u) => `  ${u.line}: ${u.en}`).join('\n')
  );
}

// The greeting is built with a different shape (`lang === 'ar' ? ... : ...`
// with the name concatenated), so it is pulled out by its own pattern.
const greetingLine = lines.find((l) => l.includes("'Good morning, '"));
if (!greetingLine) throw new Error('Greeting line not found in app-logic.js');
const greet = {
  morning: /\(ev \? '([^']*)' : '([^']*)'\)/g,
};
const greetMatches = [...greetingLine.matchAll(greet.morning)];
if (greetMatches.length !== 2) {
  throw new Error('Expected two greeting pairs (Arabic then English), got ' + greetMatches.length);
}
const [arGreet, enGreet] = greetMatches;
found.goodEvening = { ar: arGreet[1], en: enGreet[1] };
found.goodMorning = { ar: arGreet[2], en: enGreet[2] };

// Two more places keep copy inline in shapes neither pattern above reads:
//
//   - the reminder-style descriptions in Settings, an object literal keyed by
//     language and then by style: `nudgeDesc: ({ en: { gentle: '…', … }, ar: … })`
//   - the follow-up Nudge, which builds its task by concatenating copy around
//     the follow-up's own fields: `'Nudge: ' + f.en.what`
//
// Each is matched by a pattern written for exactly that line, and the
// concatenations become templates — `{what}` for the follow-up's subject and
// `{n}` for the contact's first name. If upstream rewrites either line the
// match fails and so does this script.
const STR = "'((?:[^'\\\\]|\\\\.)*)'";
const lineWith = (needle) => {
  const line = lines.find((l) => l.includes(needle));
  if (!line) throw new Error(`Line containing ${needle} not found in app-logic.js`);
  return line;
};
const must = (line, pattern, what) => {
  const m = line.match(pattern);
  if (!m) throw new Error(`${what} has changed shape in app-logic.js`);
  return m;
};

{
  const line = lineWith('nudgeDesc:');
  const m = must(line, /nudgeDesc: \(\{ en: \{([^}]*)\}, ar: \{([^}]*)\} \}\)/, 'nudgeDesc');
  const styles = (body) =>
    Object.fromEntries([...body.matchAll(new RegExp(`(\\w+): ${STR}`, 'g'))].map((x) => [x[1], x[2]]));
  const enDesc = styles(m[1]);
  const arDesc = styles(m[2]);
  for (const k of ['gentle', 'firm', 'quiet']) {
    if (!enDesc[k] || !arDesc[k]) throw new Error(`nudgeDesc is missing "${k}"`);
  }
  found.nudgeDesc = { en: enDesc, ar: arDesc };
}

{
  const line = lineWith("title: 'Nudge: '");
  const title = must(line, new RegExp(`en: \\{ title: ${STR} \\+ f\\.en\\.what, who: f\\.en\\.who \\}, ar: \\{ title: ${STR} \\+ f\\.ar\\.what`), 'Nudge title');
  found.nudgeTitle = { en: `${title[1]}{what}`, ar: `${title[2]}{what}` };
  const goal = must(line, new RegExp(`goal: \\{ en: ${STR} \\+ f\\.en\\.what\\.toLowerCase\\(\\), ar: ${STR} \\+ f\\.ar\\.what \\}`), 'Nudge goal');
  found.nudgeGoal = { en: `${goal[1]}{what}`, ar: `${goal[2]}{what}` };
  const points = must(line, new RegExp(`points: \\{ en: \\[${STR}, ${STR}\\], ar: \\[${STR}, ${STR}\\] \\}`), 'Nudge points');
  found.nudgePoints = { en: [points[1], points[2]], ar: [points[3], points[4]] };
}

{
  const line = lineWith("draft: { en: 'Hi '");
  const d = must(
    line,
    new RegExp(
      `draft: \\{ en: ${STR} \\+ fn \\+ ${STR} \\+ f\\.en\\.what\\.toLowerCase\\(\\) \\+ ${STR}, ar: ${STR} \\+ fa \\+ ${STR} \\+ f\\.ar\\.what \\+ ${STR} \\}`
    ),
    'Nudge draft'
  );
  found.nudgeDraft = { en: `${d[1]}{n}${d[2]}{what}${d[3]}`, ar: `${d[4]}{n}${d[5]}{what}${d[6]}` };
}

{
  const line = lineWith('justNote: { en:');
  const m = must(line, new RegExp(`justNote: \\{ en: ${STR}, ar: ${STR} \\}`), 'Nudge note');
  found.draftReadyNote = { en: m[1], ar: m[2] };
}

const en = {};
const ar = {};
for (const [key, pair] of Object.entries(found)) {
  en[key] = pair.en;
  ar[key] = pair.ar;
}

fs.writeFileSync(
  OUT,
  `/**
 * Copy that the handoff keeps inline in source/app-logic.js rather than in
 * source/app-content.js — the first-run card, the greetings, the notifications
 * rows and the country picker.
 *
 * Generated by scripts/extract-inline-copy.js. Do not hand-edit.
 */

const INLINE_en = ${JSON.stringify(en, null, 2)};

// Declared as \`typeof INLINE_en\` so a missing Arabic string is a compile error.
const INLINE_ar: typeof INLINE_en = ${JSON.stringify(ar, null, 2)};

export const INLINE = { en: INLINE_en, ar: INLINE_ar };

export type InlineCopy = (typeof INLINE)['en'];
`,
  'utf8'
);

console.log(JSON.stringify({ extracted: Object.keys(found).length }, null, 2));

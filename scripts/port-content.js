/**
 * Ports the handoff's copy, icon paths and seed data into typed TS modules.
 *
 * The handoff names source/app-content.js as the single source of truth for
 * strings (EN + AR), icon paths and type colours, so we transcribe it
 * mechanically rather than by hand: the file is evaluated in a sandbox and its
 * data is serialised. Re-run this if the handoff is ever revised.
 *
 *   node scripts/port-content.js <path to design_handoff_the_one_thing>
 *
 * Deliberately NOT ported:
 *   TYPE_COL   -> src/design/tokens.ts (OKLCH baked to sRGB, see verify-oklch)
 *   BRAND_IC   -> src/design/BrandMarks.tsx (React DOM in the original)
 *   SCREENS / NAV_LABEL -> prototype-only screen jumper, not part of the app
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { handoffDir } = require('./handoff.js');

// The first non-flag argument, so `--force` is not read as a path.
const HANDOFF = handoffDir(process.argv.slice(2).find((a) => !a.startsWith('--')));
const SRC = path.join(HANDOFF, 'source', 'app-content.js');
const OUT = path.join(__dirname, '..', 'src', 'content');

const lines = fs.readFileSync(SRC, 'utf8').split('\n');
const slice = (from, to) => lines.slice(from - 1, to).join('\n'); // 1-indexed, inclusive

// Section boundaries in app-content.js, verified against the file.
const body = [
  slice(5, 40), //  P (icon paths), TYPE_ICON
  slice(52, 160), //  C (en/ar copy) + its Object.assign patches
  slice(162, 308), //  seed data, CCS, ACC, HIST, PFX, FUX, EV_TYPES, EVX, SETX
].join('\n');

const sandbox = { Intl, String, Date, Object, Array, Math, JSON };
vm.createContext(sandbox);
vm.runInContext(body + '\n;__out = { P, TYPE_ICON, C, STEPS, CONTACTS, CCS, SUG_ORDER, ONE_SUGG, TASKS, FUS, ACC, HIST, PFX, FUX, EV_TYPES, EVX, SETX };', sandbox, {
  filename: 'app-content.js',
});
const d = sandbox.__out;

/**
 * Deliberate divergences from the handoff.
 *
 * The handoff is the source of truth for copy, and this script transcribes it
 * mechanically — which means anything hand-edited into the generated files is
 * silently reverted the next time anyone re-runs it. Two things have to
 * survive that, so they are declared here instead of being typed into
 * src/content/strings.ts.
 *
 * Each one asserts that it still applies. If the handoff is revised so that a
 * rule no longer matches, this throws rather than quietly producing a file
 * that has lost the change — which is the entire failure this block exists to
 * prevent.
 */

/** Text replaced everywhere it appears, in both languages. */
const SUBSTITUTIONS = [
  {
    from: 'theonething.app',
    to: 'onlyonething.app',
    why:
      'The product shipped as onlyonething.app — the bundle ID is app.onlyonething ' +
      'and the domain follows it. The handoff predates that decision. These are not ' +
      'decoration: a reviewer clicks privacy@ and /delete, and Play requires the ' +
      'deletion route to resolve (RELEASE.md §7). Reverting this ships a dead ' +
      'mailbox, and nothing would fail to tell you.',
  },
];

/**
 * Keys the app needs that the handoff never wrote.
 *
 * Only one so far, and it is here for a reason worth stating: the prototype
 * has no failure state for sign-in, because in a prototype sign-in cannot
 * fail. On a device it can, and specifically it can fail *after* the
 * provider's sheet has already closed — a token Supabase rejects, a paused
 * project, no network. By then there is nothing left on screen to explain
 * itself. app/sign-in.tsx carries the rest of the reasoning.
 */
const ADDITIONS = [
  {
    path: ['ACC', 'en', 'si', 'fail'],
    value: 'We couldn\u2019t sign you in. Please try again.',
  },
  {
    path: ['ACC', 'ar', 'si', 'fail'],
    value: '\u0645\u0627 \u0642\u062f\u0631\u0646\u0627 \u0646\u0633\u062c\u0651\u0644 \u062f\u062e\u0648\u0644\u0643. \u062c\u0631\u0651\u0628 \u0645\u0631\u0629 \u062b\u0627\u0646\u064a\u0629.',
  },
];

/**
 * Copy this product owns outright, which the handoff no longer describes.
 *
 * The privacy policy is the clear case. Build 9 taught the app to read a
 * business card, import a spreadsheet or a PDF, and keep a picture for a
 * person, so the policy gained a "Pictures and files" section in both
 * languages, a fuller account of what a contact record holds, and the two
 * Arabic sections English already had. None of it is in the handoff, which
 * describes a prototype that did none of those things.
 *
 * It lived as a hand edit until a --force regeneration quietly reverted it
 * and it had to be restored from git — the exact loss the refusal below
 * exists to prevent, walked into by the person who wrote the refusal. Text
 * that has to be TRUE about the shipped app does not belong in a file
 * anything can regenerate from a prototype. Here, regenerating reproduces
 * it. These replace whatever the handoff says at the same path.
 */
const REPLACEMENTS = [
  { path: ['ACC', 'en', 'si', 'updated'], value: "Last updated 14 October 2026" },
  { path: ['ACC', 'ar', 'si', 'updated'], value: "آخر تحديث ١٤ أكتوبر ٢٠٢٦" },
  { path: ['ACC', 'en', 'priv'], value: [["What we collect", "Your name, phone number, job title, email from your sign-in provider, the tasks, contacts and notes you add, and basic usage data (which features you use, crashes)."], ["Why we use it", "To run the app, personalise your assistant, send reminders you asked for, and improve the product. With your consent, to send tips, offers and marketing messages."], ["Sharing", "We never sell your data. We use trusted providers (hosting, analytics, payments through Apple and Google) who process it only for us."], ["Who at our company can see it", "Our support team can see your account details (name, email, phone, job title), your tasks, the contacts you save (name, position, company, phone and email) and your message drafts. We use this to troubleshoot problems, answer your support requests, keep the service secure and meet legal requests. Every time a team member opens your data it is recorded. For product analysis we use your activity with names, phone numbers and emails replaced by codes."], ["People you add", "When you save a contact, we store their name, position, company, phone numbers, emails, address, labels and your notes about them so the app can work for you. They can ask us to remove their details at privacy@onlyonething.app."], ["Pictures and files", "A picture you choose for a person or for yourself is copied into the app and stays on your phone; it is not uploaded. A photo of a business card is read on your phone and not kept; only the text you confirm becomes a contact. A spreadsheet, PDF or contacts file you import is read on your phone and the file itself is not uploaded."], ["Your choices", "Turn marketing off any time in Settings. Download or delete your data and account from Settings or at onlyonething.app/delete — deletion removes everything within 30 days."], ["Children", "The One Thing is not intended for children under 13 and we don’t knowingly collect their data."], ["Health", "The One Thing is a productivity tool. It is not a medical device and doesn’t diagnose or treat any condition."], ["Contact", "privacy@onlyonething.app"]] },
  { path: ['ACC', 'ar', 'priv'], value: [["وش نجمع", "اسمك، رقمك، مسمّاك الوظيفي، بريدك من مزوّد الدخول، المهام وجهات الاتصال والملاحظات اللي تضيفها، وبيانات استخدام بسيطة."], ["ليش نستخدمها", "لتشغيل التطبيق وتخصيص المساعد وإرسال التذكيرات وتحسين الخدمة. وبموافقتك، لإرسال نصائح وعروض ورسائل تسويقية."], ["المشاركة", "ما نبيع بياناتك أبداً. نستخدم مزوّدين موثوقين يعالجونها لنا فقط."], ["مين يقدر يشوفها عندنا", "فريق الدعم يقدر يشوف بيانات حسابك (الاسم والإيميل والجوال والمسمى)، ومهامك، وجهات الاتصال اللي تحفظها (الاسم والمنصب والشركة والجوال والإيميل)، ومسودات رسائلك. نستخدمها لحل المشاكل والرد على طلبات الدعم وحماية الخدمة وللطلبات النظامية. وكل مرة يفتح أحد من الفريق بياناتك تنسجّل. ولتحليل المنتج نستخدم نشاطك بعد استبدال الأسماء والأرقام والإيميلات برموز."], ["الأشخاص اللي تضيفهم", "لما تحفظ جهة اتصال نخزّن اسمه ومنصبه وشركته وأرقامه وإيميلاته وعنوانه وتصنيفاته وملاحظاتك عنه عشان يشتغل التطبيق لك. ويقدر يطلب حذف بياناته على privacy@onlyonething.app."], ["الصور والملفات", "الصورة اللي تختارها لشخص أو لنفسك تنحفظ داخل التطبيق وتبقى على جوالك ولا تُرفع. وصورة بطاقة العمل تُقرأ على جوالك ولا تنحفظ؛ بس النص اللي تأكّده يصير جهة اتصال. وأي ملف جدول أو PDF أو جهات اتصال تستورده يُقرأ على جوالك ولا يُرفع الملف نفسه."], ["خياراتك", "أوقف التسويق متى ما تبي من الإعدادات. حمّل أو احذف بياناتك وحسابك من الإعدادات خلال ٣٠ يوم."], ["الأطفال", "«الشيء الواحد» غير موجّه للأطفال دون ١٣ سنة، ولا نجمع بياناتهم عن علم."], ["الصحة", "«الشيء الواحد» أداة إنتاجية. ليس جهازًا طبيًا ولا يشخّص أو يعالج أي حالة."], ["تواصل معنا", "privacy@onlyonething.app"]] },
];

/**
 * Entries taken out of a list the handoff wrote.
 *
 * Only one so far. The paywall sold six things, and `can()` returns false
 * for `weeklyRecap` on every plan including Pro — so a buyer pays and gets
 * nothing for that bullet, which is a 3.1.2 problem and a refund problem
 * (RELEASE.md §9.5). The feature is not cancelled, only unsold: put the row
 * back here the day the screen exists.
 */
const PRUNINGS = [
  { path: ['SETX', 'en', 'pw', 'feats'], icon: 'moon' },
  { path: ['SETX', 'ar', 'pw', 'feats'], icon: 'moon' },
];

/** Applies a string transform to every string in the ported data, in place. */
function mapStrings(value, fn) {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) value[k] = mapStrings(value[k], fn);
  }
  return value;
}

for (const rule of SUBSTITUTIONS) {
  let hits = 0;
  mapStrings(d, (text) => {
    if (!text.includes(rule.from)) return text;
    hits += text.split(rule.from).length - 1;
    return text.split(rule.from).join(rule.to);
  });
  if (hits === 0) {
    throw new Error(
      `Substitution "${rule.from}" → "${rule.to}" matched nothing.\n` +
        'Either the handoff was revised and this rule is obsolete, or it was ' +
        'applied to the wrong text. Do not delete it without reading why:\n  ' +
        rule.why
    );
  }
  console.log(`  override: ${rule.from} → ${rule.to} (${hits}×)`);
}

for (const replacement of REPLACEMENTS) {
  const keys = replacement.path.slice();
  const leaf = keys.pop();
  let node = d;
  for (const k of keys) node = node?.[k];
  if (!node || !(leaf in node)) throw new Error(`Replacement ${replacement.path.join('.')}: no such path in the handoff's data.`);
  node[leaf] = replacement.value;
  console.log(`  override: = ${replacement.path.join('.')}`);
}

for (const pruning of PRUNINGS) {
  const keys = pruning.path.slice();
  const leaf = keys.pop();
  let node = d;
  for (const k of keys) node = node?.[k];
  const list = node?.[leaf];
  if (!Array.isArray(list)) throw new Error(`Pruning ${pruning.path.join('.')}: not a list in the handoff's data.`);
  const kept = list.filter((row) => !(Array.isArray(row) && row[0] === pruning.icon));
  if (kept.length === list.length) {
    throw new Error(
      `Pruning ${pruning.path.join('.')} found no "${pruning.icon}" row to remove.\n` +
        'The handoff may have been revised. Read why this exists before deleting it —\n' +
        'it is the paywall bullet for a feature that does not exist yet.'
    );
  }
  node[leaf] = kept;
  console.log(`  override: − ${pruning.path.join('.')} [${pruning.icon}]`);
}

for (const addition of ADDITIONS) {
  const keys = addition.path.slice();
  const leaf = keys.pop();
  let node = d;
  for (const k of keys) {
    node = node?.[k];
    if (!node) throw new Error(`Addition ${addition.path.join('.')}: no ${k} in the handoff's data.`);
  }
  if (leaf in node) {
    throw new Error(
      `Addition ${addition.path.join('.')} already exists in the handoff.\n` +
        'The handoff has caught up — drop this addition rather than overwriting it.'
    );
  }
  node[leaf] = addition.value;
  console.log(`  override: + ${addition.path.join('.')}`);
}

const banner = (what) => `/**
 * ${what}
 *
 * Generated by scripts/port-content.js from the design handoff's
 * source/app-content.js — the handoff's stated source of truth for copy.
 * Do not hand-edit: re-run the script instead.
 */
`;

const json = (v) => JSON.stringify(v, null, 2);

// ---- refusing to overwrite a hand edit -------------------------------------
//
// The banner has said "do not hand-edit" since the first version, and the file
// was hand-edited anyway — twice. The second time it was the privacy policy:
// between 9 and 14 October strings.ts gained a "Pictures and files" section in
// both languages, an expanded account of what a contact record holds, and the
// Arabic Children and Health sections, none of it in the handoff. Re-running
// would have reverted all of it, leaving a policy that understates what the
// app collects, and nothing would have failed (BUILD-REVIEW § 2.53).
//
// An instruction in a comment is not a safeguard. The invariant worth holding
// is that a generated file on disk is exactly what the generator produces, so
// the generator now refuses to write over a file that differs from its own
// output. It cannot tell a hand edit from a revised handoff — but a person
// reading the diff can, which is the point: `--force` after looking is a
// decision, and the silent revert is no longer reachable by accident.

const relative = (file) => path.relative(path.join(__dirname, '..'), file);
const FORCED = process.argv.includes('--force');
const refusals = [];

/** Writes a generated file unless it differs from what is already there. */
function writeGenerated(file, body) {
  if (!FORCED && fs.existsSync(file) && fs.readFileSync(file, 'utf8') !== body) {
    refusals.push(relative(file));
    return;
  }
  fs.writeFileSync(file, body, 'utf8');
}

/** Called once at the end: one refusal is a warning, and nothing was written. */
function reportRefusals() {
  if (refusals.length === 0) return;
  throw new Error(
    `Not written, because what is on disk is not what this script produces:\n` +
      refusals.map((f) => `  ${f}`).join('\n') +
      '\n\nEither the handoff was revised, or someone edited a generated file by hand.\n' +
      'The diff says which, and it is worth reading: the last hand edit here was\n' +
      'the privacy policy, and regenerating would have quietly withdrawn it.\n\n' +
      '  git diff -- ' + refusals.join(' ') + '\n\n' +
      'A divergence worth keeping belongs in SUBSTITUTIONS or ADDITIONS above.\n' +
      'Once the diff holds nothing you need, re-run with --force.'
  );
}

/**
 * Emits a bilingual block as `{ en, ar }` where `ar` is declared as
 * `typeof en`. Two effects, both wanted: the member types widen to `string`
 * (so `C[lang]` is one usable type rather than a union of two literal types),
 * and TypeScript then checks that Arabic has exactly the same keys as English
 * — a missing translation becomes a compile error.
 */
function bilingual(name, value, doc) {
  return `${doc}
const ${name}_en = ${json(value.en)};

const ${name}_ar: typeof ${name}_en = ${json(value.ar)};

export const ${name} = { en: ${name}_en, ar: ${name}_ar };
`;
}

fs.mkdirSync(OUT, { recursive: true });

// ---- strings.ts: every user-facing string, EN + AR -------------------------
writeGenerated(
  path.join(OUT, 'strings.ts'),
  banner('All user-facing copy, English and Arabic.') +
    `
/** The two languages the app ships in. */
export type Lang = 'en' | 'ar';
` +
    bilingual('C', d.C, '\n/** Main screen copy. */') +
    bilingual('ACC', d.ACC, '\n/** Account, legal and paywall copy. */') +
    bilingual('SETX', d.SETX, '\n/** Settings, tips and paywall copy. */') +
    bilingual('EVX', d.EVX, '\n/** Event form copy (visit / meeting / webinar / course). */') +
    bilingual('FUX', d.FUX, '\n/** Follow-ups copy. */') +
    bilingual('PFX', d.PFX, '\n/** Contact profile copy. */') +
    `
/**
 * Overwhelm-mode step breakdowns, keyed by One Thing title. Not a bilingual
 * block like the others: each entry holds its own en/ar step lists.
 */
export const STEPS: Record<string, { en: string[]; ar: string[] }> = ${json(d.STEPS)};

/** The four event types that use the event form. */
export const EV_TYPES = ${json(d.EV_TYPES)} as const;

/** Shape of one language's main copy block. */
export type Copy = (typeof C)['en'];
`,
  'utf8'
);

// ---- icons.ts: Lucide-style 24-unit path data -----------------------------
writeGenerated(
  path.join(OUT, '..', 'design', 'icon-paths.ts'),
  banner('Line-icon path data, 24-unit viewBox, round caps and joins.') +
    `
import type { TaskType } from './tokens';

/**
 * One icon is a list of parts. A part is either \`['path', d]\` or a shape with
 * its attributes, e.g. \`['circle', { cx, cy, r }]\`.
 */
export type IconPart =
  | ['path', string]
  | ['circle', { cx: number; cy: number; r: number }]
  | ['rect', { x: number; y: number; width: number; height: number; rx?: number }]
  | ['line', { x1: number; y1: number; x2: number; y2: number }];

export const ICONS = ${json(d.P)} as unknown as Record<string, IconPart[]>;

export type IconName = keyof typeof ICONS;

/** Which icon each task type uses. */
export const TYPE_ICON = ${json(d.TYPE_ICON)} as Record<TaskType, string>;
`,
  'utf8'
);

// ---- countries.ts: baked at build time, not resolved on device ------------
// The original resolves country names through Intl.DisplayNames at runtime and
// silently falls back to bare ISO codes when it is unavailable — which is the
// case on some Hermes builds, and would leave the picker showing "SA" instead
// of "Saudi Arabia". Node has full ICU, so the names are resolved here instead.
const countries = d.CCS.map(([flag, dial, nameEn, nameAr, iso]) => ({
  iso,
  flag,
  dial,
  nameEn,
  nameAr,
}));
const unresolved = countries.filter((c) => c.nameEn === c.iso || c.nameAr === c.iso);
if (unresolved.length) {
  throw new Error('Country names did not resolve: ' + unresolved.map((c) => c.iso).join(', '));
}
writeGenerated(
  path.join(OUT, 'countries.ts'),
  banner('Country dial codes with English and Arabic names, for the phone picker.') +
    `
export type Country = {
  /** ISO 3166-1 alpha-2. */
  iso: string;
  /** Regional-indicator flag emoji. */
  flag: string;
  /** International dial prefix, with the leading "+". */
  dial: string;
  nameEn: string;
  nameAr: string;
};

/** Every country the picker offers. Saudi Arabia leads, as in the design. */
export const COUNTRIES: Country[] = ${json(countries)};

/** The dial code a new phone field starts on. */
export const DEFAULT_DIAL = '+966';
`,
  'utf8'
);

// ---- seed.ts: demo content ------------------------------------------------
writeGenerated(
  path.join(OUT, 'seed.ts'),
  banner(
    'Demo content from the prototype.\n *\n * Used for the App Store / Play review demo account, which the store-readiness\n * audit requires ("seed sample data so the app isn\'t empty"), and for local\n * development. Never seeded into a real user\'s account.'
  ) +
    `
export const SEED_CONTACTS = ${json(d.CONTACTS)};
export const SEED_TASKS = ${json(d.TASKS)};
export const SEED_FOLLOWUPS = ${json(d.FUS)};
export const SEED_HISTORY = ${json(d.HIST)};
export const ONE_THING_SUGGESTIONS = ${json(d.ONE_SUGG)};
export const SUGGESTION_ORDER = ${json(d.SUG_ORDER)};
`,
  'utf8'
);

console.log(
  JSON.stringify(
    {
      copyKeysEn: Object.keys(d.C.en).length,
      copyKeysAr: Object.keys(d.C.ar).length,
      icons: Object.keys(d.P).length,
      countries: countries.length,
      seedContacts: d.CONTACTS.length,
      seedTasks: d.TASKS.length,
      seedFollowUps: d.FUS.length,
    },
    null,
    2
  )
);

// Last, so the counts above are still printed: they say what the handoff holds
// now, which is the first thing worth knowing when a refusal is a surprise.
reportRefusals();

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

const HANDOFF = handoffDir(process.argv[2]);
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
fs.writeFileSync(
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
fs.writeFileSync(
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
fs.writeFileSync(
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
fs.writeFileSync(
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

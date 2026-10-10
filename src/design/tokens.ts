/**
 * Design tokens, transcribed from design_handoff_the_one_thing/README.md.
 *
 * The handoff defines the type and status colours in OKLCH. React Native has
 * no OKLCH support, so they are baked to sRGB here. Every value below was
 * produced by `scripts/oklch.js` and checked against Chromium's own rendering
 * of the same oklch() string by `scripts/verify-oklch.js` — Chromium is the
 * authority because the prototype was reviewed in it. Re-run that script
 * before changing any colour.
 */

/** Neutrals. README § Colour — neutrals. */
export const ink = {
  /** Primary text, primary buttons, active states, toggles on. */
  base: '#0B0B0B',
  /** Strong secondary text. */
  s2: '#3A3A37',
  /** Secondary text. */
  s3: '#55554F',
  /** Labels, meta. */
  s4: '#6B6B68',
  /** Hints, placeholders, timestamps. */
  s5: '#8A8A86',
  /** Disabled text, chevrons. Non-essential hints only — fails 4.5:1 on white. */
  s6: '#A8A8A3',
  /** Faintest marks: an empty reminder bell, the sign-in consent checkbox. */
  s7: '#C9C9C5',
  /** Secondary text on an ink card — "10:00 · Mohammed" under an Up next title. */
  onInk: '#B8B8B3',
  /** A completed task's title, and an inactive tab label. */
  muted: '#9A9A96',
  /** Disabled primary-button background. */
  disabledBtn: '#B5B5B0',
} as const;

export const surface = {
  /** Input / chip borders. */
  line: '#E4E4E0',
  /** Row dividers. */
  lineSoft: '#EFEFEC',
  /** Faint dividers / soft fill. */
  lineFaint: '#F3F2EE',
  /** Chip fill, segmented track, icon tiles. */
  fill: '#F3F2EE',
  /** Grouped-screen background (Settings, Profile), task row bg. */
  fill2: '#F6F6F3',
  /** Toggle off, inactive dots. */
  trackOff: '#D6D6D2',
  /** Cards, screen bg. */
  white: '#FFFFFF',
  /** Sign-in consent checkbox border when unchecked. SCREENS § 01. Same grey as ink.s7. */
  checkbox: '#C9C9C5',
  /** Progress-bar track — Tasks header. */
  progressTrack: '#ECEBE7',
  /** Hairline border on an ink card: outlined chips, the Up next side buttons. */
  onInkLine: '#3A3A38',
  /** Bottom-sheet grab handle. The add sheet uses `line` instead. */
  handle: '#DCDCD8',
  /**
   * A Settings channel toggle when off. The prototype draws these #DCDCD8
   * but the Sound / Vibration / Tips toggles beside them `trackOff`; kept as
   * drawn.
   */
  trackOffChannel: '#DCDCD8',
  /** An open Settings accordion panel. */
  accordionOpen: '#FAFAF8',
  /** Hairline round a Follow-ups card. */
  cardLine: '#ECEBE7',
  /** Initials avatar on Follow-ups; row divider on People. */
  avatar: '#F0EFEB',
  /** Initials avatar on People. */
  avatarPeople: '#EFEEE9',
  /** The clear-search button inside a search field. */
  clearButton: '#DCDBD6',
  /** A segmented control's count badge when its segment is not selected. */
  countIdle: '#E0DFDB',
  /** The Settings language pill's track. */
  langTrack: '#F1F1EE',
} as const;

export type TaskType =
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'reminder'
  | 'visit'
  | 'meeting'
  | 'webinar'
  | 'course';

/**
 * Channel / task-type colours: `fg` for icon and label, `bg` for the icon tile.
 * Source: source/app-content.js → TYPE_COL.
 */
export const typeColour: Record<TaskType, { fg: string; bg: string }> = {
  call: { fg: '#C46016', bg: '#FFE8DA' },
  email: { fg: '#2971C6', bg: '#DFF0FF' },
  whatsapp: { fg: '#1B9247', bg: '#DFF6E2' },
  reminder: { fg: '#8059BB', bg: '#F2EAFF' },
  visit: { fg: '#946900', bg: '#F9EED1' },
  meeting: { fg: '#00858D', bg: '#D4F6F8' },
  webinar: { fg: '#AF467E', bg: '#FFE5F2' },
  course: { fg: '#697B1A', bg: '#EBF2D9' },
};

/** Status colours. README § Colour — status. */
export const status = {
  /** Delete-account button / text. */
  danger: '#BE222A',
  /** "Now" line, Overdue text, errors. */
  dangerFg: '#C13C3B',
  /** Overdue pill bg, delete icon tile. */
  dangerBg: '#FFE5E1',
  /** "On", Closed, Completed. */
  successFg: '#09672E',
  /** Closed pill, empty-state circle. */
  successBg: '#D4F5DA',
  /** Duplicate-contact banner. */
  warnBg: '#FFECC9',
  warnFg: '#6F4100',
  /** "Remember for next time" note card. */
  noteBg: '#FDF5DF',
  noteFg: '#6F4F07',
  /** Paywall "Save 40%" tag. */
  saveTag: '#298646',
  /**
   * Overdue pill text. README gives danger-fg as a range,
   * `oklch(0.5–0.55 0.17 25)`; the prototype spends the darker end on this
   * pill and the lighter one on the Now line, so both are tokens.
   */
  overdueFg: '#B02A2D',
  /**
   * Snoozed pill text, `oklch(0.5 0.14 300)`.
   *
   * This was previously #6C44A4. That value is `oklch(0.48 0.15 300)`, which
   * only ever appears in source/admin-logic.js — it is the admin panel's
   * reminder colour, not the app's Snoozed pill.
   */
  snoozeFg: '#714CA6',
  /** "in 40 min" on the Up next card, which sits on ink. */
  onInkUrgent: '#FB9890',
  /** Closed pill and the empty-state circle on Follow-ups, `oklch(0.95 0.04 150)`. */
  successBgSoft: '#DCF7E1',
  /** The red count on Follow-ups' Nudge segment, `oklch(0.55 0.18 25)`. */
  countBadge: '#C53637',
  /** The trash tile on the delete-account sheet, `oklch(0.95 0.035 25)`. */
  dangerTile: '#FFE6E3',
  /** Trial / info pill. */
  infoBg: '#D8EEFF',
  infoFg: '#004E90',
} as const;

/**
 * The icon tiles on Settings rows. Each is its own oklch() pair in the
 * prototype's setVals(), close to but not the same as the task-type colours.
 */
export const settingsTile = {
  reminders: { bg: '#F2EAFF', fg: '#724AAB' },
  notifications: { bg: '#FFE7D7', fg: '#A94700' },
  channels: { bg: '#DCF7E1', fg: '#067132' },
  privacy: { bg: '#DDF1FF', fg: '#00569F' },
  coffee: { bg: '#FFEBD2', fg: '#934F00' },
} as const;

/** README § Radius. */
export const radius = {
  pill: 999,
  /** Primary buttons (56 h) and bottom-sheet top corners. */
  button: 28,
  /** Today One Thing card. */
  oneThing: 26,
  largeCard: 20,
  card: 18,
  cardTight: 16,
  /** Inputs, list rows. */
  input: 14,
  /** Small buttons, segmented. */
  small: 12,
  /** Icon tiles (36–44). */
  tile: 10,
  /** Checkboxes. */
  checkbox: 7,
} as const;

/** README § Spacing. */
export const space = {
  /** Screen side padding. */
  screenX: 20,
  /** Onboarding / sign-in / paywall-style screens. */
  screenXWide: 24,
  /** Status-bar spacer above content. */
  statusBar: 54,
  /** Content bottom padding under the tab bar. */
  tabBarInset: 150,
  gridGap: 8,
} as const;

/**
 * What `line-height: normal` comes to for IBM Plex Sans Arabic at a given
 * size — and what the prototype therefore renders wherever it leaves
 * line-height unset, which is nearly everywhere.
 *
 * The font's hhea and OS/2 typo metrics are ascender 1085 and descender −415
 * over 1000 units per em, with no line gap. A browser rounds each to whole
 * pixels and adds them, so the ratio is only exactly 1.5 at sizes where both
 * land on integers: 11 pt comes to 17 (1.545), 13 to 19 (1.462), 15 to 22
 * (1.467), 10.5 to 15 (1.429). The formula below was checked against
 * Chromium at every size in the scale and matched all seventeen.
 *
 * That is why the ratio matters: assuming a flat 1.5 — or README's own
 * figures — is wrong by up to half a point a line, which compounds down a
 * long screen and is exactly what ACCEPTANCE.md's ±2 pt is measuring.
 */
const ASCENDER = 1.085;
const DESCENDER = 0.415;

export function naturalLineHeight(size: number): number {
  return Math.round(ASCENDER * size) + Math.round(DESCENDER * size);
}

/** The nominal ratio the metrics give. Use `naturalLineHeight()` to lay out. */
export const NATURAL_LINE_HEIGHT = 1.5;

/**
 * Type scale.
 *
 * Sizes are pt (== px at 1x). `lh` is an absolute line height, because React
 * Native's lineHeight is absolute rather than a multiplier.
 *
 * Every token but `display` takes its natural line height, because that is
 * what the prototype renders: of roughly 300 sized elements in it, fewer than
 * 30 set a line-height at all. README.md's Line-height column (1.45 for body,
 * 1.4 for micro, 1 for eyebrow and tab, 1.2 for h1) describes the intent, not
 * the artefact the screenshots and ACCEPTANCE.md come from — see
 * BUILD-REVIEW.md §2.16. `display` is the exception: every hero in the
 * prototype sets 1.15 explicitly.
 *
 * Where a particular element does set a line-height — a few 15 pt paragraphs
 * at 1.5, some headings at 1.2 — the screen passes `lh` to <Text> and says
 * which element it is matching.
 */
export const type = {
  display: { size: 32, weight: '600', lh: 36.8, tracking: -0.32 },
  h1: { size: 28, weight: '600', lh: naturalLineHeight(28) },
  h2: { size: 26, weight: '600', lh: naturalLineHeight(26) },
  h3: { size: 22, weight: '600', lh: naturalLineHeight(22) },
  title: { size: 17, weight: '600', lh: naturalLineHeight(17) },
  bodyL: { size: 16, weight: '400', lh: naturalLineHeight(16) },
  body: { size: 15, weight: '400', lh: naturalLineHeight(15) },
  bodyS: { size: 14, weight: '400', lh: naturalLineHeight(14) },
  caption: { size: 13, weight: '400', lh: naturalLineHeight(13) },
  micro: { size: 12, weight: '400', lh: naturalLineHeight(12) },
  /** UPPERCASE, letter-spacing .14em. */
  eyebrow: { size: 11, weight: '600', lh: naturalLineHeight(11), tracking: 1.54 },
  tab: { size: 10.5, weight: '500', lh: naturalLineHeight(10.5), tracking: 0.105 },
} as const;

/** The font family the whole app ships in, EN and AR alike. README § Typography. */
export const fontFamily = 'IBMPlexSansArabic';

/** Minimum tap target. README § Accessibility. */
export const MIN_TAP = 44;

/** The reference frame the design is specified at: iPhone 16 Pro logical size. */
export const REFERENCE_FRAME = { width: 402, height: 874 } as const;

/** README § Motion. Durations in ms. */
export const motion = {
  screenChange: 260,
  checkPop: 400,
  toggle: 200,
  progress: 400,
  /** Toast auto-dismiss, and the Undo window on destructive actions. */
  toastDismiss: 4000,
  /** Press-and-hold on the mic orb before Brain dump opens. */
  micHold: 450,
  /**
   * How long a just-ticked task stays where it was, faded, before it moves
   * into "Done today" — so the list does not jump under the finger.
   */
  doneRowLinger: 1100,
  /** Focus screen dims its UI after this long with no touch. */
  focusIdleDim: 4000,
  easing: [0.2, 0.8, 0.2, 1] as const,
  popEasing: [0.3, 1.5, 0.5, 1] as const,
} as const;

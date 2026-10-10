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
  /** Sign-in consent checkbox border when unchecked. SCREENS § 01. */
  checkbox: '#C9C9C5',
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
  /** Snoozed pill. */
  snoozeFg: '#6C44A4',
  /** Trial / info pill. */
  infoBg: '#D8EEFF',
  infoFg: '#004E90',
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
 * Type scale.
 *
 * Sizes are pt (== px at 1x). `lh` is an absolute line height, because React
 * Native's lineHeight is absolute rather than a multiplier.
 *
 * The values are the ones the prototype actually computes, measured by
 * `scripts/measure-prototype-type.js`, not the ratios in README.md's table —
 * the two disagree in three places and the screenshots show the prototype:
 *   body-s  README 1.5 (21.0) -> prototype 1.45 (20.3)
 *   caption README 1.45 (18.85) -> prototype 1.45 (18.85), agrees
 *   micro   README 1.4 (16.8) -> prototype 1.5 (18.0)
 * A 0.7 pt difference compounds down a long screen, which is what
 * ACCEPTANCE.md's "±2 pt" is measuring. Individual screens may still override
 * `lineHeight` where the prototype does; the comparison harness will say so.
 */
export const type = {
  display: { size: 32, weight: '600', lh: 36.8, tracking: -0.32 },
  h1: { size: 28, weight: '600', lh: 33.6 },
  h2: { size: 26, weight: '600', lh: 31.2 },
  h3: { size: 22, weight: '600', lh: 28.6 },
  title: { size: 17, weight: '600', lh: 22.1 },
  bodyL: { size: 16, weight: '400', lh: 24 },
  body: { size: 15, weight: '400', lh: 22.5 },
  bodyS: { size: 14, weight: '400', lh: 20.3 },
  caption: { size: 13, weight: '400', lh: 18.85 },
  micro: { size: 12, weight: '400', lh: 18 },
  /** UPPERCASE, letter-spacing .14em. */
  eyebrow: { size: 11, weight: '600', lh: 11, tracking: 1.54 },
  tab: { size: 10.5, weight: '500', lh: 11, tracking: 0.105 },
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
  /** Focus screen dims its UI after this long with no touch. */
  focusIdleDim: 4000,
  easing: [0.2, 0.8, 0.2, 1] as const,
  popEasing: [0.3, 1.5, 0.5, 1] as const,
} as const;

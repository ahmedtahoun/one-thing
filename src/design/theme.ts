/**
 * Light and dark.
 *
 * The app's colours are the token objects in tokens.ts, read as screens
 * render. Switching the theme rewrites those objects in place and asks the
 * language context (which nearly every component already reads) to render
 * again, so nothing has to be passed down or remounted.
 *
 * Dark is the light palette inverted in meaning, not just in value: `ink`
 * stays "the strong colour" (it becomes near-white), `surface.white` stays
 * "the page" (it becomes near-black). A primary button is `ink.base` with
 * `surface.white` text, so in dark it is a light button with dark text.
 */
import { ink, noteColour, planBadge, settingsTile, status, surface, typeColour } from './tokens';

export type ThemeMode = 'light' | 'dark';

type Palette = {
  ink: Record<string, string>;
  surface: Record<string, string>;
  status: Record<string, string>;
  typeColour: Record<string, { fg: string; bg: string }>;
  noteColour: { fg: string; bg: string };
  settingsTile: Record<string, { fg: string; bg: string }>;
  planBadge: Record<string, string>;
};

/**
 * The dark palette is WhatsApp's: a blue-black page, slightly lighter panels,
 * soft off-white text, muted grey-blue secondary text, a gentle coral for
 * alerts and a calm green for success — nothing pure white or fully saturated
 * on a dark ground, which is what tires the eyes.
 */
const DARK: Palette = {
  ink: {
    base: '#E9EDEF',
    s2: '#D1D7DB',
    s3: '#AEBAC1',
    s4: '#8696A0',
    s5: '#7D8F99',
    s6: '#53656F',
    s7: '#3B4A54',
    onInk: '#8696A0',
    muted: '#667781',
    disabledBtn: '#2A3942',
    onInkSoft: 'rgba(0,0,0,0.55)',
    solid: '#00A884',
    card: '#202C33',
  },
  surface: {
    line: '#2A3942',
    lineSoft: '#222D34',
    lineFaint: '#1A262D',
    fill: '#202C33',
    fill2: '#0B141A',
    thread: '#0B141A',
    threadMark: 'rgba(255,255,255,0.045)',
    trackOff: '#3B4A54',
    white: '#111B21',
    checkbox: '#3B4A54',
    progressTrack: '#2A3942',
    onInkLine: '#3B4A54',
    handle: '#3B4A54',
    trackOffChannel: '#3B4A54',
    accordionOpen: '#16222A',
    cardLine: '#222D34',
    avatar: '#202C33',
    avatarPeople: '#2A3942',
    clearButton: '#3B4A54',
    countIdle: '#2A3942',
    langTrack: '#202C33',
    brief: '#182229',
    briefRule: '#222D34',
    onCard: '#E9EDEF',
    onInkFill: '#2A3942',
    onInkTile: 'rgba(0,0,0,0.10)',
    glassFadeFrom: 'rgba(17,27,33,0)',
    glassFadeTo: 'rgba(17,27,33,0.9)',
    glassBorder: 'rgba(255,255,255,0.08)',
    glassFill: 'rgba(32,44,51,0.82)',
    glassActive: 'rgba(0,168,132,0.24)',
    glassRing: 'rgba(255,255,255,0.28)',
  },
  status: {
    danger: '#F15C6E',
    dangerFg: '#F15C6E',
    dangerBg: '#2F1C21',
    successFg: '#25D366',
    successBg: '#103629',
    warnBg: '#33291A',
    warnFg: '#FFD279',
    duplicateBg: '#33291A',
    duplicateFg: '#FFD279',
    noteBg: '#2B2615',
    noteFg: '#F0D58A',
    saveTag: '#00A884',
    overdueFg: '#F15C6E',
    snoozeFg: '#B8A3F0',
    onInkUrgent: '#F15C6E',
    successBgSoft: '#103629',
    countBadge: '#E5484D',
    invalid: '#F15C6E',
    dangerTile: '#2F1C21',
    infoBg: '#12303F',
    infoFg: '#53BDEB',
  },
  typeColour: {
    call: { fg: '#F5A25D', bg: '#3A2A1B' },
    email: { fg: '#53BDEB', bg: '#12303F' },
    whatsapp: { fg: '#25D366', bg: '#103629' },
    reminder: { fg: '#B8A3F0', bg: '#2A2640' },
    visit: { fg: '#FFD279', bg: '#33291A' },
    meeting: { fg: '#4FD1C5', bg: '#0F3A3A' },
    webinar: { fg: '#F28DB8', bg: '#3A1F2E' },
    course: { fg: '#B5CC5E', bg: '#2B3315' },
  },
  noteColour: { fg: '#F0D58A', bg: '#2B2615' },
  // Pro lightens and takes dark text, the way every filled thing does in
  // dark. Pro+ inverts outright: ink and gold swap, because a near-black
  // pill on a near-black card is not a badge.
  planBadge: {
    proTop: '#00C79E',
    proBottom: '#00A884',
    proText: '#06231C',
    proEdge: 'rgba(255,255,255,0.30)',
    plusTop: '#F0D291',
    plusBottom: '#C9A354',
    plusText: '#2A1D00',
    plusEdge: 'rgba(255,255,255,0.40)',
    trialBg: '#2E2614',
    trialLine: '#514428',
    trialText: '#F0D291',
  },
  settingsTile: {
    reminders: { bg: '#2A2640', fg: '#B8A3F0' },
    notifications: { bg: '#3A2A1B', fg: '#F5A25D' },
    channels: { bg: '#103629', fg: '#25D366' },
    privacy: { bg: '#12303F', fg: '#53BDEB' },
    coffee: { bg: '#3A2D18', fg: '#F0A95C' },
    rate: { bg: '#33291A', fg: '#FFD279' },
    help: { bg: '#0F3A3A', fg: '#4FD1C5' },
  },
};

const writable = (target: object): Record<string, unknown> => target as Record<string, unknown>;

/** What each token was in light, remembered the first time the theme changes. */
let LIGHT: Palette | null = null;
let mode: ThemeMode = 'light';

function snapshot(): Palette {
  const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    ink: copy(ink),
    surface: copy(surface),
    status: copy(status),
    typeColour: copy(typeColour),
    noteColour: copy(noteColour),
    settingsTile: copy(settingsTile),
    planBadge: copy(planBadge),
  };
}

function assign(palette: Palette): void {
  Object.assign(writable(ink), palette.ink);
  Object.assign(writable(surface), palette.surface);
  Object.assign(writable(status), palette.status);
  for (const [key, value] of Object.entries(palette.typeColour)) Object.assign(writable(typeColour)[key] as object, value);
  Object.assign(writable(noteColour), palette.noteColour);
  for (const [key, value] of Object.entries(palette.settingsTile)) Object.assign(writable(settingsTile)[key] as object, value);
  Object.assign(writable(planBadge), palette.planBadge);
}

/** Makes every token read as `next` from now on. Cheap, and safe to call on every render. */
export function applyTheme(next: ThemeMode): void {
  if (next === mode) return;
  LIGHT ??= snapshot();
  assign(next === 'dark' ? DARK : LIGHT);
  mode = next;
}

export const currentTheme = (): ThemeMode => mode;

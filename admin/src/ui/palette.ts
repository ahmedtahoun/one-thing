/**
 * The prototype's colour tables (`admin-logic.js`: PLAN, SUB, TT, SRC, and
 * `chip`), kept as it writes them — browsers draw OKLCH natively, so unlike
 * the app nothing here is baked to sRGB.
 */
import type { Plan, SubStatus, TaskKind, Ticket } from '@/data/types';

export const INK = '#0b0b0b';
export const RED = 'oklch(0.5 0.17 25)';
export const GREEN = 'oklch(0.45 0.12 150)';

export const PLAN: Record<Plan, [string, string, string]> = {
  free: ['Free', '#f3f2ee', '#55554f'],
  trial: ['Trial', 'oklch(0.95 0.04 250)', 'oklch(0.42 0.13 250)'],
  pro: ['Pro', '#0b0b0b', '#fff'],
  lapsed: ['Lapsed', 'oklch(0.95 0.04 25)', 'oklch(0.48 0.16 25)'],
};

export const SUB: Record<SubStatus, [string, string, string]> = {
  active: ['Active', 'oklch(0.94 0.05 150)', 'oklch(0.4 0.12 150)'],
  trial: ['Trial', 'oklch(0.95 0.04 250)', 'oklch(0.42 0.13 250)'],
  grace: ['Billing issue', 'oklch(0.95 0.05 80)', 'oklch(0.42 0.1 70)'],
  cancelled: ['Cancels', '#f3f2ee', '#55554f'],
  refunded: ['Refunded', 'oklch(0.95 0.04 25)', 'oklch(0.48 0.16 25)'],
};

/**
 * The prototype has six task kinds; the app has eight. Webinar and Course
 * take Meeting's and Remind's colours — BUILD-REVIEW.md §2.37.
 */
export const TT: Record<TaskKind, [string, string, string]> = {
  call: ['Call', 'oklch(0.95 0.04 50)', 'oklch(0.5 0.15 50)'],
  email: ['Email', 'oklch(0.95 0.035 250)', 'oklch(0.45 0.14 250)'],
  whatsapp: ['WhatsApp', 'oklch(0.95 0.04 150)', 'oklch(0.42 0.13 150)'],
  reminder: ['Remind', 'oklch(0.95 0.035 300)', 'oklch(0.48 0.15 300)'],
  meeting: ['Meeting', 'oklch(0.95 0.035 200)', 'oklch(0.45 0.12 200)'],
  visit: ['Visit', 'oklch(0.95 0.04 90)', 'oklch(0.45 0.11 85)'],
  webinar: ['Webinar', 'oklch(0.95 0.035 200)', 'oklch(0.45 0.12 200)'],
  course: ['Course', 'oklch(0.95 0.035 300)', 'oklch(0.48 0.15 300)'],
};

export const SRC: Record<Ticket['source'], [string, string, string]> = {
  app: ['In-app', 'oklch(0.95 0.035 250)', 'oklch(0.42 0.13 250)'],
  ios: ['App Store', '#f3f2ee', '#0b0b0b'],
  play: ['Google Play', 'oklch(0.95 0.04 150)', 'oklch(0.42 0.13 150)'],
};

/** A filter chip: ink when on, outlined when off. */
export const chip = (on: boolean) => ({
  bd: on ? '#0b0b0b' : '#e4e4e0',
  bg: on ? '#0b0b0b' : '#fff',
  fg: on ? '#fff' : '#0b0b0b',
});

export const CHECK = {
  ok: ['✓', 'oklch(0.94 0.05 150)', 'oklch(0.4 0.12 150)'],
  warn: ['!', 'oklch(0.95 0.05 80)', 'oklch(0.42 0.1 70)'],
  bad: ['✕', 'oklch(0.95 0.04 25)', 'oklch(0.48 0.16 25)'],
} as const;

export const TONE = { urgent: 'oklch(0.6 0.18 25)', warn: 'oklch(0.65 0.14 70)', quiet: '#c9c9c5' } as const;

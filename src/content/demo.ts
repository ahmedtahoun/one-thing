/**
 * The prototype's demo day, converted into real tasks.
 *
 * Two uses: local development, and the reviewer demo account the store-
 * readiness audit asks for ("seed sample data so the app isn't empty"). Never
 * written into a real user's account.
 *
 * The prototype stores a bare "HH:MM" because it only ever renders one day,
 * and prefixes later days with "z". Here those become real instants relative
 * to the day the data is seeded.
 */
import { SEED_CONTACTS, SEED_FOLLOWUPS, SEED_HISTORY, SEED_TASKS } from './seed';
import type { Lang } from './strings';
import {
  displayName,
  type Channel,
  type Contact,
  type FollowUp,
  type HistoryEntry,
  type HistoryKind,
  type RemindOffset,
  type Task,
} from '@/lib/model-types';
import type { TaskType } from '@/design/tokens';

/** Maps the seed's reminder strings onto the app's enum. */
const REMIND: Record<string, RemindOffset> = {
  at: 'at',
  '10': 'min_10',
  '30': 'min_30',
  '60': 'hour_1',
  morning: 'morning',
};

type SeedTask = (typeof SEED_TASKS)[number];

/**
 * The day the prototype's demo data is written against — `BASE` in its own
 * source. Its later days are absolute ("z2026-10-13"), so they are read as an
 * offset from this and re-applied to `base`. Without that the demo would rot:
 * run it on 2026-10-10 and the seed's "tomorrow" tasks land on today.
 */
const PROTOTYPE_BASE = Date.UTC(2026, 9, 9);

/** "z2026-10-1310:00" marks a task on a later day; plain "10:00" is today. */
function dueAtFor(time: string, base: Date): string | null {
  const later = time.startsWith('z');
  const raw = later ? time.slice(1) : time;
  // A later day is encoded as YYYY-MM-DD immediately followed by HH:MM.
  const match = later ? /^(\d{4}-\d{2}-\d{2})(\d{2}):(\d{2})$/.exec(raw) : /^(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;

  const d = new Date(base);
  if (later) {
    const [y, m, day] = (match[1] as string).split('-').map(Number);
    const offsetDays = (Date.UTC(y as number, (m as number) - 1, day as number) - PROTOTYPE_BASE) / 86400000;
    d.setDate(d.getDate() + offsetDays);
    d.setHours(Number(match[2]), Number(match[3]), 0, 0);
  } else {
    d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  }
  return d.toISOString();
}

/**
 * Builds the demo tasks in one language.
 *
 * `base` decides which day "today" is, so the demo always looks current
 * rather than fixed to the date the handoff was written.
 */
export function demoTasks(lang: Lang, base: Date = new Date()): Task[] {
  return (SEED_TASKS as SeedTask[]).flatMap((seed) => {
    const dueAt = dueAtFor(seed.time, base);
    if (dueAt === null) return [];

    const copy = seed[lang];
    const draft = (seed.draft as Record<Lang, string> | undefined)?.[lang] ?? '';
    const subject = (seed.subject as Record<Lang, string> | undefined)?.[lang];

    return [
      {
        id: seed.id,
        type: seed.type as TaskType,
        title: copy.title,
        who: copy.who,
        contactIds: [],
        dueAt,
        remind: seed.remind ? (REMIND[seed.remind] ?? null) : null,
        status: seed.done ? ('done' as const) : ('open' as const),
        goal: (seed.goal as Record<Lang, string> | undefined)?.[lang],
        points: (seed.points as Record<Lang, string[]> | undefined)?.[lang] ?? [],
        draft: draft || subject ? { body: draft, ...(subject ? { subject } : null) } : undefined,
        createdVia: 'quick' as const,
        createdAt: base.toISOString(),
      },
    ];
  });
}

/** The prototype's eight contacts, in its own order — most recent first. */
export function demoContacts(lang: Lang, base: Date = new Date()): Contact[] {
  return SEED_CONTACTS.map((seed, i) => ({
    id: `c${i + 1}`,
    name: seed[lang],
    role: seed.role[lang] || undefined,
    dial: seed.dial || undefined,
    phone: seed.phone || undefined,
    email: seed.email || undefined,
    lastLabel: seed.last[lang],
    createdAt: base.toISOString(),
  }));
}

/**
 * The prototype's three follow-ups. Each is joined to the demo contact whose
 * name it starts with, where there is one ("Noura · Designer" is Noura
 * Al-Harbi).
 */
export function demoFollowUps(lang: Lang): FollowUp[] {
  const contacts = demoContacts(lang);
  return SEED_FOLLOWUPS.map((seed) => {
    const copy = seed[lang];
    const first = displayName(copy.who).split(' ')[0] ?? '';
    const contact = contacts.find((c) => c.name.startsWith(first));
    return {
      id: seed.id,
      contactId: contact?.id ?? null,
      channel: seed.ch as Channel,
      who: copy.who,
      what: copy.what,
      status: seed.status as FollowUp['status'],
      since: copy.since,
      nextAt: null,
    };
  });
}

/**
 * The prototype's contact history — `[days ago, kind, English, Arabic,
 * HH:MM]`, keyed by the contact's English name — as dated entries, newest
 * first.
 */
export function demoHistory(lang: Lang, base: Date = new Date()): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  SEED_CONTACTS.forEach((contact, i) => {
    const rows = (SEED_HISTORY as Record<string, (string | number)[][]>)[contact.en] ?? [];
    rows.forEach((row, j) => {
      const [daysAgo, kind, en, ar, time] = row as [number, string, string, string, string];
      const [h, m] = time.split(':').map(Number);
      const at = new Date(base);
      at.setDate(at.getDate() - daysAgo);
      at.setHours(h ?? 0, m ?? 0, 0, 0);
      entries.push({ id: `h${i + 1}_${j}`, contactId: `c${i + 1}`, kind: kind as HistoryKind, text: lang === 'ar' ? ar : en, at: at.toISOString() });
    });
  });
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

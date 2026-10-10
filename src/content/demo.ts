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
import { SEED_TASKS } from './seed';
import type { Lang } from './strings';
import type { RemindOffset, Task } from '@/lib/model-types';
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

/** "z2026-10-13 10:00" marks a task on a later day; plain "10:00" is today. */
function dueAtFor(time: string, base: Date): string | null {
  const later = time.startsWith('z');
  const raw = later ? time.slice(1) : time;
  // A later day is encoded as YYYY-MM-DD immediately followed by HH:MM.
  const match = later ? /^(\d{4}-\d{2}-\d{2})(\d{2}):(\d{2})$/.exec(raw) : /^(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;

  const d = new Date(base);
  if (later) {
    const [y, m, day] = (match[1] as string).split('-').map(Number);
    d.setFullYear(y as number, (m as number) - 1, day as number);
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

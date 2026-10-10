/**
 * The event form's shape and the rules that vary by type. SCREENS.md § 09.
 *
 * The spec gives those rules as a table — which field appears for a Visit, a
 * Meeting, a Webinar, a Course — so they are a table here too rather than a
 * chain of conditions spread through the view.
 */
import type { TaskType } from '@/design/tokens';
import type { RemindOffset } from '@/lib/model-types';

export type EventType = Extract<TaskType, 'visit' | 'meeting' | 'webinar' | 'course'>;

export const EVENT_TYPES: EventType[] = ['visit', 'meeting', 'webinar', 'course'];

export function isEventType(value: string | undefined): value is EventType {
  return EVENT_TYPES.includes(value as EventType);
}

/** The hours the time row offers, 08:00 to 21:00. */
export const EVENT_TIMES = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

/** "In person" is the fourth platform, and it is the one that hides the link. */
export const IN_PERSON = 3;

/** EVX.rems, in order: 10 min before · 1 hr before · Day before · None. */
export const EVENT_REMINDERS: (RemindOffset | null)[] = ['min_10', 'hour_1', 'day_before', null];

export type EventDraft = {
  type: EventType;
  title: string;
  /** Index into EVX.plats (meeting) or EVX.cplats (course). */
  platform: number;
  link: string;
  host: string;
  location: string;
  /** Indexes into the contact list. */
  who: number[];
  lesson: string;
  /** Indexes into EVX.wk, Sunday first. */
  studyDays: number[];
  /** Index into EVX.dates: Today · Tomorrow · This week. */
  day: number;
  time: string;
  /** Index into EVX.durs. */
  duration: number;
  /** Index into EVENT_REMINDERS. */
  remind: number;
  progress: { done: number; total: number };
  notes: string;
};

export function emptyDraft(type: EventType): EventDraft {
  return {
    type,
    title: '',
    platform: 0,
    link: '',
    host: '',
    location: '',
    who: [],
    lesson: '',
    studyDays: [],
    day: 0,
    time: '10:00',
    duration: 1,
    remind: 1,
    progress: { done: 0, total: 10 },
    notes: '',
  };
}

/** SCREENS.md § 09's field table, as a predicate per row. */
export function visibleFields(draft: EventDraft) {
  const { type, platform } = draft;
  return {
    platform: type === 'meeting' || type === 'course',
    link: type !== 'visit' && !(type === 'meeting' && platform === IN_PERSON),
    host: type === 'webinar',
    location: type === 'visit' || (type === 'meeting' && platform === IN_PERSON),
    who: type === 'visit' || type === 'meeting',
    lesson: type === 'course',
    studyDays: type === 'course',
    day: type !== 'course',
    duration: type === 'meeting',
    progress: type === 'course',
  };
}

/** Visit takes one person; a meeting takes several. */
export function isMultiPerson(type: EventType): boolean {
  return type === 'meeting';
}

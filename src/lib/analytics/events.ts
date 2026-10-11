/**
 * The analytics event taxonomy, exactly as DATA_MODEL.md § Analytics events
 * (pseudonymised) lists it:
 *
 *   signin, setup_done, one_thing_set, task_created{type,via}, task_done,
 *   compose_opened{channel}, send_confirmed, followup_created, nudge_opened,
 *   focus_started{min}, focus_completed, review_closed, paywall_viewed,
 *   trial_started{period}, purchase{product}, tip{product}, account_deleted
 *
 * Two rules come with it: "Phone/email SHA-256 hashed; never send message
 * text." No event below carries a phone, an email or any free text — the
 * union is the whole surface, so there is nothing to hash and no way to add
 * a message body without changing this file. That is a stronger guarantee
 * than hashing would have been, and why no hash helper exists.
 *
 * Events wait in a device queue and go up with the next sync, like consent —
 * `./track.ts` holds the queue. This file is only the taxonomy and the shape
 * of a stored event, so it can be read and tested without touching storage.
 */
import type { Channel, CreatedVia } from '../model-types';
import type { TaskType } from '@/design/tokens';

/**
 * `account_deleted` is not in this union on purpose. It cannot be sent from
 * the device: by the time it happens the account's rows are gone and the
 * session with them, so an insert would either fail row-level security or
 * resurrect a user_id the hard delete just removed. `delete_my_account()`
 * records it server-side instead, with no user_id, which is also how the
 * admin panel counts deletions without keeping who asked
 * (supabase/migrations/0006_events.sql).
 */
export type AnalyticsEvent =
  | { name: 'signin' }
  | { name: 'setup_done' }
  | { name: 'one_thing_set' }
  | { name: 'task_created'; type: TaskType; via: CreatedVia }
  | { name: 'task_done' }
  | { name: 'compose_opened'; channel: Channel }
  | { name: 'send_confirmed' }
  | { name: 'followup_created' }
  | { name: 'nudge_opened' }
  | { name: 'focus_started'; min: number }
  | { name: 'focus_completed' }
  | { name: 'review_closed' }
  | { name: 'paywall_viewed' }
  | { name: 'trial_started'; period: 'month' | 'year' }
  | { name: 'purchase'; product: string }
  | { name: 'tip'; product: string };

export type EventName = AnalyticsEvent['name'];

/** Every name in the taxonomy, including the one only the server can send. */
export const EVENT_NAMES = [
  'signin',
  'setup_done',
  'one_thing_set',
  'task_created',
  'task_done',
  'compose_opened',
  'send_confirmed',
  'followup_created',
  'nudge_opened',
  'focus_started',
  'focus_completed',
  'review_closed',
  'paywall_viewed',
  'trial_started',
  'purchase',
  'tip',
  'account_deleted',
] as const;

/** Sent by `delete_my_account()`, never by the app. */
export const SERVER_ONLY_EVENTS = ['account_deleted'] as const;

/** A queued event: the name, when it happened, and its own properties. */
export type QueuedEvent = {
  name: EventName;
  at: string;
  props: Record<string, string | number> | null;
};

/**
 * 500 events is a few weeks of ordinary use. Past it the oldest go: a device
 * offline for a month must not grow without bound, and a count that is short
 * by the oldest rows is better than a queue that never drains.
 */
export const MAX_QUEUED = 500;

/** Splits an event into its name and its properties, for storage. */
export function queuedEvent(event: AnalyticsEvent, now: Date = new Date()): QueuedEvent {
  const { name, ...props } = event;
  return {
    name,
    at: now.toISOString(),
    props: Object.keys(props).length > 0 ? (props as Record<string, string | number>) : null,
  };
}

/**
 * The device queue every analytics event waits in, and the one function the
 * app calls to add to it.
 *
 * Separate from `./events.ts` so the taxonomy can be read and tested without
 * loading storage, and so a screen importing `track` pulls in one function
 * rather than the whole vocabulary.
 */
import { outbox } from '../outbox';
import { MAX_QUEUED, queuedEvent, type AnalyticsEvent, type QueuedEvent } from './events';

const queue = outbox<QueuedEvent>('ot.analyticsQueue', MAX_QUEUED);

export const readEventQueue = queue.read;
export const dropSentEvents = queue.dropSent;
export const clearEventQueue = queue.clear;

/**
 * Records that something happened. Never awaited by a screen: an event that
 * fails to store must not change what the user sees, so this swallows its own
 * errors and returns immediately.
 */
export function track(event: AnalyticsEvent): void {
  queue.add(queuedEvent(event)).catch(() => {});
}

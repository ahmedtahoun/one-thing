/**
 * Focus sessions and closed evening reviews, waiting to go to the server.
 *
 * Both are things that have already happened, like analytics events, so they
 * wait in an outbox (./outbox.ts) rather than in the three-way sync. Neither
 * is shown back to the user anywhere, which is why there is no local store of
 * them to reconcile against: the device writes them once and forgets them.
 *
 * What reads them is the server. The admin panel's user drawer totals a
 * person's focus minutes from `focus_session` and Growth counts who used
 * Focus this week, so until these were sent both read zero for everyone
 * (RELEASE.md § 9.9). `review` and `review_item` are DATA_MODEL's own tables
 * for the evening review, and "Download my data" includes them.
 */
import { newId } from './ids';
import { outbox } from './outbox';

/** One session on the Focus screen, from the moment it opened. */
export type QueuedFocus = {
  id: string;
  startedAt: string;
  plannedMin: number;
  endedAt: string;
  /** Ended with Finish, rather than by leaving the screen. */
  completed: boolean;
};

/** The database's spelling of each evening-review answer. */
export type ReviewDecision = 'kept' | 'tomorrow' | 'drop';

/** One "Close the day". */
export type QueuedReview = {
  /** The day reviewed, YYYY-MM-DD. */
  date: string;
  /** The answer to "Did you do your One Thing?", if it was given. */
  oneThingDone: boolean | null;
  closedAt: string;
  /** Only the tasks the user marked; a task already done needs no answer. */
  items: { taskId: string; decision: ReviewDecision }[];
};

/** A year of evenings, and more focus sessions than anyone sits. */
const LIMIT = 400;

const focus = outbox<QueuedFocus>('ot.focusQueue', LIMIT);
const reviews = outbox<QueuedReview>('ot.reviewQueue', LIMIT);

export const readFocusQueue = focus.read;
export const dropSentFocus = focus.dropSent;
export const readReviewQueue = reviews.read;
export const dropSentReviews = reviews.dropSent;

export async function clearActivityQueues(): Promise<void> {
  await focus.clear();
  await reviews.clear();
}

/**
 * Starts the record of a session and returns the function that ends it. The
 * screen calls `end(true)` from Finish, or `end(false)` when it is left, and
 * only the first call counts.
 */
export function startFocusRecord(plannedMin: number, now: () => Date = () => new Date()): (completed: boolean) => void {
  const id = newId();
  const startedAt = now().toISOString();
  let ended = false;
  return (completed) => {
    if (ended) return;
    ended = true;
    // Never awaited: a record that fails to store must not hold up the screen.
    focus.add({ id, startedAt, plannedMin, endedAt: now().toISOString(), completed }).catch(() => {});
  };
}

/** Records one closed evening review. Never awaited, like `track`. */
export function recordReview(review: QueuedReview): void {
  reviews.add(review).catch(() => {});
}

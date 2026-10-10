/**
 * "Download my data" — SCREENS.md § 21–23, Privacy & data.
 *
 * The design's behaviour is a request, not a file: the row shows the toast
 * "We'll email your data within 24 hours." So the app's job is to record the
 * request where the admin panel will see it — `privacy_request` with
 * type 'export' and source 'app', which carries the 30-day deadline the
 * panel counts down (ADMIN.md § 11).
 *
 * Until there is a backend the request waits on the device, exactly as
 * consent does. Before this, the toast was the only trace a request had ever
 * been made, which made the Privacy Policy's promise unkeepable
 * (RELEASE.md § 9.3).
 *
 * The export itself is a server job: it has to read every table for the user
 * and email the result. Nothing on the device can do that, and nothing here
 * pretends to.
 */
import { outbox } from './outbox';

export type PrivacyRequestKind = 'export';

export type QueuedPrivacyRequest = {
  kind: PrivacyRequestKind;
  at: string;
};

/**
 * A handful is plenty: asking twice in a day is the same request, and a user
 * who taps it twenty times should not fill the queue.
 */
const MAX_QUEUED = 10;

const queue = outbox<QueuedPrivacyRequest>('ot.privacyRequests', MAX_QUEUED);

export const readPrivacyRequests = queue.read;
export const dropSentPrivacyRequests = queue.dropSent;
export const clearPrivacyRequests = queue.clear;
export const onPrivacyRequestQueued = queue.onQueued;

/**
 * Records an export request. Deliberately not deduplicated: the user asking
 * again tomorrow is a second request with its own deadline, and two rows an
 * hour apart tell support more than one row would.
 */
export async function requestExport(now: Date = new Date()): Promise<void> {
  await queue.add({ kind: 'export', at: now.toISOString() });
}

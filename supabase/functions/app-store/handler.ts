/**
 * What `app-store` does with a notification, with nothing in it that talks to
 * Apple or to Postgres, so it can be tested with stand-ins
 * (handler.test.ts).
 *
 * The status codes matter more than usual here: Apple retries any response
 * that is not 2xx, up to five times over several hours. So a notification we
 * understood — including one we decided not to act on — answers 200, and only
 * a payload we could not verify or a write that failed answers otherwise. A
 * 500 is a request to try again.
 */
import {
  planFor,
  readAppleNotification,
  type AppleNotification,
  type AppleRenewal,
  type AppleTransaction,
  type StoreEvent,
} from '../_shared/store-contract.ts';

export type Verified = {
  notification: AppleNotification;
  transaction: AppleTransaction | null;
  renewal: AppleRenewal | null;
};

export type Recorder = {
  /** Writes the subscription and the plan together. False if already seen. */
  subscription(externalId: string, type: string, event: Extract<StoreEvent, { kind: 'subscription' }>, plan: string): Promise<boolean>;
  tip(externalId: string, type: string, event: Extract<StoreEvent, { kind: 'tip' }>): Promise<boolean>;
  notice(externalId: string, type: string, outcome: 'ignored' | 'failed', detail: string): Promise<boolean>;
};

export type Deps = {
  /** Verifies the signature chain and decodes. Null when it does not verify. */
  verify(signedPayload: string): Promise<Verified | null>;
  record: Recorder;
  now(): Date;
};

export type Reply = { status: number; body: { ok?: true; seen?: true; ignored?: string; error?: string } };

export async function handleApple(body: unknown, deps: Deps): Promise<Reply> {
  const signedPayload = (body as { signedPayload?: unknown } | null)?.signedPayload;
  if (typeof signedPayload !== 'string') return { status: 400, body: { error: 'bad_request' } };

  let verified: Verified | null;
  try {
    verified = await deps.verify(signedPayload);
  } catch (error) {
    // A payload that does not verify is not Apple's. Saying 401 rather than
    // 200 means a real delivery that fails verification is retried instead of
    // silently dropped.
    console.error('[app-store] verification failed:', error instanceof Error ? error.message : error);
    return { status: 401, body: { error: 'unverified' } };
  }
  if (!verified) return { status: 401, body: { error: 'unverified' } };

  const { notification, transaction, renewal } = verified;
  const externalId = notification.notificationUUID;
  // Without it there is no way to tell a redelivery from a new event, and
  // every notification Apple sends has one.
  if (!externalId) return { status: 400, body: { error: 'bad_request' } };
  const type = notification.subtype
    ? `${notification.notificationType} / ${notification.subtype}`
    : notification.notificationType;

  const event = readAppleNotification(notification, transaction, renewal, deps.now());

  try {
    if (event.kind === 'ignored') {
      await deps.record.notice(externalId, type, 'ignored', event.why);
      return { status: 200, body: { ignored: event.why } };
    }
    if (event.kind === 'tip') {
      const fresh = await deps.record.tip(externalId, type, event);
      return { status: 200, body: fresh ? { ok: true } : { seen: true } };
    }
    const plan = planFor(event.status, event.endsAt, deps.now());
    const fresh = await deps.record.subscription(externalId, type, event, plan);
    return { status: 200, body: fresh ? { ok: true } : { seen: true } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[app-store]', detail);
    // Recording the failure is itself best-effort: if the database is the
    // thing that is down, this will not land either.
    await deps.record.notice(externalId, type, 'failed', detail).catch(() => {});
    // Apple will try again, which is what we want: the notification is real
    // and we failed to act on it.
    return { status: 500, body: { error: 'write_failed' } };
  }
}

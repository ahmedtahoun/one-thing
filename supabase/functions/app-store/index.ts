/**
 * POST /functions/v1/app-store — App Store Server Notifications V2.
 *
 * Apple posts here whenever a subscription starts, renews, lapses, is
 * refunded or has its renewal turned off, and whenever a tip is bought. It is
 * the only thing that makes anyone Pro: nothing on a device may write
 * `app_user.plan` or `subscription` (0002_sync.sql revoked it), and this runs
 * as the service role through the functions in 0007_store_webhooks.sql.
 *
 * Verification is Apple's own library, against Apple's root certificate,
 * which the operator supplies — there is no sensible default for a trust
 * anchor and none is invented here. With no root configured the function
 * answers 503 and writes nothing, the way `assist` does with no API key.
 *
 *   # Apple's root, DER, base64: developer.apple.com/certificationauthority/
 *   supabase secrets set APPLE_ROOT_CA_G3="$(base64 -w0 AppleRootCA-G3.cer)"
 *   supabase secrets set APPLE_BUNDLE_ID=app.onlyonething
 *   supabase secrets set APPLE_APP_APPLE_ID=0000000000
 *   supabase functions deploy app-store --no-verify-jwt
 *
 * `--no-verify-jwt` is required and is not a hole: Apple does not send a
 * Supabase token, and the JWS signature is what authenticates the request.
 * Anything that does not verify against Apple's root is refused below.
 */
import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';

import { handleApple, type Recorder, type Verified } from './handler.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Apple sends sandbox and production notifications to the same URL, and which
 * environment a payload belongs to is inside the signed data — so it cannot
 * be known before verifying. Both verifiers are built and production is tried
 * first; the library rejects a payload whose environment does not match.
 */
function verifiers(roots: Buffer[], bundleId: string, appAppleId: number | undefined): SignedDataVerifier[] {
  const built: SignedDataVerifier[] = [];
  if (appAppleId !== undefined) {
    built.push(new SignedDataVerifier(roots, true, Environment.PRODUCTION, bundleId, appAppleId));
  }
  built.push(new SignedDataVerifier(roots, true, Environment.SANDBOX, bundleId));
  return built;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(405, { error: 'bad_request' });

  const rootsRaw = Deno.env.get('APPLE_ROOT_CA_G3');
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID');
  if (!rootsRaw || !bundleId) return json(503, { error: 'unconfigured' });
  // More than one root can be given, comma separated, so a root rollover does
  // not need a deploy.
  const roots = rootsRaw.split(',').map((b64) => Buffer.from(b64.trim(), 'base64'));
  const appAppleId = Number(Deno.env.get('APPLE_APP_APPLE_ID')) || undefined;
  const built = verifiers(roots, bundleId, appAppleId);

  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const rpc = async (name: string, args: Record<string, unknown>): Promise<boolean> => {
    const { data, error } = await service.rpc(name, args);
    if (error) throw new Error(`${name}: ${error.message}`);
    return data === true;
  };

  const record: Recorder = {
    subscription: (externalId, type, event, plan) =>
      rpc('record_store_subscription', {
        p_store: event.store,
        p_external_id: externalId,
        p_type: type,
        p_user_id: event.userId,
        p_product_id: event.productId,
        p_period: event.period,
        p_status: event.status,
        p_plan: plan,
        p_started_at: event.startedAt,
        p_renews_at: event.renewsAt,
        p_ends_at: event.endsAt,
        p_original_transaction_id: event.originalTransactionId,
      }),
    tip: (externalId, type, event) =>
      rpc('record_store_tip', {
        p_store: event.store,
        p_external_id: externalId,
        p_type: type,
        p_user_id: event.userId,
        p_product_id: event.productId,
        p_transaction_id: event.transactionId,
        p_at: event.at,
      }),
    notice: (externalId, type, outcome, detail) =>
      rpc('record_store_notice', {
        p_store: 'app_store',
        p_external_id: externalId,
        p_type: type,
        p_outcome: outcome,
        // Postgres `text`, but there is no reason to store an essay.
        p_detail: detail.slice(0, 500),
      }),
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad_request' });
  }

  const result = await handleApple(body, {
    async verify(signedPayload): Promise<Verified | null> {
      let last: unknown = null;
      for (const verifier of built) {
        try {
          const decoded = await verifier.verifyAndDecodeNotification(signedPayload);
          const data = decoded.data;
          return {
            notification: {
              notificationType: String(decoded.notificationType),
              subtype: decoded.subtype ? String(decoded.subtype) : undefined,
              notificationUUID: decoded.notificationUUID,
            },
            transaction: data?.signedTransactionInfo
              ? await verifier.verifyAndDecodeTransaction(data.signedTransactionInfo)
              : null,
            renewal: data?.signedRenewalInfo
              ? await verifier.verifyAndDecodeRenewalInfo(data.signedRenewalInfo)
              : null,
          };
        } catch (error) {
          last = error;
        }
      }
      throw last instanceof Error ? last : new Error('did not verify');
    },
    record,
    now: () => new Date(),
  });
  return json(result.status, result.body);
});

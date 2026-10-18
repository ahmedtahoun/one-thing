/**
 * POST /functions/v1/play-rtdn — Google Play Real-time Developer
 * Notifications, delivered as a Pub/Sub push.
 *
 * The Play half of what makes anyone Pro. Nothing on a device may write
 * `app_user.plan` or `subscription` (0002_sync.sql revoked it); this runs as
 * the service role through the functions in 0007_store_webhooks.sql.
 *
 * Unlike Apple's, Google's notification is not signed and carries no state.
 * Two things therefore have to be true before anything is written: the push
 * must verify as Google's, and the purchase must be looked up against the
 * Play Developer API. Either missing, and the function writes nothing.
 *
 *   supabase secrets set PLAY_PACKAGE_NAME=app.onlyonething
 *   supabase secrets set PLAY_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
 *   supabase secrets set PLAY_PUSH_SERVICE_ACCOUNT=rtdn@PROJECT.iam.gserviceaccount.com
 *   supabase secrets set PLAY_PUSH_AUDIENCE=https://PROJECT.supabase.co/functions/v1/play-rtdn
 *   supabase functions deploy play-rtdn --no-verify-jwt
 *
 * `--no-verify-jwt` is required — Pub/Sub does not send a Supabase token —
 * and the OIDC check in google.ts is what takes its place. Configure the push
 * subscription with a service account, or every delivery is refused.
 */
import { createClient } from '@supabase/supabase-js';

import { handlePlay, type PlayProductPurchase } from './handler.ts';
import { playApi, pushIsGoogle } from './google.ts';
import type { PlaySubscriptionState } from '../_shared/store-contract.ts';
import type { Recorder } from '../app-store/handler.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(405, { error: 'bad_request' });

  const packageName = Deno.env.get('PLAY_PACKAGE_NAME');
  const serviceAccount = Deno.env.get('PLAY_SERVICE_ACCOUNT_JSON');
  const pushAudience = Deno.env.get('PLAY_PUSH_AUDIENCE');
  const pushAccount = Deno.env.get('PLAY_PUSH_SERVICE_ACCOUNT');
  if (!packageName || !serviceAccount || !pushAudience || !pushAccount) {
    return json(503, { error: 'unconfigured' });
  }

  if (!(await pushIsGoogle(request.headers.get('Authorization'), pushAudience, pushAccount))) {
    return json(401, { error: 'unverified' });
  }

  const api = playApi(serviceAccount, packageName);
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
        p_quantity: event.quantity,
      }),
    notice: (externalId, type, outcome, detail) =>
      rpc('record_store_notice', {
        p_store: 'play',
        p_external_id: externalId,
        p_type: type,
        p_outcome: outcome,
        p_detail: detail.slice(0, 500),
      }),
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad_request' });
  }

  const result = await handlePlay(body, {
    subscription: (token) => api.subscription(token) as Promise<PlaySubscriptionState>,
    product: (productId, token) => api.product(productId, token) as Promise<PlayProductPurchase>,
    record,
    now: () => new Date(),
  });
  return json(result.status, result.body);
});

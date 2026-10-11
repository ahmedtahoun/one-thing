/**
 * POST /functions/v1/export — answers one "Download my data" request.
 *
 * The app's Privacy Policy promises this in both languages and
 * `privacy_request` has carried its 30-day deadline since 0001. The request
 * is queued on the device (src/lib/privacy-request.ts), synced up, and
 * answered here.
 *
 * One request per call: it claims the oldest unanswered one, writes the file,
 * and marks it done. Call it until it answers `{ idle: true }` — on a
 * schedule, or from the admin panel's "Send export" button.
 *
 *   # once, in the dashboard or the CLI: a PRIVATE bucket named `exports`
 *   supabase functions deploy export
 *   # then, on a schedule:
 *   curl -X POST -H "Authorization: Bearer $SERVICE_ROLE_KEY" .../functions/v1/export
 *
 * The bucket must stay private. The file is one person's whole account; it is
 * reached only through a signed URL, made when the link is handed over rather
 * than stored, so it expires.
 *
 * What this does not do is send the email. That needs a provider, which is a
 * decision about who processes the data and is the product owner's to make
 * (RELEASE.md § 9.3). Until one is chosen the file is written and the request
 * is marked answered with its path, and the admin panel's Privacy requests
 * screen is where someone hands it over.
 */
import { createClient } from '@supabase/supabase-js';

import { handleExport, type Claim, type Deps } from './handler.ts';

const BUCKET = 'exports';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json(405, { error: 'bad_request' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json(503, { error: 'unconfigured' });

  // Only the service role may call this: it reads every row of one person's
  // account. Supabase passes the caller's key through, and anything short of
  // the service key is refused.
  const authorization = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (authorization !== serviceKey) return json(401, { error: 'unauthorised' });

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const deps: Deps = {
    async claim(): Promise<Claim | null> {
      const { data, error } = await db.rpc('claim_export_request');
      if (error) throw new Error(`claim: ${error.message}`);
      const row = (data as { id: string; user_id: string; requested_at: string }[] | null)?.[0];
      return row ? { id: row.id, userId: row.user_id, requestedAt: row.requested_at } : null;
    },
    async rows(table, by, userId) {
      const { data, error } = await db.from(table).select('*').eq(by, userId);
      if (error) throw new Error(`${table}: ${error.message}`);
      return (data ?? []) as Record<string, unknown>[];
    },
    async children(table, key, parentIds) {
      const { data, error } = await db.from(table).select('*').in(key, parentIds);
      if (error) throw new Error(`${table}: ${error.message}`);
      return (data ?? []) as Record<string, unknown>[];
    },
    async store(path, document) {
      const { error } = await db.storage
        .from(BUCKET)
        .upload(path, new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }), {
          contentType: 'application/json',
          // A second request from the same person is a new file; the same
          // request retried overwrites its own.
          upsert: true,
        });
      if (error) throw new Error(`storage: ${error.message}`);
    },
    async complete(id, path) {
      const { data, error } = await db.rpc('complete_export_request', { p_id: id, p_path: path });
      if (error) throw new Error(`complete: ${error.message}`);
      return data === true;
    },
    async release(id) {
      const { error } = await db.rpc('release_export_request', { p_id: id });
      if (error) console.error('[export] release failed:', error.message);
    },
    now: () => new Date(),
  };

  const result = await handleExport(deps);
  return json(result.status, result.body);
});

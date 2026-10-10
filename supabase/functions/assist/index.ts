/**
 * POST /functions/v1/assist — the free-text screens' backend
 * (src/lib/parse/remote.ts is its client).
 *
 * People are read as the signed-in person, so row-level security limits
 * them to their own. The meter is spent as the service role, for the user
 * this function has verified — a user's own session cannot touch it. The
 * Claude API key is read from the function's environment and never leaves it.
 *
 *   supabase secrets set ANTHROPIC_API_KEY=…
 *   supabase functions deploy assist
 */
import { createClient } from '@supabase/supabase-js';

import { claudeAsk } from './claude.ts';
import { handle } from './handler.ts';

// The app's web build calls this from the browser; the native app ignores CORS.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json(405, { error: 'bad_request' });

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json(401, { error: 'unauthorised' });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  // The token is passed explicitly: with no stored session, getUser() would
  // otherwise have nothing to check.
  const { data: user } = await db.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  if (!user.user) return json(401, { error: 'unauthorised' });
  const who = user.user.id;
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json(503, { error: 'unavailable' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad_request' });
  }

  const result = await handle(body, {
    async spend(meter, timeZone) {
      const { data, error } = await service.rpc('spend_assist_request', { who, meter, time_zone: timeZone });
      if (error) throw new Error(error.message);
      return data === true;
    },
    async refund(meter, timeZone) {
      await service.rpc('refund_assist_request', { who, meter, time_zone: timeZone });
    },
    async people() {
      const { data, error } = await db.from('contact').select('id, name, role_company').order('created_at', { ascending: false }).limit(300);
      if (error) throw new Error(error.message);
      return (data ?? []).map((c) => ({ id: String(c.id), name: String(c.name), role: (c.role_company as string | null) ?? null }));
    },
    ask: claudeAsk(apiKey),
  });
  return json(result.status, result.body);
});

/**
 * The free-text screens' client for the `assist` edge function
 * (supabase/functions/assist/), where Claude reads the note with the API key
 * held server-side.
 *
 * Whatever comes back is read through the same contract the server used
 * (supabase/functions/_shared/assist-contract.ts) before a screen sees it.
 * When the backend is not there — no project configured, nobody signed in
 * to it, offline, or it could not answer — this returns null and the caller
 * uses the on-device rules instead (./index.ts). The one answer that is
 * passed on rather than covered over is "limit": the Free plan's Assistant
 * requests are used up, which the Assistant screen turns into the paywall.
 */
import {
  readResult,
  type AssistIntent,
  type AssistOp,
  type AssistRequest,
  type AssistResult,
  type AssistTask,
} from '../../../supabase/functions/_shared/assist-contract';
import { supabase } from '../supabase';
import type { AssistantIntent, ParseContext, ParsedTask } from './types';

/** The app's types and the wire's are the same shapes; this line stops them drifting. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const SAME_TASK: Same<ParsedTask, AssistTask> = true;
const SAME_INTENT: Same<AssistantIntent, AssistIntent> = true;
void SAME_TASK;
void SAME_INTENT;

/** The server says today's Assistant requests are used up. */
export class AssistLimitError extends Error {
  constructor() {
    super('assistant limit reached');
    this.name = 'AssistLimitError';
  }
}

/** Sends a request; null when there is no backend to send it to. */
export type Invoke = (request: AssistRequest) => Promise<{ status: number; data: unknown } | null>;

/** How long a person waits before the on-device rules answer instead. */
const TIMEOUT_MS = 15_000;

export const supabaseInvoke: Invoke = async (request) => {
  const db = supabase();
  if (!db) return null;
  const { data: session } = await db.auth.getSession();
  if (!session.session) return null;
  const { data, error } = await db.functions.invoke('assist', { body: request, timeout: TIMEOUT_MS });
  if (!error) return { status: 200, data };
  const response = (error as { context?: unknown }).context;
  if (response instanceof Response) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Not JSON; the status alone decides.
    }
    return { status: response.status, data: body };
  }
  // A network failure or a timeout: no backend, as far as this request goes.
  return null;
};

/**
 * One request to the backend: its result, read through the contract, or
 * null to fall back. Throws only AssistLimitError, and only for the
 * Assistant: Quick capture and Brain dump have no limit the person knows
 * of, so the server's guard on them just means the on-device rules answer.
 */
export async function askBackend(op: AssistOp, text: string, ctx: ParseContext, invoke: Invoke = supabaseInvoke): Promise<AssistResult | null> {
  let reply: Awaited<ReturnType<Invoke>>;
  try {
    reply = await invoke({
      op,
      text,
      lang: ctx.lang,
      now: ctx.now.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
  } catch {
    return null;
  }
  if (!reply) return null;
  if (reply.status === 429) {
    if (op === 'interpret') throw new AssistLimitError();
    return null;
  }
  if (reply.status !== 200 || typeof reply.data !== 'object' || reply.data === null || !('result' in reply.data)) return null;
  return readResult(op, (reply.data as { result: unknown }).result, new Set(ctx.contacts.map((c) => c.id)));
}

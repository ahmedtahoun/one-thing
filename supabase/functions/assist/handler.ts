/**
 * What `assist` does with a request, independent of Deno and of Supabase so
 * it can be tested with stand-ins (handler.test.ts):
 *
 *   1. read the request, or 400;
 *   2. spend one of today's requests — the Assistant's 10 on the Free plan,
 *      or the parsing guard — or 429 "limit";
 *   3. ask Claude, with the person's People to match names against;
 *   4. read the answer against the contract, or give the request back and
 *      503 "unavailable", which tells the app to use its on-device rules.
 *
 * A request is only ever charged for an answer the person actually gets.
 */
import { readRequest, readResult, type AssistResponse } from '../_shared/assist-contract.ts';
import type { Ask } from './claude.ts';
import { SCHEMA, SYSTEM, userTurn, type Person } from './prompt.ts';

/** `assistant` is the Assistant screen's meter; `parse` is Quick capture and Brain dump. */
export type Meter = 'assistant' | 'parse';

export type Deps = {
  /** Spends one request; false when today's are used up. */
  spend(meter: Meter, timeZone: string): Promise<boolean>;
  /** Gives one back, when no answer came of it. */
  refund(meter: Meter, timeZone: string): Promise<void>;
  /** The person's People, through their own session (row-level security). */
  people(): Promise<Person[]>;
  ask: Ask;
};

export async function handle(body: unknown, deps: Deps): Promise<{ status: number; body: AssistResponse }> {
  const req = readRequest(body);
  if (!req) return { status: 400, body: { error: 'bad_request' } };

  const meter: Meter = req.op === 'interpret' ? 'assistant' : 'parse';
  if (!(await deps.spend(meter, req.timeZone))) return { status: 429, body: { error: 'limit' } };

  try {
    const people = await deps.people();
    const raw = await deps.ask(SYSTEM, userTurn(req, people), SCHEMA[req.op]);
    const result = raw === null ? null : readResult(req.op, raw, new Set(people.map((p) => p.id)));
    if (result) return { status: 200, body: { result } };
  } catch (error) {
    console.error('[assist]', error instanceof Error ? error.message : error);
  }
  await deps.refund(meter, req.timeZone).catch(() => {});
  return { status: 503, body: { error: 'unavailable' } };
}

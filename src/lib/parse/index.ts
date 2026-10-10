/**
 * The one place the free-text screens get their parser from.
 *
 * With a backend and a signed-in session, every note goes to the `assist`
 * edge function (./remote.ts), where Claude reads it with the person's
 * People and the API key held server-side; the Free plan's 10 Assistant
 * requests a day are enforced there. Without one — before the Supabase
 * project exists, offline, or when it cannot answer — the on-device rules in
 * ./local.ts answer instead, so the screens never stop working.
 *
 * The client's own meter (src/lib/assistant-meter.ts) is the same rule kept
 * on the device, so the Assistant can open the paywall without a round
 * trip; the server's is the one that decides, and its "limit" comes back as
 * AssistLimitError.
 */
import { localParser } from './local';
import { askBackend, type Invoke } from './remote';
import type { AssistantIntent, ParsedTask, TextParser } from './types';

/** The backend first, the on-device rules when it is not there. */
export function backedParser(invoke?: Invoke): TextParser {
  return {
    async parse(text, ctx) {
      return ((await askBackend('parse', text, ctx, invoke)) as ParsedTask | null) ?? localParser.parse(text, ctx);
    },
    async split(text, ctx) {
      return ((await askBackend('split', text, ctx, invoke)) as ParsedTask[] | null) ?? localParser.split(text, ctx);
    },
    async interpret(text, ctx) {
      return ((await askBackend('interpret', text, ctx, invoke)) as AssistantIntent | null) ?? localParser.interpret(text, ctx);
    },
  };
}

export const textParser: TextParser = backedParser();

export { AssistLimitError } from './remote';
export type { AssistantIntent, ParseContext, ParsedTask, ParsedType, TextParser } from './types';

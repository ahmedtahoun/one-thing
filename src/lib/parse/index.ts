/**
 * The one place the free-text screens get their parser from.
 *
 * **The on-device rules go first, and the backend answers what they cannot.**
 * It used to be the other way round, which cost a request on every note and
 * quietly broke a feature: the wire's `AssistTask` has no `kind` field, so a
 * reply from the server can never carry "promise" or "waiting", and with the
 * server asked first those two shapes never reached the screens that handle
 * them (./confidence.ts explains it, BUILD-REVIEW §2.69).
 *
 * So: ./confidence.ts decides whether the sentence was explicit enough for the
 * rules in ./local.ts to be sure. When it was, the answer comes from the
 * phone — instantly, offline, and without spending one of the Free plan's 10
 * Assistant requests a day. When it was not, the note goes to the `assist`
 * edge function (./remote.ts), where Claude reads it with the person's People
 * and the API key held server-side, and the rules answer anyway if that
 * cannot be reached.
 *
 * Two things this does not change. The screens still show every proposal for
 * confirmation before anything is saved, whichever parser produced it, and
 * ./clarify.ts still asks about whatever is missing. And the meter is still
 * the server's to enforce: the client's copy
 * (src/lib/assistant-meter.ts) only lets the Assistant open the paywall
 * without a round trip, and the server's "limit" comes back as
 * AssistLimitError.
 */
import { dumpIsEnough, localIsEnough } from './confidence';
import { localParser, splitDump } from './local';
import { loopOf } from './promise';
import { askBackend, type Invoke } from './remote';
import type { AssistantIntent, ParseContext, ParsedTask, TextParser } from './types';

/**
 * A promise or a waiting, put back onto an answer that came from the server.
 *
 * `localIsEnough` returns 'loop' for both shapes, so a note carrying one never
 * reaches the server in the first place and this should never have anything to
 * do. It is here so that the bug it was written for cannot come back by
 * accident: if the gate above is ever loosened, the wire's missing `kind`
 * stops being able to silently drop the feature again.
 */
function keepKind(task: ParsedTask, text: string, ctx: ParseContext): ParsedTask {
  if (task.kind) return task;
  const loop = loopOf(text, ctx.contacts);
  return loop ? { ...task, kind: loop.kind } : task;
}

/** The on-device rules where they are sure, the backend where they are not. */
export function backedParser(invoke?: Invoke): TextParser {
  return {
    async parse(text, ctx) {
      if (localIsEnough(text, ctx)) return localParser.parse(text, ctx);
      const answer = (await askBackend('parse', text, ctx, invoke)) as ParsedTask | null;
      return answer ? keepKind(answer, text, ctx) : localParser.parse(text, ctx);
    },
    async split(text, ctx) {
      if (dumpIsEnough(splitDump(text), ctx)) return localParser.split(text, ctx);
      const answer = (await askBackend('split', text, ctx, invoke)) as ParsedTask[] | null;
      return answer ?? localParser.split(text, ctx);
    },
    async interpret(text, ctx) {
      if (localIsEnough(text, ctx)) return localParser.interpret(text, ctx);
      const answer = (await askBackend('interpret', text, ctx, invoke)) as AssistantIntent | null;
      if (!answer) return localParser.interpret(text, ctx);
      return answer.kind === 'task' ? { kind: 'task', task: keepKind(answer.task, text, ctx) } : answer;
    },
  };
}

export const textParser: TextParser = backedParser();

export { AssistLimitError } from './remote';
export { enoughFor, localIsEnough } from './confidence';
export type { AssistantIntent, ParseContext, ParsedTask, ParsedType, TextParser } from './types';

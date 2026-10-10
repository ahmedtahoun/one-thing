/**
 * The one place the free-text screens get their parser from.
 *
 * Today that is the on-device rules in ./local.ts. When the backend exists it
 * becomes a client for one endpoint, and nothing else in the app changes:
 *
 *   POST /assist  { op: 'parse' | 'split' | 'interpret', text, lang, now }
 *   → ParsedTask | ParsedTask[] | AssistantIntent, exactly as in ./types.ts
 *
 * The server holds the Claude API key, keeps the person's contacts to match
 * names against, and enforces the Free plan's 10 assistant requests a day
 * (DATA_MODEL § AI / parsing) — the client's own meter
 * (src/lib/assistant-meter.tsx) is the same rule kept on the device, so the
 * Assistant can open the paywall without a round trip, not a substitute for
 * the server's. The response must be validated against these types before it
 * reaches a screen: the Assistant may only ever say what they can hold.
 */
import { localParser } from './local';
import type { TextParser } from './types';

export const textParser: TextParser = localParser;

export type { AssistantIntent, ParseContext, ParsedTask, ParsedType, TextParser } from './types';

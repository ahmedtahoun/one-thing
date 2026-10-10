/**
 * The one call to Claude. The API key lives only in the edge function's
 * environment (ANTHROPIC_API_KEY); the app never sees it.
 */
import Anthropic from '@anthropic-ai/sdk';

/** Asks for JSON in `schema`; null when there is no usable answer. */
export type Ask = (system: string, user: string, schema: Record<string, unknown>) => Promise<unknown>;

export const MODEL = 'claude-opus-5-5';

export function claudeAsk(apiKey: string): Ask {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 30_000 });
  return async (system, user, schema) => {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      // Parsing a note is a light task: low effort keeps it quick and cheap.
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      // A declined request is retried server-side on Anthropic's recommended
      // fallback model rather than coming back empty.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
    });
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') return null;
    const text = response.content.find((block) => block.type === 'text');
    if (!text || text.type !== 'text') return null;
    try {
      return JSON.parse(text.text);
    } catch {
      return null;
    }
  };
}

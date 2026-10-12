/** Parses a sentence with the on-device rules and asks what is worth asking about it. Test helper. */
import { clarify, type World } from './clarify';
import { localParser } from './local';

export async function askFor(text: string, world: World) {
  const draft = await localParser.parse(text, { lang: 'en', now: world.now, contacts: world.contacts });
  return { draft, gap: clarify(text, draft, world) };
}

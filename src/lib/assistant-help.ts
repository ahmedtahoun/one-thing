/**
 * How much somebody has used Sanad, and whether they have answered its one
 * question — kept on the device, like the habits and the introduction flag.
 *
 * Both halves exist only to decide when to ask and when to stop asking
 * (src/features/assistant/ask-to-help.ts). Nothing is sent anywhere: the
 * answer itself travels as a consent row, which is where a decision about
 * data belongs. BUILD-REVIEW §2.118.
 */
import { usePersisted } from './persisted';

const KEY = 'ot.assistant.help';

type Stored = { sent: number; decided: boolean };

/** Past this nothing changes, and the number stops growing in storage. */
const ENOUGH_COUNTING = 50;

export function useAssistantHelp(): { sent: number; decided: boolean; ready: boolean; noteSent: () => void; decide: () => void } {
  const [value, setValue, ready] = usePersisted<Stored>(KEY, { sent: 0, decided: false });
  const held = value && typeof value === 'object' ? value : { sent: 0, decided: false };
  return {
    sent: typeof held.sent === 'number' ? held.sent : 0,
    decided: held.decided === true,
    ready,
    noteSent: () =>
      setValue((current) => {
        const now = current && typeof current === 'object' ? current : { sent: 0, decided: false };
        return { ...now, sent: Math.min((now.sent ?? 0) + 1, ENOUGH_COUNTING) };
      }),
    decide: () =>
      setValue((current) => ({ ...(current && typeof current === 'object' ? current : { sent: 0 }), decided: true })),
  };
}

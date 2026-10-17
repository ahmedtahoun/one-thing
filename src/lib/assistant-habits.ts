/**
 * Which Assistant chips this person actually taps, counted on the device.
 *
 * The whole of "it learns from you": a tally per chip key, read once and
 * written on each tap, which `rankChips` uses to bring the ones somebody
 * keeps reaching for nearer their thumb
 * (`src/features/assistant/suggestions.ts`).
 *
 * Deliberately this small. Nothing is sent anywhere, nothing is inferred
 * about the person, and a corrupt or missing blob simply means the chips
 * come back in their data order — the app is never worse for it, only less
 * tailored. Its own key, like `tour.ts` and `mic-consent.ts`, because a
 * habit belongs to the phone it was formed on.
 */
import { usePersisted } from './persisted';

const KEY = 'ot.assistant.habits';

/** Keeps the blob small, and stops one chip's count running away. */
const MAX_PER_CHIP = 50;

export function useAssistantHabits(): { tapped: Record<string, number>; note: (key: string) => void } {
  const [value, setValue] = usePersisted<Record<string, number>>(KEY, {});
  const tapped = value && typeof value === 'object' ? value : {};
  return {
    tapped,
    note: (key) =>
      setValue((current) => {
        const counts = current && typeof current === 'object' ? current : {};
        return { ...counts, [key]: Math.min((counts[key] ?? 0) + 1, MAX_PER_CHIP) };
      }),
  };
}

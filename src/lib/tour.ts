/**
 * Whether the three coach marks on Today have been seen, kept on the
 * device.
 *
 * Same reasoning as `onboarded.ts`: this is a fact about a phone, not about
 * an account, and unset reads as *not* seen so a corrupt blob shows the
 * tour again rather than swallowing it. The tour also needs `onboarded`
 * before it will run at all — `shouldRun` in
 * `src/features/coach/steps.ts` says why.
 */
import { usePersisted } from './persisted';

const KEY = 'ot.tour';

export function useTour(): { seen: boolean; ready: boolean; markSeen: () => void; reset: () => void } {
  const [value, setValue, ready, clear] = usePersisted<boolean>(KEY, false);
  return {
    seen: value === true,
    ready,
    markSeen: () => setValue(true),
    reset: clear,
  };
}

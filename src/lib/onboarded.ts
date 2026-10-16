/**
 * Whether the welcome has been seen, kept on the device.
 *
 * Its own key rather than a field on the session: the session is what the
 * server will own, and "has this person seen two intro screens" is a fact
 * about this phone, not about the account. Somebody signing in on a second
 * device sees the welcome again, which is the right answer — the questions
 * it asks (how to nudge, which channels) are answered per device anyway,
 * because `prefs` is.
 *
 * Unset reads as *not* seen, so a first run shows it and a corrupt blob
 * shows it again rather than skipping it silently. Showing a welcome twice
 * is a smaller failure than never showing it.
 */
import { usePersisted } from './persisted';

const KEY = 'ot.onboarded';

export function useOnboarded(): { onboarded: boolean; ready: boolean; markOnboarded: () => void; reset: () => void } {
  const [value, setValue, ready, clear] = usePersisted<boolean>(KEY, false);
  return {
    onboarded: value === true,
    ready,
    markOnboarded: () => setValue(true),
    reset: clear,
  };
}

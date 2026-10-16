/**
 * Whether the microphone has been explained on this device.
 *
 * Its own key, like `onboarded.ts` and `tour.ts`, and for the same reason:
 * a permission is granted per device, so the explanation that precedes it
 * belongs to the device too. Somebody signing in on a second phone is asked
 * again by that phone's operating system, and should be told again by the
 * app first.
 *
 * Only agreement is recorded. "Not now" writes nothing, so the notice comes
 * back the next time the mic is tapped — which is right, because nothing
 * was consented to and the microphone was never opened.
 *
 * Why the notice exists at all: `src/features/mic/notice.ts`.
 */
import { usePersisted } from './persisted';

const KEY = 'ot.mic.notice';

export function useMicConsent(): { agreed: boolean; ready: boolean; agree: () => void; reset: () => void } {
  const [value, setValue, ready, clear] = usePersisted<boolean>(KEY, false);
  return {
    agreed: value === true,
    ready,
    agree: () => setValue(true),
    reset: clear,
  };
}

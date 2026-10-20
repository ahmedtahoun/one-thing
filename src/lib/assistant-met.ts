/**
 * Whether somebody has met Sanad yet.
 *
 * One flag on the device, in its own key, like `assistant-habits.ts` and
 * `tour.ts`: meeting somebody is a fact about this phone, not about the
 * account. Until it is set, the Assistant introduces itself and offers things
 * to try instead of reporting on an account that may hold nothing — which is
 * what the old fixed greeting did, claiming a One Thing was set to a person
 * who had not set one. BUILD-REVIEW §2.113.
 */
import { usePersisted } from './persisted';

const KEY = 'ot.assistant.met';

export function useAssistantMet(): { met: boolean; ready: boolean; meet: () => void } {
  const [value, setValue, ready] = usePersisted<boolean>(KEY, false);
  return { met: value === true, ready, meet: () => setValue(true) };
}

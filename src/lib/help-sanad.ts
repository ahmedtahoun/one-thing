/**
 * The one way "Help improve Sanad" is turned on or off.
 *
 * Two screens offer it now — the switch in Settings → Privacy and the card
 * Sanad shows once it has been used a few times — and turning it on means
 * three things, not one: the preference, a consent row carrying the policy
 * version it was agreed under, and, when it goes off, a request to delete
 * what was already sent. Two copies of that would be two chances to forget
 * the third, so there is one. BUILD-REVIEW §2.118.
 */
import { useCallback } from 'react';

import { askToForgetTranscripts } from './analytics/phrasings';
import { POLICY_VERSION, recordConsent } from './consent';
import { usePrefs } from './prefs';

/** Where somebody said yes or no, which is kept on the consent row. */
export type HelpSource = 'settings' | 'assistant';

export function useHelpSanad(): { on: boolean; set: (granted: boolean, from: HelpSource) => void } {
  const { prefs, setPrefs } = usePrefs();
  const set = useCallback(
    (granted: boolean, from: HelpSource) => {
      setPrefs({ helpSanad: granted });
      // Its own row every time it changes, with its own timestamp and the
      // version of the policy it was agreed under — as marketing is, and as
      // ACCEPTANCE § First run asks for.
      recordConsent([{ kind: 'assistant_transcript', granted, version: POLICY_VERSION, at: new Date().toISOString(), source: from }]).catch(() => {});
      // Withdrawing is a request to forget, not only to stop.
      if (!granted) void askToForgetTranscripts();
    },
    [setPrefs]
  );
  return { on: prefs.helpSanad === true, set };
}

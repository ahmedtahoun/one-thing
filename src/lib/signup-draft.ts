/**
 * What the sign-in screen gathered, held until Account setup completes.
 *
 * Sign-in records consent and picks a provider; setup supplies the name. The
 * account is only created once both are in hand, so a user who abandons setup
 * leaves nothing behind. No reactivity is needed — setup reads this once, on
 * submit — so it is a plain module store rather than context.
 */
import type { ConsentRecord } from './consent';
import { consentRecordsAtSignIn } from './consent';

export type SignUpDraft = {
  provider: 'apple' | 'google';
  marketingOptIn: boolean;
  consent: ConsentRecord[];
};

let draft: SignUpDraft | null = null;

export function useSignUpDraft() {
  return {
    /** Called when a sign-in button is tapped with Terms accepted. */
    begin({ provider, marketingOptIn }: { provider: 'apple' | 'google'; marketingOptIn: boolean }) {
      draft = { provider, marketingOptIn, consent: consentRecordsAtSignIn(marketingOptIn) };
    },
    /** The draft, or null if setup was reached without signing in. */
    read(): SignUpDraft | null {
      return draft;
    },
    clear() {
      draft = null;
    },
  };
}

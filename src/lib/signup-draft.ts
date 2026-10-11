/**
 * What the sign-in screen gathered, held until Account setup completes.
 *
 * Sign-in records consent and picks a provider; setup supplies the name. The
 * account is only created once both are in hand, so a user who abandons setup
 * leaves nothing behind. No reactivity is needed — setup reads this once, on
 * submit — so it is a plain module store rather than context.
 */
import type { ProviderProfile } from './auth';
import type { ConsentRecord } from './consent';
import { consentRecordsAtSignIn } from './consent';

export type SignUpDraft = {
  provider: 'apple' | 'google';
  marketingOptIn: boolean;
  consent: ConsentRecord[];
  /**
   * What the provider told us about them. Apple gives the name and the real
   * email on the *first* authorisation and never again, so whatever arrives
   * has to be carried through to setup rather than asked for twice.
   */
  profile?: ProviderProfile;
};

let draft: SignUpDraft | null = null;

export function useSignUpDraft() {
  return {
    /** Called once a provider has signed the user in, or the stub stood in. */
    begin({
      provider,
      marketingOptIn,
      profile,
    }: {
      provider: 'apple' | 'google';
      marketingOptIn: boolean;
      profile?: ProviderProfile;
    }) {
      draft = { provider, marketingOptIn, profile, consent: consentRecordsAtSignIn(marketingOptIn) };
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

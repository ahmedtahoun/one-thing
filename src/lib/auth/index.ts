/**
 * Signing in with Apple and with Google, and exchanging what they return for
 * a Supabase session.
 *
 * The whole sync layer (src/lib/sync/) waits on `db.auth.getSession()`, so
 * this is the keystone: until a provider token becomes a Supabase session,
 * nothing syncs and the app is a local notebook.
 *
 * Both flows end the same way — `signInWithIdToken`, which verifies the
 * provider's token server-side and creates or finds the user. The app never
 * sees a password and holds no provider secret: Apple's Services ID and key,
 * and Google's web client secret, live in the Supabase dashboard
 * (RELEASE.md § 2 and § 3).
 *
 * What cannot be verified here: neither flow has ever run. Both need a real
 * build on a real device, the client IDs, and the providers configured in
 * Supabase. `availability()` is what keeps that honest — anything short of
 * `ready` and the screen falls back to the local session it has always used,
 * rather than failing in front of the user.
 */
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';

import { isBackendConfigured, supabase } from '../supabase';
import { availability, type Availability, type AuthEnvironment, type Provider } from './availability';

export type { Provider } from './availability';
export { availability, anyProviderReady } from './availability';

/**
 * Names and emails Apple hands over on the *first* authorisation only, and
 * never again. Account setup prefills from them so a returning user who
 * reinstalls is not asked twice — Apple will not say it twice.
 */
export type ProviderProfile = {
  email?: string;
  fullName?: string;
};

export type AuthOutcome =
  | { kind: 'signed-in'; profile: ProviderProfile }
  /** The user backed out of the provider's own sheet. Not an error. */
  | { kind: 'cancelled' }
  | { kind: 'unavailable'; why: Exclude<Availability, 'ready'> }
  | { kind: 'failed'; message: string };

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** This device, as `availability` wants to hear about it. */
export function authEnvironment(): AuthEnvironment {
  return {
    backend: isBackendConfigured,
    platform: Platform.OS as AuthEnvironment['platform'],
    googleWebClientId: GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: GOOGLE_IOS_CLIENT_ID,
  };
}

/** Apple gives the name in parts; the app wants one line, as typed. */
function appleFullName(name: AppleAuthentication.AppleAuthenticationFullName | null): string | undefined {
  const parts = [name?.givenName, name?.familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

async function withApple(): Promise<AuthOutcome> {
  // The capability can be missing even on iOS — an old version, or a build
  // without the entitlement — and this is the only way to know.
  if (!(await AppleAuthentication.isAvailableAsync())) return { kind: 'unavailable', why: 'wrong-platform' };

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    // Apple reports a dismissed sheet as an error with this code.
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return { kind: 'cancelled' };
    return { kind: 'failed', message: String((error as Error).message ?? error) };
  }

  if (!credential.identityToken) return { kind: 'failed', message: 'Apple returned no identity token' };

  const db = supabase();
  if (!db) return { kind: 'unavailable', why: 'no-backend' };
  const { error } = await db.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
  if (error) return { kind: 'failed', message: error.message };

  return {
    kind: 'signed-in',
    profile: { email: credential.email ?? undefined, fullName: appleFullName(credential.fullName) },
  };
}

async function withGoogle(): Promise<AuthOutcome> {
  // `webClientId` is the one the ID token is issued for and the one Supabase
  // verifies against; `iosClientId` is what the iOS app identifies itself as.
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });

  let response: Awaited<ReturnType<typeof GoogleSignin.signIn>>;
  try {
    await GoogleSignin.hasPlayServices();
    response = await GoogleSignin.signIn();
  } catch (error) {
    if ((error as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED) return { kind: 'cancelled' };
    return { kind: 'failed', message: String((error as Error).message ?? error) };
  }

  // v16 returns a discriminated response rather than throwing on cancel.
  if (!isSuccessResponse(response)) return { kind: 'cancelled' };
  const idToken = response.data.idToken;
  if (!idToken) return { kind: 'failed', message: 'Google returned no ID token' };

  const db = supabase();
  if (!db) return { kind: 'unavailable', why: 'no-backend' };
  const { error } = await db.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) return { kind: 'failed', message: error.message };

  return {
    kind: 'signed-in',
    profile: { email: response.data.user.email ?? undefined, fullName: response.data.user.name ?? undefined },
  };
}

/**
 * Runs the provider's own sheet and turns the result into a Supabase session.
 * Never throws: every path the user can take comes back as an outcome, so the
 * sign-in screen has one thing to switch on.
 */
export async function signInWith(provider: Provider): Promise<AuthOutcome> {
  const why = availability(provider, authEnvironment());
  if (why !== 'ready') return { kind: 'unavailable', why };
  return provider === 'apple' ? withApple() : withGoogle();
}

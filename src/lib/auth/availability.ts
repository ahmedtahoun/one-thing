/**
 * Whether a provider's sign-in can actually run here — decided before any
 * native module is touched, so the answer is the same in a test as on a
 * phone.
 *
 * There are four reasons it cannot, and the sign-in screen behaves
 * differently for each:
 *
 *   no-backend       no Supabase project configured, so a provider token has
 *                    nowhere to be exchanged. Every build until §1.3 of
 *                    RELEASE.md is decided.
 *   not-configured   a backend, but no Google client IDs in the environment.
 *   wrong-platform   Sign in with Apple is iOS only; Google's native module
 *                    needs a real build, so neither runs on web, where the
 *                    verification harness renders.
 *   ready            go.
 *
 * Anything but `ready` falls back to the local session the app has always
 * used, so the build keeps working and the harness stays green.
 */
export type Provider = 'apple' | 'google';

export type Availability = 'ready' | 'no-backend' | 'not-configured' | 'wrong-platform';

export type AuthEnvironment = {
  /** `isBackendConfigured` from src/lib/supabase.ts. */
  backend: boolean;
  /** `Platform.OS`. */
  platform: 'ios' | 'android' | 'web' | 'windows' | 'macos';
  /** The Web OAuth client ID — the one Supabase holds, needed on both phones. */
  googleWebClientId?: string;
  /** The iOS OAuth client ID, which only iOS needs. */
  googleIosClientId?: string;
};

export function availability(provider: Provider, env: AuthEnvironment): Availability {
  if (!env.backend) return 'no-backend';

  if (provider === 'apple') {
    // Apple needs no client ID on the device: the entitlement and the bundle
    // ID are the configuration, and `isAvailableAsync` is the final word at
    // the call site. Android and web can offer Google only.
    return env.platform === 'ios' ? 'ready' : 'wrong-platform';
  }

  if (env.platform !== 'ios' && env.platform !== 'android') return 'wrong-platform';
  // Google's native module verifies the ID token against the *web* client, so
  // that ID is required on both platforms; iOS additionally needs its own.
  if (!env.googleWebClientId) return 'not-configured';
  if (env.platform === 'ios' && !env.googleIosClientId) return 'not-configured';
  return 'ready';
}

/** True when at least one provider can really sign someone in. */
export function anyProviderReady(env: AuthEnvironment): boolean {
  return availability('apple', env) === 'ready' || availability('google', env) === 'ready';
}

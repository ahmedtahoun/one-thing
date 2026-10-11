/**
 * Everything in app.json, plus the two things sign-in needs that cannot be
 * written down as literals.
 *
 * `app.json` stays the readable base — Expo passes it in as `config`. This
 * file only adds what depends on the environment:
 *
 *   - Sign in with Apple's entitlement and config plugin. No identifier is
 *     needed on the device: the entitlement plus the bundle ID is the whole
 *     configuration (RELEASE.md § 2).
 *   - Google's native module, whose iOS side needs a URL scheme built from
 *     the reversed iOS client ID. There is no sensible placeholder for it, so
 *     the plugin is added only once EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set.
 *     A made-up scheme would build and then fail on a device, which is worse
 *     than not being configured — and src/lib/auth/availability.ts already
 *     reports "not-configured" for exactly this state.
 */
'use strict';

/** "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc". */
function reversedClientId(clientId) {
  const id = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
  return `com.googleusercontent.apps.${id}`;
}

module.exports = ({ config }) => {
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  const plugins = [...(config.plugins ?? []), 'expo-apple-authentication'];
  if (googleIosClientId) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: reversedClientId(googleIosClientId) }]);
  }

  return {
    ...config,
    ios: { ...config.ios, usesAppleSignIn: true },
    plugins,
  };
};

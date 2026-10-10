import { Redirect } from 'expo-router';

import { useSession } from '@/lib/session';

/** Sends a returning user straight to Today, and everyone else to Sign in. */
export default function Index() {
  const { session, ready } = useSession();

  // Nothing is rendered until the stored session has been read, so the app
  // never flashes the sign-in screen at someone who is already signed in.
  if (!ready) return null;
  return <Redirect href={session ? '/today' : '/sign-in'} />;
}

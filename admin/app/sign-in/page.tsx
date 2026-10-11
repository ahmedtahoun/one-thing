import { redirect } from 'next/navigation';

import { currentAdmin } from '@/auth/session';
import { mode } from '@/config';
import { SignIn } from './SignIn';

export default async function SignInPage() {
  if (await currentAdmin()) redirect('/overview');
  // The prototype opens with Khalid's address filled in; only the demo does.
  return <SignIn initialEmail={mode() === 'demo' ? 'khalid@onlyonething.app' : ''} />;
}

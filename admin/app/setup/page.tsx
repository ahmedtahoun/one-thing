import { notFound } from 'next/navigation';

import { setupOpen } from '@/auth/setup';
import { Setup } from './Setup';

export const dynamic = 'force-dynamic';

/** The one-time first-Owner page (src/auth/setup.ts). Closed, it does not exist. */
export default async function SetupPage() {
  if (!(await setupOpen())) notFound();
  return <Setup />;
}

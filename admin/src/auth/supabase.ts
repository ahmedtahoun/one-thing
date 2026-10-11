/**
 * Supabase Auth for the team: email and password, then the TOTP factor
 * (Supabase's own MFA). Only the session lives here — admin data is read
 * over the server's own database connection (`data/db.ts`), never with this
 * client.
 */
import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function authClient() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // Called from a server component, which cannot set cookies; the
          // proxy refreshes the session on the next request instead.
        }
      },
    },
  });
}

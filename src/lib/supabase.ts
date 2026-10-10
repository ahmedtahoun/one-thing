/**
 * Supabase client.
 *
 * Configuration comes from EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_ANON_KEY (see .env.example). Both are publishable
 * values; the anon key is safe on device because every table is behind
 * row-level security (supabase/migrations/0001_init.sql).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when the app has a backend to talk to. */
export const isBackendConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * The shared client, or null when no backend is configured yet. Callers must
 * handle null rather than assume a client — the app is expected to run against
 * local state during development, before the project exists.
 */
export function supabase(): SupabaseClient | null {
  if (!isBackendConfigured) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // The app has no URL-based auth callback; sessions come from the
        // native Apple / Google flows.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

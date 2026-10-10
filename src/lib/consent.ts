/**
 * Consent records.
 *
 * Terms acceptance and marketing opt-in are stored separately, each with its
 * own timestamp and policy version — required by SCREENS.md § 01 and checked
 * by ACCEPTANCE § First run ("Marketing checkbox unticked by default, stored
 * separately with timestamp").
 */
import { supabase } from './supabase';

/**
 * Bump this whenever the Terms or Privacy text changes, so a consent row
 * records which version the user actually agreed to. Matches the "Last updated"
 * line on the Legal screen.
 */
export const POLICY_VERSION = '2026-10-09';

export type ConsentKind = 'terms_privacy' | 'marketing';

export type ConsentRecord = {
  kind: ConsentKind;
  granted: boolean;
  version: string;
  at: string;
  source: 'signin' | 'settings';
};

/** Builds the two rows the sign-in screen produces. */
export function consentRecordsAtSignIn(marketingOptIn: boolean): ConsentRecord[] {
  const at = new Date().toISOString();
  return [
    { kind: 'terms_privacy', granted: true, version: POLICY_VERSION, at, source: 'signin' },
    { kind: 'marketing', granted: marketingOptIn, version: POLICY_VERSION, at, source: 'signin' },
  ];
}

/**
 * Writes consent rows. Returns the records so a caller can queue them when
 * there is no backend yet; consent must never be silently dropped.
 */
export async function recordConsent(userId: string, records: ConsentRecord[]): Promise<ConsentRecord[]> {
  const db = supabase();
  if (!db) return records;

  const { error } = await db.from('consent').insert(
    records.map((r) => ({
      user_id: userId,
      kind: r.kind,
      granted: r.granted,
      version: r.version,
      granted_at: r.at,
      source: r.source,
    }))
  );
  if (error) throw error;
  return records;
}

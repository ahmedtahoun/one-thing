/**
 * Consent records.
 *
 * Terms acceptance and marketing opt-in are stored separately, each with its
 * own timestamp and policy version — required by SCREENS.md § 01 and checked
 * by ACCEPTANCE § First run ("Marketing checkbox unticked by default, stored
 * separately with timestamp").
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bump this whenever the Terms or Privacy text changes, so a consent row
 * records which version the user actually agreed to. Matches the "Last updated"
 * line on the Legal screen.
 */
export const POLICY_VERSION = '2026-10-21';

/**
 * `assistant_transcript` is what somebody agrees to when they turn on "Help
 * improve Sanad": the words they type, kept as they typed them, instead of
 * only the markered-up shape every account sends (src/lib/parse/redact.ts).
 * Off until granted, revocable, and revoking it deletes what was collected.
 * BUILD-REVIEW §2.115.
 */
export type ConsentKind = 'terms_privacy' | 'marketing' | 'assistant_transcript';

export type ConsentRecord = {
  kind: ConsentKind;
  granted: boolean;
  version: string;
  at: string;
  /**
   * Where they agreed. 'assistant' is Sanad asking for itself, once, rather
   * than somebody finding the switch in Settings — §2.118, and the matching
   * enum value is 0017. 'welcome' is the third step of the welcome, which
   * asks before the first conversation — §2.119, enum value 0018.
   */
  source: 'signin' | 'settings' | 'assistant' | 'welcome';
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
 * Consent waits on the device until the sync engine has written it
 * (src/lib/sync/). Writing straight to the server would lose it whenever
 * there is no connection — or no account on the server yet, as at sign-up —
 * and consent must never be silently dropped. The queue is only ever
 * appended to here and trimmed from the front by the sync, so a record made
 * while a sync is running waits for the next one.
 */
const QUEUE_KEY = 'ot.consentQueue';

let listener: (() => void) | null = null;

/** The sync engine registers here to hear that there is consent to send. */
export function onConsentQueued(fn: (() => void) | null) {
  listener = fn;
}

export async function readConsentQueue(): Promise<ConsentRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord[]) : [];
  } catch {
    return [];
  }
}

/** Drops the first `count` records, once the server has them. */
export async function dropSentConsent(count: number): Promise<void> {
  if (count === 0) return;
  const rest = (await readConsentQueue()).slice(count);
  if (rest.length > 0) await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(rest));
  else await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Forgets consent not yet sent — Delete account only. It belongs to the
 * account being deleted, and must not be sent as the next account's.
 */
export async function clearConsentQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/** Records consent: kept on the device now, on the server at the next sync. */
export async function recordConsent(records: ConsentRecord[]): Promise<void> {
  const queue = await readConsentQueue();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, ...records]));
  listener?.();
}

/**
 * The Free plan's 10 assistant requests a day, kept on the device.
 *
 * The server will enforce the same limit when the Assistant goes through the
 * backend (src/lib/parse/index.ts); this copy is what lets the Assistant send
 * someone to the paywall at the eleventh request without a round trip, and
 * it is what the paywall's "Free plan: 10 requests a day." refers to. Whether
 * a request is allowed is decided in src/policy/entitlements.ts, not here.
 */
import { useCallback } from 'react';

import { assistantRequestsLeft, canUseAssistant } from '@/policy/entitlements';
import { dateKey } from './model-types';
import { usePersisted } from './persisted';
import { useSession } from './session';

const STORAGE_KEY = 'ot.assistantUsage';

export type AssistantUsage = { date: string; used: number };

/** Requests spent today. Yesterday's count does not carry over. */
export function usedOn(usage: AssistantUsage | null, day: string): number {
  return usage && usage.date === day ? usage.used : 0;
}

/** The count after one more request today. */
export function spendOne(usage: AssistantUsage | null, day: string): AssistantUsage {
  return { date: day, used: usedOn(usage, day) + 1 };
}

export function useAssistantMeter() {
  const { session } = useSession();
  const plan = session?.plan ?? 'free';
  const [usage, setUsage, ready] = usePersisted<AssistantUsage | null>(STORAGE_KEY, null);
  const used = usedOn(usage, dateKey());

  const spend = useCallback(() => setUsage((current) => spendOne(current, dateKey())), [setUsage]);

  return {
    ready,
    used,
    left: assistantRequestsLeft(plan, used),
    /** Whether one more request may go out now. */
    canAsk: canUseAssistant(plan, used),
    spend,
  };
}

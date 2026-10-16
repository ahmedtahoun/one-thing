/**
 * The device-side daily meters: the assistant's requests, and brain dumps.
 *
 * The server will enforce the same limit when the Assistant goes through the
 * backend (src/lib/parse/index.ts); this copy is what lets the Assistant send
 * someone to the paywall at the eleventh request without a round trip, and
 * it is what the paywall's "Free plan: 10 requests a day." refers to. Whether
 * a request is allowed is decided in src/policy/entitlements.ts, not here.
 */
import { useCallback } from 'react';

import { assistantRequestsLeft, brainDumpsLeft, canBrainDump, canUseAssistant } from '@/policy/entitlements';
import { dateKey } from './model-types';
import { usePersisted } from './persisted';
import { useSession } from './session';

const STORAGE_KEY = 'ot.assistantUsage';
const DUMP_KEY = 'ot.dumpUsage';

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

/**
 * Brain dumps spent today. Sorting is the expensive step and the one the
 * card sells, so that is what counts — typing into the box, changing your
 * mind and sorting again would otherwise cost two.
 *
 * Same shape as the assistant's meter on purpose: run out, and the screen
 * sends you to the paywall rather than refusing quietly.
 */
export function useBrainDumpMeter() {
  const { session } = useSession();
  const plan = session?.plan ?? 'free';
  const [usage, setUsage, ready] = usePersisted<AssistantUsage | null>(DUMP_KEY, null);
  const used = usedOn(usage, dateKey());

  const spend = useCallback(() => setUsage((current) => spendOne(current, dateKey())), [setUsage]);

  return {
    ready,
    used,
    left: brainDumpsLeft(plan, used),
    /** Whether one more sort may run now. */
    canDump: canBrainDump(plan, used),
    spend,
  };
}

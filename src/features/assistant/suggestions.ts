/**
 * The chips above the Assistant's message bar: what is worth suggesting to
 * *this* person, right now, in the order they are likely to want it.
 *
 * What was there before was the handoff's three example sentences plus two
 * more — "Remind me tomorrow at 10 to send Mohammed the price quote",
 * "Waiting for Omar to reply about the contract" — and on a phone the row
 * ran off both edges with one and a half of them legible. Worse, they were
 * the same five whether somebody had nothing in the app or ninety people
 * in it, so the one thing the row could have said — *here is what you can
 * do with what you already have* — it never said.
 *
 * Two rules decide the order:
 *
 *   1. **What their data says.** A late task puts "What's late?" first.
 *      Nobody waiting on a reply takes "Who's waiting?" out altogether,
 *      because a chip that answers "nobody" is a chip that wasted a tap.
 *   2. **What they keep tapping.** Every tap is counted on the device
 *      (`src/lib/assistant-habits.ts`), and a chip tapped often floats up.
 *      That is the whole of the learning: no profile, no server, no
 *      guessing at intent — the thing somebody reaches for most ends up
 *      nearest their thumb.
 *
 * Each chip carries a short label *and* the sentence it sends, which is not
 * the same string. The sentence goes into the chat as the person's own
 * words, so a tap also teaches what can be typed — the row doubles as the
 * phrasebook the Assistant never had.
 *
 * Pure, so both rules are tested in Node without a screen.
 */
import type { Added } from '@/content/additions';

export type Chip = { key: string; label: string; say: string };

/** What the app knows about this person right now, as counts. */
export type ChipWorld = {
  late: number;
  waiting: number;
  openTasks: number;
  hasOneThing: boolean;
  people: number;
};

/** Most chips a row can hold before it is a scroll nobody finishes. */
export const MAX_CHIPS = 6;

/**
 * The chips worth showing, in data order — before habits are applied.
 *
 * Order within this list is the editorial judgement: what is late is more
 * urgent than what is next, and both beat housekeeping like saving a
 * contact. An empty app gets the two that still work on an empty app.
 */
export function chipsFor(copy: Added['chips'], world: ChipWorld): Chip[] {
  const chip = (key: keyof Added['chips']): Chip => ({ key, label: copy[key].label, say: copy[key].say });
  const out: Chip[] = [];
  if (world.late > 0) out.push(chip('late'));
  if (world.waiting > 0) out.push(chip('waiting'));
  if (world.hasOneThing) out.push(chip('oneThing'));
  if (world.openTasks > 0) out.push(chip('next'));
  if (world.openTasks > 0) out.push(chip('day'));
  // The two that need nothing in the app, and are how things get into it.
  out.push(chip('scan'));
  out.push(chip('contact'));
  return out;
}

/**
 * The same chips, with the ones this person taps most brought forward.
 *
 * A stable sort on the count alone: a chip nobody has tapped keeps its
 * place in the data order, and one tapped twice passes one tapped once
 * without reshuffling everything around them.
 */
export function rankChips(chips: readonly Chip[], tapped: Readonly<Record<string, number>>, limit = MAX_CHIPS): Chip[] {
  return chips
    .map((chip, at) => ({ chip, at, count: tapped[chip.key] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.at - b.at)
    .slice(0, limit)
    .map((row) => row.chip);
}

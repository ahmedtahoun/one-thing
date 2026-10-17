/**
 * The words and the choices for a question from `clarify` — shared by the
 * Assistant chat and Quick capture, so both ask the same thing the same way.
 *
 * Pure: the screen passes in its copy and the quick times, and gets back a
 * question and the options to show under it. What happens on a tap is the
 * screen's: an option carries an `action`, and `withWho` / `withWhen` in
 * ../../lib/parse/clarify turn it into the next proposal.
 */
import { clockOf } from '@/lib/clock-format';
import type { Added } from '@/content/additions';
import { type Contact } from '@/lib/model-types';
import { whenOptions, type Gap, type QuickWhen } from '@/lib/parse/clarify';
import type { ParsedTask } from '@/lib/parse/types';

/** How many people are shown as chips; the rest are reached by typing. */
export const MAX_PEOPLE = 5;

export type AskAction =
  | { kind: 'who'; contact: Contact | null }
  | { kind: 'add'; name: string }
  | { kind: 'elsewhere' }
  | { kind: 'search' }
  | { kind: 'when'; iso: string };

export type AskOption = { key: string; label: string; action: AskAction };

export function questionFor(gap: Gap, draft: ParsedTask, copy: Added): string {
  switch (gap.kind) {
    case 'who-ambiguous': {
      const only = gap.options[0];
      if (gap.fuzzy && gap.options.length === 1 && only) return copy.ask.confirm.replace('{n}', only.name);
      const base = copy.ask.ambiguous.replace('{n}', gap.name);
      return gap.options.length > MAX_PEOPLE
        ? `${base}\n${copy.ask.narrow.replace('{a}', String(MAX_PEOPLE)).replace('{b}', String(gap.options.length))}`
        : base;
    }
    case 'who-unknown':
      return copy.ask.unknown.replace('{n}', gap.name);
    case 'who-missing':
      return copy.pickWho[draft.type === 'reminder' ? 'call' : draft.type];
    case 'when':
      return gap.why === 'past' ? copy.ask.whenPast.replace('{t}', clockOf(draft.when)) : copy.ask.whenMissing;
  }
}

export function optionsFor(
  gap: Gap,
  draft: ParsedTask,
  copy: Added,
  quick: readonly QuickWhen[],
  now: Date
): AskOption[] {
  const search: AskOption = { key: 'search', label: copy.ask.search, action: { kind: 'search' } };
  const noOne: AskOption = { key: 'no-one', label: copy.ask.noOne, action: { kind: 'who', contact: null } };
  const person = (c: Contact, withRole: boolean): AskOption => ({
    key: `who-${c.id}`,
    label: withRole && c.role ? `${c.name} · ${c.role}` : c.name,
    action: { kind: 'who', contact: c },
  });

  switch (gap.kind) {
    case 'who-ambiguous': {
      const shown = gap.options.slice(0, MAX_PEOPLE).map((c) => person(c, true));
      // One loose match is "did you mean?": the person, a way out to someone else, or nobody.
      if (gap.fuzzy && gap.options.length === 1) {
        return [...shown, { key: 'elsewhere', label: copy.ask.someoneElse, action: { kind: 'elsewhere' } }, noOne];
      }
      return [...shown, search, noOne];
    }
    case 'who-unknown':
      return [
        { key: 'add', label: copy.ask.addPerson.replace('{n}', gap.name), action: { kind: 'add', name: gap.name } },
        { key: 'elsewhere', label: copy.ask.someoneElse, action: { kind: 'elsewhere' } },
        noOne,
      ];
    case 'who-missing':
      return [...gap.suggestions.slice(0, MAX_PEOPLE).map((c) => person(c, false)), search, noOne];
    case 'when': {
      const options: AskOption[] = [];
      const at = new Date(draft.when);
      if (gap.why === 'past') {
        // The same time tomorrow is the likeliest thing meant.
        const next = new Date(at);
        next.setDate(next.getDate() + 1);
        options.push({
          key: 'tomorrow-same',
          label: copy.ask.tomorrowAt.replace('{t}', clockOf(draft.when)),
          action: { kind: 'when', iso: next.toISOString() },
        });
      }
      // "Now" before the half-hour chips, because it is the answer somebody
      // gives when they did not want a time at all: a phone showed "No I
      // want it here" answered with "I couldn't read that", and the way out
      // has to be on the screen rather than guessable. After
      // "tomorrow at the same time" though, which is the likelier thing
      // meant when a time has simply gone past.
      options.push({ key: 'now', label: copy.ask.now, action: { kind: 'when', iso: new Date(now.getTime() + 60_000).toISOString() } });
      for (const option of whenOptions(quick, now)) {
        options.push({ key: `when-${option.iso}`, label: option.label, action: { kind: 'when', iso: option.iso } });
      }
      // Never a dead end: the parser's own time, while it is still ahead.
      if (gap.why === 'missing' && at.getTime() > now.getTime()) {
        options.push({
          key: 'keep',
          label: copy.ask.keepTime.replace('{t}', clockOf(draft.when)),
          action: { kind: 'when', iso: draft.when },
        });
      }
      return options;
    }
  }
}

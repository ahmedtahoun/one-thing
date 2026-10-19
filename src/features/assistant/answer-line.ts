/**
 * The sentence the Assistant says over an answer it found in the app's data.
 *
 * Separate from the card that draws it (./DataCard.tsx) so it can be tested:
 * it is only copy composition, and the thing worth checking is that all twelve
 * shapes read as sentences in both languages with no placeholder left in
 * them, which needs no renderer and must not need React Native.
 */
import type { Added } from '@/content/additions';
import type { Candidate } from '@/features/people-import/columns';
import { ltr } from '@/lib/bidi';
import { displayName } from '@/lib/model-types';
import { waitingByPerson, type DataAnswer } from '@/lib/parse/ask-data';

/** At most this many rows under one answer; the rest are a "+{n} more" line. */
export const MAX_ROWS = 5;

const n = (count: number) => String(count);

/**
 * The sentence over the answer. An empty result gets its own line rather than
 * a count of nought, because "0 today" reads like a bug and "Nothing due
 * today" reads like an answer.
 */
export function answerLine(answer: DataAnswer, copy: Added['qa']): string {
  switch (answer.kind) {
    case 'person': {
      const c = answer.contact;
      const first = displayName(c.name);
      // The number is kept in its own left-to-right run: in an Arabic line
      // "+971 50 331 2045" otherwise comes out with its groups reordered,
      // and a phone number read in the wrong order is worse than an ugly
      // one. Same isolate People and Import use (src/lib/bidi.ts).
      if (answer.want === 'phone') return c.phone ? `${c.name}: ${ltr(`${c.dial ?? ''} ${c.phone}`.trim())}` : copy.noPhone.replace('{n}', first);
      if (answer.want === 'email') return c.email ? `${c.name}: ${c.email}` : copy.noEmail.replace('{n}', first);
      if (answer.want === 'work') return c.role ? copy.works.replace('{n}', c.name).replace('{w}', c.role) : copy.noWork.replace('{n}', first);
      return c.role ? copy.works.replace('{n}', c.name).replace('{w}', c.role) : c.name;
    }
    case 'who':
      return copy.which.replace('{n}', answer.name);
    case 'nobody':
      return copy.nobody;
    case 'history':
      return answer.entries.length === 0
        ? copy.noHistory.replace('{n}', displayName(answer.contact.name))
        : copy.lastWith.replace('{n}', displayName(answer.contact.name));
    case 'tasks': {
      const count = answer.tasks.length;
      if (answer.span === 'late') return count === 0 ? copy.noneLate : copy.lateN.replace('{n}', n(count));
      if (answer.span === 'tomorrow') return count === 0 ? copy.noneTomorrow : copy.tomorrowN.replace('{n}', n(count));
      if (answer.span === 'week') return count === 0 ? copy.noneWeek : copy.weekN.replace('{n}', n(count));
      return count === 0 ? copy.noneToday : copy.todayN.replace('{n}', n(count));
    }
    case 'waiting': {
      const people = waitingByPerson(answer.items).length;
      return people === 0 ? copy.noneWaiting : copy.waitingN.replace('{n}', n(people));
    }
    case 'quiet':
      return answer.items.length === 0 ? copy.noneQuiet : copy.quietN.replace('{n}', n(answer.items.length));
    case 'people': {
      const count = answer.contacts.length;
      if (count === 0) return copy.nonePeople;
      if (answer.of === 'favorites') return copy.favN.replace('{n}', n(count));
      if (answer.of === 'label') return copy.labelN.replace('{n}', n(count)).replace('{w}', answer.label ?? '');
      return copy.allN.replace('{n}', n(count));
    }
    case 'oneThing': {
      const one = answer.oneThing;
      if (!one) return copy.noOneThing;
      return `${one.done ? copy.oneThingDone : copy.oneThingIs}: ${one.title}`;
    }
    case 'next':
      return answer.task ? (answer.late ? copy.nextLate : copy.nextIs) : copy.noNext;
    case 'log': {
      const count = answer.entries.length;
      const empty = { today: copy.noLogToday, yesterday: copy.noLogYesterday, week: copy.noLogWeek };
      const some = { today: copy.logToday, yesterday: copy.logYesterday, week: copy.logWeek };
      return count === 0 ? empty[answer.span] : some[answer.span].replace('{n}', n(count));
    }
    case 'unknown':
      return copy.outOfScope;
  }
}

/**
 * What a file turned out to hold: "Found 45 people in 2 sheets · 3 already
 * saved · 2 skipped".
 *
 * Only the parts that happened are said. A one-sheet file does not mention
 * sheets, nothing already saved is not counted, and a file with nobody in it
 * says so instead of reporting nought found — the Import screen's own counts
 * read the same way.
 */
export function fileLine(file: { candidates: readonly Candidate[]; skipped: number }, copy: Added['clip']): string {
  const total = file.candidates.length;
  if (total === 0) return copy.nothing;
  const sheets = new Set(file.candidates.map((c) => c.sheet).filter(Boolean)).size;
  const already = file.candidates.filter((c) => c.duplicateIn === 'people').length;
  const head =
    sheets > 1
      ? copy.foundSheets.replace('{n}', String(total)).replace('{s}', String(sheets))
      : copy.found.replace('{n}', String(total));
  return [head, already > 0 ? copy.already.replace('{n}', String(already)) : null, file.skipped > 0 ? copy.skipped.replace('{n}', String(file.skipped)) : null]
    .filter(Boolean)
    .join(' · ');
}

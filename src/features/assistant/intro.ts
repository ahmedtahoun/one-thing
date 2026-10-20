/**
 * What Sanad says when the screen opens, and what it offers a newcomer.
 *
 * The opening line used to be one fixed sentence from the design handoff —
 * "Morning Khalid. Your One Thing is set. Anything rattling around your head?"
 * — with the demo name swapped for the real one. Everything after the name
 * was a claim about the account, and on a new account every word of it was
 * false: nothing was set, and the screen said it was. BUILD-REVIEW §2.113.
 *
 * So the line is assembled from things that are true, and a first-time reader
 * gets an introduction instead of a status report on an account they have not
 * filled yet. The examples offered are the ones that will work on the account
 * as it stands: there is no sense inviting somebody with an empty address book
 * to ask who has not replied.
 */

/** What Sanad knows about somebody the moment the screen opens. */
export type Opening = {
  /** Empty when there is no name to greet by. */
  firstName: string;
  /** The hour on the clock, 0–23. From six it is evening, as Today has it. */
  hour: number;
  hasOneThing: boolean;
  /** Still open on today's list. */
  openToday: number;
  /** Past due, whenever they were due. */
  late: number;
  /** People owed a reply, or being waited on. */
  waiting: number;
  people: number;
  /** False only the very first time somebody opens the Assistant. */
  met: boolean;
};

export type OpeningCopy = {
  /** "Morning {name}." — the name is dropped when there is none. */
  morning: string;
  evening: string;
  /** "I'm Sanad." */
  hi: string;
  /** What Sanad is for, said once. */
  what: string;
  /** "Your One Thing is set." */
  oneThing: string;
  /** "{n} still on today." */
  onToday: string;
  /** "{n} late." */
  late: string;
  /** Nothing to report: the invitation on its own. */
  nothingYet: string;
  /** "Anything on your mind? Say it and I'll sort it." */
  invite: string;
};

const fill = (line: string, n: number) => line.replace('{n}', String(n));

/**
 * The greeting, as sentences that are each true of this account.
 *
 * A first meeting introduces Sanad and says what it is for; every later one
 * is a greeting, what is waiting, and the invitation. Nothing waiting is said
 * as nothing waiting, not as a cheerful claim about work that does not exist.
 */
export function openingLine(world: Opening, copy: OpeningCopy): string {
  const hello = (world.hour >= 18 ? copy.evening : copy.morning).replace('{name}', world.firstName).replace(/\s+([.،,!?؟])/g, '$1').trim();
  if (!world.met) return [hello, copy.hi, copy.what].join(' ');

  // The one thing worth leading with, not all of them: a greeting that lists
  // four counts is a report, and nobody opens a chat to read a report.
  const news = world.late > 0 ? fill(copy.late, world.late) : world.hasOneThing ? copy.oneThing : world.openToday > 0 ? fill(copy.onToday, world.openToday) : '';
  return [hello, news || copy.nothingYet, copy.invite].filter(Boolean).join(' ');
}

/** One of the things a newcomer is invited to try. */
export type IntroStep = { key: string; label: string; say: string };

export type IntroCopy = Record<'remind' | 'dump' | 'ask' | 'card', { label: string; say: string }>;

/**
 * What to put in front of somebody on their first visit: four things to try,
 * narrowed to the ones that will actually do something on this account.
 *
 * "What's next?" on an empty account answers "nothing", which teaches that
 * Sanad has nothing to offer — the opposite of the point. It is offered once
 * there is something for it to find.
 */
export function introSteps(world: Opening, copy: IntroCopy): IntroStep[] {
  const step = (key: keyof IntroCopy): IntroStep => ({ key, label: copy[key].label, say: copy[key].say });
  const out: IntroStep[] = [step('remind'), step('dump')];
  if (world.openToday + world.late > 0) out.push(step('ask'));
  out.push(step('card'));
  return out;
}

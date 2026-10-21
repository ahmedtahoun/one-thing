/**
 * What the evening band says about the day it is closing.
 *
 * The card it replaces asked the same question — "Ready to close your day?" —
 * whether you had finished everything or nothing, and printed the count twice
 * over in two stacked lines, one of which was blank whenever there was no One
 * Thing set. On the owner's own screen that came out as a quarter of the
 * display saying "3 to do · 0 done" under a question that did not follow from
 * it. BUILD-REVIEW §2.112.
 *
 * The band has room for one line of words and one of numbers, so the words
 * have to earn their place: they change with the day rather than greeting it
 * the same way every night.
 */

/** How the day went, in the only two numbers the band has room for. */
export type DayCount = {
  /** Still open on today's list. */
  open: number;
  /** Finished today. */
  done: number;
};

/** The lines the band can draw on, in the reader's own language. */
export type EveningCopy = {
  /** "Ready to close your day?" — the ordinary evening. */
  ready: string;
  /** "All done. Close up?" — nothing left on the list. */
  allDone: string;
  /** "{a} to do · {b} done" — the ordinary evening. */
  sum: string;
  /** "{a} of {b} done today" — when there is no "to do" left to print. */
  sumAll: string;
};

/** What the band says tonight. */
export function eveningWords(count: DayCount, copy: EveningCopy): { title: string; meta: string } {
  // Nothing left and something finished is the one night worth marking. Not
  // an empty day: "all done" over 0 of 0 would be congratulating nobody.
  const swept = count.open === 0 && count.done > 0;
  // "0 to do" is not news under a line that already says everything is done.
  const fill = (line: string, a: number, b: number) => line.replace('{a}', String(a)).replace('{b}', String(b));
  return {
    title: swept ? copy.allDone : copy.ready,
    meta: swept ? fill(copy.sumAll, count.done, count.done) : fill(copy.sum, count.open, count.done),
  };
}

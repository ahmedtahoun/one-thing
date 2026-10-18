/**
 * What Settings says about reminders.
 *
 * The app could not deliver a single notification and said nothing about it
 * (BUILD-REVIEW §2.101). Permission was never granted, so `sync` returned
 * early every time; the provider swallowed the result; and the only sign was
 * an absence, which looks exactly like having nothing to remind anybody of.
 *
 * So the row states both halves — whether the OS will deliver, and how many
 * notifications are actually waiting in it. A count of zero while tasks have
 * times is a different fault from permission being off, and until now they
 * were indistinguishable from the outside.
 */

export type ReminderLine =
  /** The OS has not been asked, or said no: nothing can be delivered. */
  | { kind: 'off' }
  /** Allowed, and this many notifications are waiting in the OS. */
  | { kind: 'on'; scheduled: number }
  /**
   * Allowed, nothing waiting, and nothing to wait for — no task carries a
   * time. Saying "0 reminders" here would read as broken when it is empty.
   */
  | { kind: 'nothing' }
  /**
   * Allowed, nothing waiting, and there *is* something that should have
   * been: the case worth shouting about, and the one that was silent.
   */
  | { kind: 'broken'; expected: number }
  /** Not a platform that delivers them at all. */
  | { kind: 'unsupported' };

export function reminderLine({
  supported,
  allowed,
  scheduled,
  remindable,
}: {
  supported: boolean;
  /** Null before the OS has answered; only an explicit false is a refusal. */
  allowed: boolean | null;
  /** How many the OS is holding. */
  scheduled: number;
  /** How many open tasks carry a time, and so should have produced one. */
  remindable: number;
}): ReminderLine {
  if (!supported) return { kind: 'unsupported' };
  if (allowed !== true) return { kind: 'off' };
  if (scheduled > 0) return { kind: 'on', scheduled };
  return remindable > 0 ? { kind: 'broken', expected: remindable } : { kind: 'nothing' };
}

/** Reads as a problem rather than a state. */
export const isTrouble = (line: ReminderLine): boolean => line.kind === 'off' || line.kind === 'broken';

/** Whether the row offers to turn them on. */
export const canTurnOn = (line: ReminderLine): boolean => line.kind === 'off';

/** Whether the row belongs on the screen at all. */
export const showsRow = (line: ReminderLine): boolean => line.kind !== 'unsupported';

/**
 * The contract every free-text screen talks to — Quick capture, Brain dump
 * and the Assistant. DATA_MODEL.md § AI / parsing: "Capture, Brain dump and
 * Assistant parse free text into {type, what, who, when}. Always show the
 * parsed result for confirmation before saving."
 *
 * Nothing here saves anything. A parser proposes; the screen shows the
 * proposal; only the person's "Looks right" / "Save {n}" writes a task.
 */
import type { Lang } from '@/content/strings';
import type { Contact } from '@/lib/model-types';

/** What a sentence can turn into. Events (visit, meeting…) have their own form. */
export type ParsedType = 'call' | 'email' | 'whatsapp' | 'reminder';

export type ParsedTask = {
  type: ParsedType;
  /** What to do, as the person will read it in their list. */
  title: string;
  /** Who it is with, as written or as matched in People; null when nobody. */
  who: string | null;
  /** The contact `who` was matched to, so the task links to them. */
  contactId: string | null;
  /** When it is due: a full ISO instant. For a `waiting`, when to check in. */
  when: string;
  /**
   * `promise`: something the person owes ("I told Omar I'd send it"), saved as
   * a task. `waiting`: something they are owed, saved as a follow-up that comes
   * back when it is time to check. Absent for an ordinary task.
   */
  kind?: 'promise' | 'waiting';
};

/**
 * What the Assistant can do with a message. There is deliberately no variant
 * that carries an answer in free text: the Assistant's scope is tasks,
 * contacts, reminders and follow-ups only (SCREENS.md § 19), so the only
 * things it can say are the handoff's own lines around these structured
 * results. Anything else a person asks is offered back as a task to keep or
 * ignore — BUILD-REVIEW.md §2.34.
 */
export type AssistantIntent =
  | { kind: 'task'; task: ParsedTask }
  | { kind: 'plan' }
  | { kind: 'followups' };

export type ParseContext = {
  lang: Lang;
  /** "Now", so "tomorrow" and "at 10" resolve against the person's day. */
  now: Date;
  /** People, so "send Sara the deck" links to Sara. */
  contacts: Contact[];
};

/**
 * The seam. Asynchronous because the real implementation is a network call:
 * the Claude API behind the backend, key held server-side, with the Free
 * plan's daily assistant meter enforced there too. See ./index.ts.
 */
export interface TextParser {
  /** Quick capture: one sentence, one task. */
  parse(text: string, ctx: ParseContext): Promise<ParsedTask>;
  /** Brain dump: a messy paragraph, several tasks. */
  split(text: string, ctx: ParseContext): Promise<ParsedTask[]>;
  /** The Assistant: what this message is asking for. */
  interpret(text: string, ctx: ParseContext): Promise<AssistantIntent>;
}

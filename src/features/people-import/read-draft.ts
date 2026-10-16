/**
 * A file already read, handed from the Assistant's chat to the Import screen.
 *
 * The Assistant reads a picked file itself so it can report the counts in the
 * conversation ("Found 45 people in 2 sheets"). "Review" then opens Import,
 * which must not ask for the same file again — picking it twice is the thing
 * the chat was meant to save. A plain module store, like the contact draft
 * next door (src/lib/phone-contacts/index.ts): the screen peeks while it sets
 * up its state, which React may do twice, and clears once it has mounted.
 *
 * The file's contents never leave the phone; only what was read from it
 * crosses this handoff, and only within the one app.
 */
import type { Candidate } from './columns';

export type ReadFile = {
  /** The file's own name, for the line over the preview. */
  name: string;
  candidates: Candidate[];
  skipped: number;
};

let pending: ReadFile | null = null;

export const readDraft = {
  set(file: ReadFile) {
    pending = file;
  },
  peek(): ReadFile | null {
    return pending;
  },
  clear() {
    pending = null;
  },
};

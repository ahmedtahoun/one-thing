import type { NewTask } from '@/lib/tasks';
import type { Channel, CreatedVia, FollowUp } from '@/lib/model-types';
import type { ParsedTask } from './types';

/**
 * A confirmed proposal as a task. Only called from a person's "Looks right",
 * "Save & back to focus" or "Save {n}" — never on parsing. The goal is the
 * title, as the prototype's addTask() sets it, so Compose has something to
 * show until the person writes one.
 */
export function taskFromParsed(p: ParsedTask, createdVia: CreatedVia, draft?: { subject?: string; body: string }): NewTask {
  return {
    type: p.type,
    title: p.title,
    who: p.who ?? undefined,
    contactIds: p.contactId ? [p.contactId] : [],
    dueAt: p.when,
    goal: p.title,
    ...(draft ? { draft } : {}),
    createdVia,
  };
}

/**
 * A `waiting` proposal as a follow-up: someone owes the person a reply, and it
 * comes back as due at `when`. `since` is the line on the card ("Waiting ·
 * check in Tue"), written by the screen in the person's language.
 */
export function followUpFromParsed(p: ParsedTask, since: string): Omit<FollowUp, 'id' | 'createdAt'> {
  const channel: Channel = p.type === 'reminder' ? 'whatsapp' : p.type;
  return {
    contactId: p.contactId,
    taskId: null,
    channel,
    who: p.who ?? p.title,
    what: p.title,
    status: 'waiting',
    since,
    nextAt: p.when,
    lastAction: null,
  };
}

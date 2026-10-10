import type { NewTask } from '@/lib/tasks';
import type { CreatedVia } from '@/lib/model-types';
import type { ParsedTask } from './types';

/**
 * A confirmed proposal as a task. Only called from a person's "Looks right",
 * "Save & back to focus" or "Save {n}" — never on parsing. The goal is the
 * title, as the prototype's addTask() sets it, so Compose has something to
 * show until the person writes one.
 */
export function taskFromParsed(p: ParsedTask, createdVia: CreatedVia): NewTask {
  return {
    type: p.type,
    title: p.title,
    who: p.who ?? undefined,
    contactIds: p.contactId ? [p.contactId] : [],
    dueAt: p.when,
    goal: p.title,
    createdVia,
  };
}

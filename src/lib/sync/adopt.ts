/**
 * Gives rows made before the backend existed keys the server can hold.
 *
 * Builds before sync made ids like `t_1728…_x8k2q`, and the demo data uses
 * `c1`; the tables' keys are uuids. The first time a device syncs, each such
 * id gets a fresh UUID, and every reference to it — a task's people, a
 * follow-up's contact and task, a history row's contact — moves with it.
 * Objects that change are new objects, so the stores see the change.
 */
import { isUuid, newId } from '../ids';
import type { Contact, FollowUp, HistoryEntry, Task } from '../model-types';

export type Lists = { tasks: Task[]; contacts: Contact[]; history: HistoryEntry[]; followUps: FollowUp[] };

/** Old id → new id, for every id in the lists that is not already a UUID. */
export function legacyIds(lists: Lists, make: () => string = newId): Map<string, string> {
  const map = new Map<string, string>();
  const see = (id: string | null | undefined) => {
    if (id && !isUuid(id) && !map.has(id)) map.set(id, make());
  };
  for (const t of lists.tasks) {
    see(t.id);
    t.contactIds.forEach(see);
  }
  for (const c of lists.contacts) see(c.id);
  for (const h of lists.history) {
    see(h.id);
    see(h.contactId);
  }
  for (const f of lists.followUps) {
    see(f.id);
    see(f.contactId);
    see(f.taskId);
  }
  return map;
}

const swap = (map: Map<string, string>, id: string) => map.get(id) ?? id;
const swapMaybe = (map: Map<string, string>, id: string | null | undefined) => (id ? swap(map, id) : id);

/** Each rewrite returns the same object when it holds no old id. */
export const rewrite = {
  task: (map: Map<string, string>, t: Task): Task =>
    map.has(t.id) || t.contactIds.some((id) => map.has(id))
      ? { ...t, id: swap(map, t.id), contactIds: t.contactIds.map((id) => swap(map, id)) }
      : t,
  contact: (map: Map<string, string>, c: Contact): Contact => (map.has(c.id) ? { ...c, id: swap(map, c.id) } : c),
  history: (map: Map<string, string>, h: HistoryEntry): HistoryEntry =>
    map.has(h.id) || map.has(h.contactId) ? { ...h, id: swap(map, h.id), contactId: swap(map, h.contactId) } : h,
  followUp: (map: Map<string, string>, f: FollowUp): FollowUp =>
    map.has(f.id) || (f.contactId && map.has(f.contactId)) || (f.taskId && map.has(f.taskId))
      ? { ...f, id: swap(map, f.id), contactId: swapMaybe(map, f.contactId), taskId: swapMaybe(map, f.taskId) }
      : f,
};

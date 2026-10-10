/**
 * Contacts and follow-ups — the light CRM behind People and Follow-ups.
 *
 * One provider because the two are joined: a follow-up belongs to a contact,
 * and closing one will write to that contact's history. Same arrangement as
 * the task store: React state mirrored to the device until the backend lands.
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { displayName, type Contact, type FollowUp, type HistoryEntry, type Task } from './model-types';
import { usePersisted } from './persisted';

const CONTACTS_KEY = 'ot.contacts';
const FOLLOWUPS_KEY = 'ot.followups';
const HISTORY_KEY = 'ot.history';

/**
 * The contact a task is with: the one it is linked to, else the one whose
 * name it carries. Seed and captured tasks only have the name ("Faisal ·
 * Lawyer"), so the prototype matches on the first word, as its "Last time"
 * row does.
 */
export function contactForTask(task: Task, contacts: Contact[]): Contact | undefined {
  const linked = task.contactIds[0];
  if (linked) {
    const found = contacts.find((c) => c.id === linked);
    if (found) return found;
  }
  if (!task.who) return undefined;
  const name = displayName(task.who).trim();
  const first = name.split(' ')[0] ?? '';
  return contacts.find((c) => c.name === name) ?? (first ? contacts.find((c) => c.name.startsWith(first)) : undefined);
}

type PeopleValue = {
  /** Most recent interaction first — the order People lists them in. */
  contacts: Contact[];
  followUps: FollowUp[];
  /** Every dated moment with every contact, newest first. */
  history: HistoryEntry[];
  ready: boolean;
  /**
   * Remembers how to reach someone after a message goes out: updates the
   * contact (or adds one, named as the task names them) and moves them to the
   * top of People. Returns the contact's id.
   */
  saveContact: (input: { id?: string; name: string; role?: string; lastLabel: string }, patch: Partial<Contact>) => string;
  addFollowUp: (followUp: FollowUp) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  /** Quick log on the contact profile: a dated moment, newest first. */
  addHistory: (entry: Omit<HistoryEntry, 'id'>) => void;
  updateFollowUp: (id: string, patch: Partial<FollowUp>) => void;
  /** Replaces the whole list — used by Undo, which restores a snapshot. */
  restoreFollowUps: (followUps: FollowUp[]) => void;
  reset: () => void;
};

const PeopleContext = createContext<PeopleValue | null>(null);

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts, contactsReady, resetContacts] = usePersisted<Contact[]>(CONTACTS_KEY, []);
  const [history, setHistory, historyReady, resetHistory] = usePersisted<HistoryEntry[]>(HISTORY_KEY, []);
  const [followUps, setFollowUps, followUpsReady, resetFollowUps] = usePersisted<FollowUp[]>(FOLLOWUPS_KEY, []);

  const updateFollowUp = useCallback<PeopleValue['updateFollowUp']>(
    (id, patch) => setFollowUps((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f))),
    [setFollowUps]
  );

  const saveContact = useCallback<PeopleValue['saveContact']>(
    ({ id, name, role, lastLabel }, patch) => {
      const newId = id ?? `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setContacts((list) => {
        const current = id ? list.find((c) => c.id === id) : undefined;
        const next: Contact = current
          ? { ...current, ...patch, lastLabel }
          : { id: newId, name, role: role || undefined, ...patch, lastLabel, createdAt: new Date().toISOString() };
        return [next, ...list.filter((c) => c.id !== next.id)];
      });
      return newId;
    },
    [setContacts]
  );

  const updateContact = useCallback<PeopleValue['updateContact']>(
    (id, patch) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [setContacts]
  );

  const addHistory = useCallback<PeopleValue['addHistory']>(
    (entry) =>
      setHistory((list) => [{ ...entry, id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }, ...list]),
    [setHistory]
  );

  const addFollowUp = useCallback<PeopleValue['addFollowUp']>(
    (followUp) => setFollowUps((list) => [followUp, ...list]),
    [setFollowUps]
  );

  const reset = useCallback(() => {
    resetContacts();
    resetFollowUps();
    resetHistory();
  }, [resetContacts, resetFollowUps, resetHistory]);

  const value = useMemo<PeopleValue>(
    () => ({
      contacts,
      followUps,
      history,
      ready: contactsReady && followUpsReady && historyReady,
      saveContact,
      addFollowUp,
      updateContact,
      addHistory,
      updateFollowUp,
      restoreFollowUps: setFollowUps,
      reset,
    }),
    [
      contacts,
      followUps,
      history,
      contactsReady,
      followUpsReady,
      historyReady,
      saveContact,
      addFollowUp,
      updateContact,
      addHistory,
      updateFollowUp,
      setFollowUps,
      reset,
    ]
  );
  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople(): PeopleValue {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error('usePeople must be used inside <PeopleProvider>');
  return ctx;
}

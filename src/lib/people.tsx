/**
 * Contacts and follow-ups — the light CRM behind People and Follow-ups.
 *
 * One provider because the two are joined: a follow-up belongs to a contact,
 * and closing one will write to that contact's history. Same arrangement as
 * the task store: React state mirrored to the device until the backend lands.
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { track } from './analytics/track';
import { clearCadence } from './cadence';
import { clearFavorites } from './favorites';
import { newId } from './ids';
import { clearNextState } from './next-state';
import { clearPhotos } from './photos';
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
  /** Returns the new follow-up's id, so the screen that made it can change or take it back. */
  addFollowUp: (followUp: Omit<FollowUp, 'id' | 'createdAt'>) => string;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  /** A new contact from the contact form, at the top of People. Returns it. */
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Contact;
  /** Many at once — an import — in the order given, as one change. Returns them. */
  addContacts: (contacts: Omit<Contact, 'id' | 'createdAt'>[]) => Contact[];
  /**
   * Deletes a contact and their history ("Their history goes too"). Returns
   * a function that puts both back, for the toast's Undo.
   */
  deleteContact: (id: string) => () => void;
  /** Quick log on the contact profile: a dated moment, newest first. */
  addHistory: (entry: Omit<HistoryEntry, 'id'>) => void;
  updateFollowUp: (id: string, patch: Partial<FollowUp>) => void;
  /** Replaces the whole list — used by Undo, which restores a snapshot. */
  restoreFollowUps: (followUps: FollowUp[]) => void;
  /** Replaces the whole history — used by Undo, which restores a snapshot. */
  restoreHistory: (history: HistoryEntry[]) => void;
  reset: () => void;
  /** For the sync engine only — see the task store's own. */
  applySync: (update: {
    contacts?: (current: Contact[]) => Contact[];
    history?: (current: HistoryEntry[]) => HistoryEntry[];
    followUps?: (current: FollowUp[]) => FollowUp[];
  }) => void;
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
      const contactId = id ?? newId();
      const touchedAt = new Date().toISOString();
      setContacts((list) => {
        const current = id ? list.find((c) => c.id === id) : undefined;
        const next: Contact = current
          ? { ...current, ...patch, lastLabel, touchedAt }
          : { id: contactId, name, role: role || undefined, ...patch, lastLabel, touchedAt, createdAt: touchedAt };
        return [next, ...list.filter((c) => c.id !== next.id)];
      });
      return contactId;
    },
    [setContacts]
  );

  const updateContact = useCallback<PeopleValue['updateContact']>(
    (id, patch) => setContacts((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [setContacts]
  );

  const addContact = useCallback<PeopleValue['addContact']>(
    (input) => {
      const contact: Contact = {
        ...input,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      setContacts((list) => [contact, ...list]);
      return contact;
    },
    [setContacts]
  );

  const addContacts = useCallback<PeopleValue['addContacts']>(
    (inputs) => {
      const createdAt = new Date().toISOString();
      const made: Contact[] = inputs.map((input) => ({ ...input, id: newId(), createdAt }));
      setContacts((list) => [...made, ...list]);
      return made;
    },
    [setContacts]
  );

  const deleteContact = useCallback<PeopleValue['deleteContact']>(
    (id) => {
      const contactsBefore = contacts;
      const historyBefore = history;
      setContacts((list) => list.filter((c) => c.id !== id));
      setHistory((list) => list.filter((h) => h.contactId !== id));
      return () => {
        setContacts(contactsBefore);
        setHistory(historyBefore);
      };
    },
    [contacts, history, setContacts, setHistory]
  );

  const addHistory = useCallback<PeopleValue['addHistory']>(
    (entry) =>
      setHistory((list) => [{ ...entry, id: newId() }, ...list]),
    [setHistory]
  );

  const addFollowUp = useCallback<PeopleValue['addFollowUp']>(
    (followUp) => {
      const id = newId();
      setFollowUps((list) => [{ ...followUp, id, createdAt: new Date().toISOString() }, ...list]);
      track({ name: 'followup_created' });
      return id;
    },
    [setFollowUps]
  );

  const reset = useCallback(() => {
    resetContacts();
    resetFollowUps();
    resetHistory();
    clearFavorites();
    clearNextState();
    clearPhotos();
    clearCadence();
  }, [resetContacts, resetFollowUps, resetHistory]);

  const applySync = useCallback<PeopleValue['applySync']>(
    (update) => {
      if (update.contacts) setContacts(update.contacts);
      if (update.history) setHistory(update.history);
      if (update.followUps) setFollowUps(update.followUps);
    },
    [setContacts, setHistory, setFollowUps]
  );

  const value = useMemo<PeopleValue>(
    () => ({
      contacts,
      followUps,
      history,
      ready: contactsReady && followUpsReady && historyReady,
      saveContact,
      addFollowUp,
      updateContact,
      addContact,
      addContacts,
      deleteContact,
      addHistory,
      updateFollowUp,
      restoreFollowUps: setFollowUps,
      restoreHistory: setHistory,
      reset,
      applySync,
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
      addContact,
      addContacts,
      deleteContact,
      addHistory,
      updateFollowUp,
      setFollowUps,
      reset,
      applySync,
    ]
  );
  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople(): PeopleValue {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error('usePeople must be used inside <PeopleProvider>');
  return ctx;
}

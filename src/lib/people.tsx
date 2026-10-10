/**
 * Contacts and follow-ups — the light CRM behind People and Follow-ups.
 *
 * One provider because the two are joined: a follow-up belongs to a contact,
 * and closing one will write to that contact's history. Same arrangement as
 * the task store: React state mirrored to the device until the backend lands.
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import type { Contact, FollowUp } from './model-types';
import { usePersisted } from './persisted';

const CONTACTS_KEY = 'ot.contacts';
const FOLLOWUPS_KEY = 'ot.followups';

type PeopleValue = {
  /** Most recent interaction first — the order People lists them in. */
  contacts: Contact[];
  followUps: FollowUp[];
  ready: boolean;
  updateFollowUp: (id: string, patch: Partial<FollowUp>) => void;
  /** Replaces the whole list — used by Undo, which restores a snapshot. */
  restoreFollowUps: (followUps: FollowUp[]) => void;
  reset: () => void;
};

const PeopleContext = createContext<PeopleValue | null>(null);

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [contacts, , contactsReady, resetContacts] = usePersisted<Contact[]>(CONTACTS_KEY, []);
  const [followUps, setFollowUps, followUpsReady, resetFollowUps] = usePersisted<FollowUp[]>(FOLLOWUPS_KEY, []);

  const updateFollowUp = useCallback<PeopleValue['updateFollowUp']>(
    (id, patch) => setFollowUps((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f))),
    [setFollowUps]
  );

  const reset = useCallback(() => {
    resetContacts();
    resetFollowUps();
  }, [resetContacts, resetFollowUps]);

  const value = useMemo<PeopleValue>(
    () => ({
      contacts,
      followUps,
      ready: contactsReady && followUpsReady,
      updateFollowUp,
      restoreFollowUps: setFollowUps,
      reset,
    }),
    [contacts, followUps, contactsReady, followUpsReady, updateFollowUp, setFollowUps, reset]
  );
  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople(): PeopleValue {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error('usePeople must be used inside <PeopleProvider>');
  return ctx;
}

/**
 * Bringing one contact in from the phone's own address book (BUILD-REVIEW.md
 * §2.46).
 *
 * The system picker shows the person their contacts and hands back only the
 * one they choose; the app never reads the address book. On iOS that needs
 * no permission at all: the picker returns the contact itself. That is why
 * this uses `expo-contacts/legacy` — the newer API hands back an ID and reads
 * the details through the address book, which would need full access. On
 * Android, reading the chosen contact's numbers needs the contacts
 * permission, so it is asked for first, once.
 *
 * Nothing is saved here: the result fills the New contact form, where the
 * person checks it (and sees the duplicate warning) before Save.
 */
import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts/legacy';

import { draftFromPhone, type ContactDraft } from './draft';

export type { ContactDraft } from './draft';

/** Whether this device has a contact picker. The web build has none. */
export const canPickFromPhone = Platform.OS === 'ios' || Platform.OS === 'android';

/** Opens the picker; the chosen contact as a draft, or null when cancelled or refused. */
export async function pickFromPhone(): Promise<ContactDraft | null> {
  if (!canPickFromPhone) return null;
  try {
    if (Platform.OS === 'android') {
      const { granted } = await Contacts.requestPermissionsAsync();
      if (!granted) return null;
    }
    const picked = await Contacts.presentContactPickerAsync();
    return picked ? draftFromPhone(picked) : null;
  } catch {
    return null;
  }
}

/**
 * A draft handed from People's "Import" to the New contact form it opens; a
 * plain module store, as the sign-up draft is. The form peeks while it sets
 * up its state (which React may do twice) and clears once it has mounted.
 */
let pending: ContactDraft | null = null;
export const importDraft = {
  set(draft: ContactDraft) {
    pending = draft;
  },
  peek(): ContactDraft | null {
    return pending;
  },
  clear() {
    pending = null;
  },
};

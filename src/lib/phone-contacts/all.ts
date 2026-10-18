/**
 * The phone's whole address book, read into memory so it can be browsed in
 * the app — the WhatsApp move: tap +, see everyone you know, pick one.
 *
 * `./index.ts` picks **one** contact through the system picker, which on
 * iOS needs no permission at all because the picker hands back the person
 * chosen. A browsable list cannot work that way: to show the names, the app
 * has to be allowed to read them. So this asks, once, and the purpose
 * string in `app.json` says exactly what for.
 *
 * **Nothing is stored.** The list lives in the screen's state for as long
 * as the screen is open, and only the people actually chosen are written
 * into People — which is also what keeps the list in the app worth reading:
 * it holds the people being dealt with, not nine hundred numbers from a
 * phone. Nothing is uploaded either; the sync carries the contacts someone
 * saved, and an address book that was only browsed never becomes one.
 *
 * **"Allow Limited Access" is a yes, not a no.** From iOS 18 the permission
 * sheet offers it beside the usual two, and it answers `granted: true` with
 * `accessPrivileges: 'limited'` — after which `getContactsAsync` returns
 * only the handful ticked in the system sheet. Reading `granted` alone, the
 * app showed those few as if they were the whole address book: a screen
 * with two names on it, both marked Added, no way to reach anybody else and
 * nothing saying why (BUILD-REVIEW §2.97). So the privilege is carried out
 * to the screen, and `widenPhoneContacts` reopens Apple's own picker to
 * hand over more.
 */
import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts/legacy';

import { draftFromPhone, type ContactDraft } from './draft';

/** Whether this device has an address book to read. The web build has none. */
export const canListPhoneContacts = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * How much of the book this app was given. `limited` is iOS 18 and up:
 * a yes to some named people rather than to the address book.
 */
export type Access = 'all' | 'limited';

export type PhoneBook =
  | { ok: true; people: ContactDraft[]; access: Access }
  /** `denied`: the person said no, which is an answer and not an error. */
  | { ok: false; why: 'denied' | 'failed' };

/**
 * Whether more people can be handed over from inside the app. Apple's
 * picker is the only way to widen a limited grant without Settings;
 * Android has no such thing, because it has no such grant.
 */
export const canWidenPhoneContacts = Platform.OS === 'ios';

/**
 * Reopen the system picker so more people can be added to what this app is
 * allowed to see. True when it closed and the list is worth reading again.
 * It throws on an iOS older than 18, where limited access does not exist,
 * so the catch is the answer rather than a failure.
 */
export async function widenPhoneContacts(): Promise<boolean> {
  if (!canWidenPhoneContacts) return false;
  try {
    await Contacts.presentAccessPickerAsync();
    return true;
  } catch {
    return false;
  }
}

/**
 * Everyone in the phone's address book, as drafts — name, number, email —
 * with the nameless and the numberless left out, because neither can be
 * messaged or recognised later.
 */
export async function listPhoneContacts(): Promise<PhoneBook> {
  if (!canListPhoneContacts) return { ok: false, why: 'failed' };
  try {
    const { granted, accessPrivileges } = await Contacts.requestPermissionsAsync();
    if (!granted) return { ok: false, why: 'denied' };
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.FirstName, Contacts.Fields.LastName, Contacts.Fields.Company, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
    });
    const people = (data ?? [])
      .map((one) => draftFromPhone(one as Parameters<typeof draftFromPhone>[0]))
      .filter((draft) => draft.name.trim() !== '' && (draft.phone.trim() !== '' || draft.email.trim() !== ''));
    return { ok: true, people, access: accessPrivileges === 'limited' ? 'limited' : 'all' };
  } catch {
    return { ok: false, why: 'failed' };
  }
}

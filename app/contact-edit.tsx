/**
 * 12 · Contact edit / new. SCREENS.md § 12.
 *
 * A fixed header (Cancel · title · Save) over a scrolling form, 20 / 20 / 44
 * with an 18 pt gap: the initials, name and role, the optional contact
 * details with a searchable country picker, how they are usually reached,
 * notes for next time, a duplicate warning, and the three buttons.
 *
 * `?id=` edits that contact; without it the form makes a new one.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { emailInvalid, findDuplicate, nameValid, phoneInvalid } from '@/features/contact/form-rules';
import { useStartTask } from '@/features/people/start-task';
import { CountryButton, CountryList } from '@/ui/CountryPicker';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { added } from '@/content/additions';
import { DEFAULT_DIAL } from '@/content/countries';
import { TYPE_ICON } from '@/design/icon-paths';
import { fontFamily, ink, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { initials, type Channel, type Contact } from '@/lib/model-types';
import { usePeople } from '@/lib/people';
import { canPickFromPhone, importDraft, pickFromPhone, type ContactDraft } from '@/lib/phone-contacts';

const CHANNELS: Channel[] = ['whatsapp', 'email', 'call'];

/** A format hint, not copy — as drawn on Compose. */
const PHONE_PLACEHOLDER = '5X XXX XXXX';

export default function ContactEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { contacts, ready } = usePeople();
  if (!ready) return null;
  if (!id) return <ContactForm key="new" />;
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return <Redirect href="/people" />;
  return <ContactForm key={contact.id} contact={contact} />;
}

function ContactForm({ contact }: { contact?: Contact }) {
  const { t, inline, lang } = useLanguage();
  const dir = useDirection();
  const { contacts, addContact, updateContact, deleteContact } = usePeople();
  const start = useStartTask();
  const toast = useToast();
  const editing = Boolean(contact);

  // A contact picked on People's "Import" arrives filled in (§2.39).
  const [imported] = useState<ContactDraft | null>(() => (editing ? null : importDraft.peek()));
  useEffect(() => importDraft.clear(), []);

  const [name, setName] = useState(contact?.name ?? imported?.name ?? '');
  const [role, setRole] = useState(contact?.role ?? imported?.role ?? '');
  const [dial, setDial] = useState(contact?.dial ?? imported?.dial ?? DEFAULT_DIAL);
  const [phone, setPhone] = useState(contact?.phone ?? imported?.phone ?? '');
  const [email, setEmail] = useState(contact?.email ?? imported?.email ?? '');
  const [pref, setPref] = useState<Channel>(
    contact?.preferredChannel ??
      ((contact && !contact.phone) || (imported && !imported.phone && imported.email) ? 'email' : 'whatsapp')
  );

  /** "Fill from phone": the picked contact's details, over whatever is typed. */
  const fillFromPhone = async () => {
    const draft = await pickFromPhone();
    if (!draft) return;
    setName(draft.name);
    setRole(draft.role);
    if (draft.dial) setDial(draft.dial);
    setPhone(draft.phone);
    setEmail(draft.email);
    if (!draft.phone && draft.email) setPref('email');
  };
  const [notes, setNotes] = useState(contact?.rememberNote ?? '');
  const [tried, setTried] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const nameOk = nameValid(name);
  const detailsBad = emailInvalid(email) || phoneInvalid(phone);
  const duplicate = useMemo(
    () => findDuplicate({ name, phone, email }, contacts, contact?.id),
    [name, phone, email, contacts, contact?.id]
  );
  const saveColour = nameOk ? ink.base : ink.disabledBtn;

  const toPeople = () => router.dismissTo('/people');

  /** Writes the contact. Null when the form is not ready to save. */
  const save = (): Contact | null => {
    if (!nameOk || detailsBad) {
      setTried(true);
      return null;
    }
    const fields = {
      name: name.trim(),
      role: role.trim() || undefined,
      dial,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      preferredChannel: pref,
      rememberNote: notes.trim() || undefined,
    };
    if (contact) {
      updateContact(contact.id, fields);
      return { ...contact, ...fields };
    }
    return addContact({ ...fields, lastLabel: inline.addedToday });
  };

  const onSave = () => {
    const saved = save();
    if (!saved) return;
    toPeople();
    toast.show(t.toastC.replace('{n}', saved.name.split(' ')[0] ?? saved.name), { undo: false });
  };

  const onSaveAndStart = () => {
    const saved = save();
    if (saved) start(saved, pref);
  };

  const onDelete = () => {
    if (!contact) return;
    const remove = () => {
      const undo = deleteContact(contact.id);
      toPeople();
      // Destructive, so it can be undone for the length of the toast.
      toast.show(inline.toastContactDeleted, { undo });
    };
    // React Native Web has no Alert, so the browser's own confirm stands in.
    if (Platform.OS === 'web') {
      if (window.confirm(inline.deleteContactConfirm)) remove();
      return;
    }
    Alert.alert(inline.deleteContactConfirm, undefined, [
      { text: t.cancel, style: 'cancel' },
      { text: inline.deleteContact, style: 'destructive', onPress: remove },
    ]);
  };

  const field = {
    height: 54,
    paddingHorizontal: 16,
    fontFamily: `${fontFamily}_400Regular`,
    fontSize: 16,
    color: ink.base,
    backgroundColor: surface.white,
    writingDirection: dir.isRTL ? ('rtl' as const) : ('ltr' as const),
    textAlign: dir.textAlign,
  };
  const ltrField = { ...field, writingDirection: 'ltr' as const, textAlign: 'left' as const };
  // 54 plus a 1 pt rule: the prototype's inputs are content-box.
  const ruled = { height: 55, borderBottomWidth: 1, borderBottomColor: surface.lineSoft };

  return (
    <>
      <Screen paddingX={0}>
        <View
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 4,
            paddingBottom: 10,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: surface.lineSoft,
          }}
        >
          <Pressable testID="contact-form-cancel" onPress={toPeople} accessibilityRole="button" style={{ paddingVertical: 8 }}>
            <Text token="body" color={ink.s3}>
              {t.cancel}
            </Text>
          </Pressable>
          <Text token="bodyL" weight="600">
            {editing ? t.editC : t.newCT}
          </Text>
          <Pressable testID="contact-form-save-top" onPress={onSave} accessibilityRole="button" style={{ paddingVertical: 8 }}>
            <Text token="body" weight="600" color={saveColour}>
              {t.saveC}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 44, gap: 18 }}
        >
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: surface.avatarPeople,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text token="h2" align="center" testID="contact-form-initials">
                {name.trim() ? initials(name.trim()) : '+'}
              </Text>
            </View>
            {!editing && canPickFromPhone ? (
              <Pressable
                testID="contact-form-fill"
                onPress={fillFromPhone}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  marginTop: 12,
                  height: 34,
                  paddingStart: 10,
                  paddingEnd: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: surface.line,
                  backgroundColor: surface.white,
                  flexDirection: dir.row,
                  alignItems: 'center',
                  gap: 6,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Icon name="users" size={15} color={ink.base} strokeWidth={2} />
                <Text token="bodyS" weight="500">
                  {added(lang).fillFromPhone}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ gap: 6 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: surface.cardLine,
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: surface.white,
              }}
            >
              <TextInput
                testID="contact-form-name"
                value={name}
                onChangeText={setName}
                placeholder={t.f_namePh}
                placeholderTextColor={ink.s5}
                style={{ ...field, ...ruled }}
              />
              {/* The prototype draws a rule under this last row too. */}
              <TextInput
                testID="contact-form-role"
                value={role}
                onChangeText={setRole}
                placeholder={t.f_rolePh}
                placeholderTextColor={ink.s5}
                style={{ ...field, ...ruled }}
              />
            </View>
            {tried && !nameOk ? (
              <Text token="micro" color={status.invalid} style={{ paddingHorizontal: 4 }} testID="contact-form-name-error">
                {t.f_nameErr}
              </Text>
            ) : null}
          </View>

          {/* Above what follows, so the open country list can lie over it. */}
          <View style={{ gap: 6, zIndex: 30 }}>
            <Text token="micro" color={ink.s4} style={{ paddingHorizontal: 4 }}>
              {inline.contactDetailsOptional}
            </Text>
            <View
              testID="contact-form-details"
              style={{
                borderWidth: 1,
                // The prototype marks the whole card for a bad email as it is
                // typed; a short number (the spec's rule) once Save is tried.
                borderColor: emailInvalid(email) || (tried && phoneInvalid(phone)) ? status.invalid : surface.line,
                borderRadius: 16,
                backgroundColor: surface.white,
                zIndex: 30,
              }}
            >
              <View style={{ zIndex: 30, borderBottomWidth: 1, borderBottomColor: surface.lineSoft }}>
                <View
                  style={{
                    direction: 'ltr',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    height: 54,
                    paddingLeft: 8,
                    paddingRight: 14,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    backgroundColor: surface.white,
                  }}
                >
                  <CountryButton
                    testID="contact-form-country"
                    dial={dial}
                    open={pickerOpen}
                    onPress={() => setPickerOpen((open) => !open)}
                  />
                  <TextInput
                    testID="contact-form-phone"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={PHONE_PLACEHOLDER}
                    placeholderTextColor={ink.s5}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    style={{ ...ltrField, flex: 1, minWidth: 0, height: undefined, paddingHorizontal: 0 }}
                  />
                </View>
                {pickerOpen ? (
                  <CountryList
                    testID="contact-form-countries"
                    dial={dial}
                    searchable
                    maxHeight={240}
                    onPick={(c) => {
                      setDial(c.dial);
                      setPickerOpen(false);
                    }}
                  />
                ) : null}
              </View>
              <TextInput
                testID="contact-form-email"
                value={email}
                onChangeText={setEmail}
                placeholder={t.c_emailPh}
                placeholderTextColor={ink.s5}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                style={{ ...ltrField, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
              />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text token="micro" color={ink.s4}>
              {t.f_pref}
            </Text>
            <View style={{ flexDirection: dir.row, gap: 8 }}>
              {CHANNELS.map((channel) => {
                const on = channel === pref;
                const colour = typeColour[channel];
                return (
                  <Pressable
                    key={channel}
                    testID={`contact-form-pref-${channel}`}
                    onPress={() => setPref(channel)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: on ? colour.fg : surface.line,
                      backgroundColor: on ? colour.bg : surface.white,
                      flexDirection: dir.row,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon name={TYPE_ICON[channel]} size={16} color={colour.fg} strokeWidth={2} />
                    <Text token="caption" weight="600" color={on ? colour.fg : ink.base} numberOfLines={1}>
                      {t.types[channel]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 6, paddingTop: 12, paddingHorizontal: 2, paddingBottom: 2, borderRadius: 16, backgroundColor: status.noteBg }}>
            <Text token="micro" weight="600" color={status.noteFg} style={{ paddingHorizontal: 14 }}>
              {t.f_notes}
            </Text>
            <TextInput
              testID="contact-form-notes"
              value={notes}
              onChangeText={setNotes}
              placeholder={t.f_notesPh}
              placeholderTextColor={ink.s5}
              multiline
              textAlignVertical="top"
              style={{
                // Three rows of 15 pt at 1.5, inside 12 / 14 padding.
                height: 3 * 22.5 + 24,
                paddingVertical: 12,
                paddingHorizontal: 14,
                fontFamily: `${fontFamily}_400Regular`,
                fontSize: 15,
                lineHeight: 22.5,
                color: ink.base,
                writingDirection: dir.isRTL ? 'rtl' : 'ltr',
                textAlign: dir.textAlign,
              }}
            />
          </View>

          <View style={{ flex: 1 }} />

          {duplicate ? (
            <View
              testID="contact-form-duplicate"
              style={{
                flexDirection: dir.row,
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: status.duplicateBg,
              }}
            >
              <Text token="caption" color={status.duplicateFg} style={{ flex: 1 }}>
                {inline.duplicateContact.replace('{n}', duplicate.name)}
              </Text>
              <Pressable
                testID="contact-form-duplicate-open"
                onPress={() => router.replace(`/contact?id=${duplicate.id}`)}
                accessibilityRole="button"
                style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: surface.white }}
              >
                <Text token="caption" weight="600">
                  {inline.openLink}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <Pressable
              testID="contact-form-save"
              onPress={onSave}
              accessibilityRole="button"
              style={{ height: 54, borderRadius: 27, backgroundColor: saveColour, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text token="bodyL" weight="500" color={surface.white} align="center">
                {inline.saveContact}
              </Text>
            </Pressable>
            <Pressable
              testID="contact-form-save-start"
              onPress={onSaveAndStart}
              accessibilityRole="button"
              style={{
                height: 48,
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: surface.line,
                backgroundColor: surface.white,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <Text token="bodyS" weight="500" align="center">
                {inline.saveAndStart[pref]}
              </Text>
              <Text size={11} color={ink.s5} align="center">
                {pref === 'whatsapp' ? inline.opensWhatsApp : pref === 'email' ? inline.opensMail : inline.opensPhone}
              </Text>
            </Pressable>
            {editing ? (
              <Pressable
                testID="contact-form-delete"
                onPress={onDelete}
                accessibilityRole="button"
                style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text token="bodyS" weight="500" color={status.danger} align="center">
                  {inline.deleteContact}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </Screen>
      <Toast />
    </>
  );
}

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

import { dialFromTyped, emailInvalid, findDuplicate, nameValid, phoneInvalid } from '@/features/contact/form-rules';
import { useStartTask } from '@/features/people/start-task';
import { CountryButton, CountryList } from '@/ui/CountryPicker';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { added } from '@/content/additions';
import { joinRole, splitRole } from '@/features/contact/role';
import { labelsIn } from '@/features/people/filters';
import { PhotoSheet } from '@/features/people/PhotoSheet';
import { Avatar } from '@/ui/Avatar';
import { usePhotos } from '@/lib/photos';
import { splitDialled } from '@/lib/parse/contact';
import { dialOfRegion } from '@/content/countries';
import { TYPE_ICON } from '@/design/icon-paths';
import { fontFamily, ink, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { initials, type Channel, type Contact } from '@/lib/model-types';
import { usePeople } from '@/lib/people';
import { deviceRegion } from '@/lib/speech';
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

  // A contact picked on People's "Import" arrives filled in (§2.46).
  const [imported] = useState<ContactDraft | null>(() => (editing ? null : importDraft.peek()));
  useEffect(() => importDraft.clear(), []);

  const [name, setName] = useState(contact?.name ?? imported?.name ?? '');
  const initialRole = splitRole(contact?.role ?? imported?.role);
  const [position, setPosition] = useState(initialRole.position);
  const [company, setCompany] = useState(initialRole.company);
  /**
   * A new number starts on the code of the country the phone is in, not on
   * the one this app was written for: an Egyptian owner adding an Egyptian
   * number was handed +966 and had to notice (BUILD-REVIEW §2.96).
   */
  const [dial, setDial] = useState(contact?.dial ?? imported?.dial ?? dialOfRegion(deviceRegion()));
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
    const fromPhone = splitRole(draft.role);
    setPosition(fromPhone.position);
    setCompany(fromPhone.company);
    if (draft.dial) setDial(draft.dial);
    setPhone(draft.phone);
    setEmail(draft.email);
    if (!draft.phone && draft.email) setPref('email');
  };
  const [dial2, setDial2] = useState(contact?.dial2 ?? '');
  const [phone2, setPhone2] = useState(contact?.phone2 ?? '');
  const [email2, setEmail2] = useState(contact?.email2 ?? '');
  const [moreNumber, setMoreNumber] = useState(Boolean(contact?.phone2));
  const [moreEmail, setMoreEmail] = useState(Boolean(contact?.email2));
  const [labels, setLabels] = useState<string[]>(contact?.labels ?? []);
  const [newLabel, setNewLabel] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const hasPhoto = usePhotos().has(contact?.id ?? '');
  const [address, setAddress] = useState(contact?.address ?? '');
  const [notes, setNotes] = useState(contact?.rememberNote ?? '');
  const [tried, setTried] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const nameOk = nameValid(name);
  const detailsBad = emailInvalid(email) || phoneInvalid(phone) || emailInvalid(email2) || phoneInvalid(phone2);
  const duplicate = useMemo(
    () => findDuplicate({ name, phone, email, phone2, email2 }, contacts, contact?.id),
    [name, phone, email, phone2, email2, contacts, contact?.id]
  );
  const saveColour = nameOk ? ink.base : ink.disabledBtn;

  const known = useMemo(() => labelsIn(contacts), [contacts]);
  const toggleLabel = (label: string) => setLabels((current) => (current.includes(label) ? current.filter((l) => l !== label) : [...current, label]));
  const addLabel = () => {
    const label = newLabel.trim();
    if (label && !labels.some((l) => l.toLowerCase() === label.toLowerCase())) setLabels((current) => [...current, known.find((k) => k.toLowerCase() === label.toLowerCase()) ?? label]);
    setNewLabel('');
  };

  const toPeople = () => router.dismissTo('/people');

  /** Writes the contact. Null when the form is not ready to save. */
  const save = (): Contact | null => {
    if (!nameOk || detailsBad) {
      setTried(true);
      return null;
    }
    // A second number may carry its own code (+20…); otherwise it shares the first one's.
    const typed2 = phone2.replace(/[^\d+]/g, '');
    const split2 = /^(\+|00)/.test(typed2) ? splitDialled(typed2) : { dial: dial2 || dial, phone: typed2.replace(/^0+/, '') };
    const second = {
      dial2: split2.phone ? split2.dial ?? dial : undefined,
      phone2: split2.phone || undefined,
      email2: email2.trim() || undefined,
    };
    const fields = {
      name: name.trim(),
      role: joinRole(position, company),
      dial,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      preferredChannel: pref,
      address: address.trim() || undefined,
      ...second,
      labels: labels.length > 0 ? labels : undefined,
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
            {editing && contact ? (
              <Pressable testID="contact-form-photo" onPress={() => setPhotoOpen(true)} accessibilityRole="button" accessibilityLabel={added(lang).photo.title}>
                <Avatar name={name || contact.name} contactId={contact.id} size={76} />
                <View
                  style={{
                    position: 'absolute',
                    right: -2,
                    bottom: -2,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: surface.fill2,
                    backgroundColor: ink.solid,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="camera" size={14} color={surface.white} strokeWidth={2} />
                </View>
              </Pressable>
            ) : (
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
            )}
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
                testID="contact-form-position"
                value={position}
                onChangeText={setPosition}
                placeholder={added(lang).contact.positionPh}
                placeholderTextColor={ink.s5}
                style={{ ...field, ...ruled }}
              />
              <TextInput
                testID="contact-form-role"
                value={company}
                onChangeText={setCompany}
                placeholder={added(lang).contact.companyPh}
                placeholderTextColor={ink.s5}
                style={{ ...field, ...ruled }}
              />
              <TextInput
                testID="contact-form-address"
                value={address}
                onChangeText={setAddress}
                placeholder={added(lang).contact.address}
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
                    onChangeText={(typed) => {
                      // A number that carries its own country moves the
                      // picker; one that does not is left exactly as typed.
                      const said = dialFromTyped(typed, deviceRegion());
                      if (!said) return setPhone(typed);
                      setDial(said.dial);
                      setPhone(said.phone);
                    }}
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
                style={{ ...ltrField, borderBottomLeftRadius: moreNumber || moreEmail ? 0 : 16, borderBottomRightRadius: moreNumber || moreEmail ? 0 : 16 }}
              />
              {moreNumber ? (
                <TextInput
                  testID="contact-form-phone2"
                  value={phone2}
                  onChangeText={(typed) => {
                    // The second number carries its own code or shares the
                    // first one's — the same rule, its own picker.
                    const said = dialFromTyped(typed, deviceRegion());
                    if (!said) return setPhone2(typed);
                    setDial2(said.dial);
                    setPhone2(said.phone);
                  }}
                  placeholder={added(lang).contact.phone2Ph}
                  placeholderTextColor={ink.s5}
                  keyboardType="phone-pad"
                  style={{ ...ltrField, borderTopWidth: 1, borderTopColor: surface.lineSoft }}
                />
              ) : null}
              {moreEmail ? (
                <TextInput
                  testID="contact-form-email2"
                  value={email2}
                  onChangeText={setEmail2}
                  placeholder={added(lang).contact.email2Ph}
                  placeholderTextColor={ink.s5}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ ...ltrField, borderTopWidth: 1, borderTopColor: surface.lineSoft, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
                />
              ) : null}
            </View>
            {!moreNumber || !moreEmail ? (
              <View style={{ flexDirection: dir.row, gap: 16, paddingHorizontal: 4, paddingTop: 2 }}>
                {!moreNumber ? (
                  <Pressable testID="contact-form-add-number" onPress={() => setMoreNumber(true)} accessibilityRole="button" hitSlop={8}>
                    <Text token="bodyS" weight="600" color={ink.solid}>
                      + {added(lang).contact.addNumber2}
                    </Text>
                  </Pressable>
                ) : null}
                {!moreEmail ? (
                  <Pressable testID="contact-form-add-email" onPress={() => setMoreEmail(true)} accessibilityRole="button" hitSlop={8}>
                    <Text token="bodyS" weight="600" color={ink.solid}>
                      + {added(lang).contact.addEmail2}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
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

          <View style={{ gap: 8 }}>
            <Text token="micro" color={ink.s4}>
              {added(lang).contact.labelsTitle}
            </Text>
            <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8 }}>
              {[...new Set([...known, ...labels])].map((label) => {
                const on = labels.includes(label);
                return (
                  <Pressable
                    key={label}
                    testID={`contact-form-label-${label}`}
                    onPress={() => toggleLabel(label)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? ink.solid : surface.fill }}
                  >
                    <Text token="bodyS" weight="600" color={on ? surface.white : ink.s2}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: dir.row, gap: 8 }}>
              <TextInput
                testID="contact-form-label-new"
                value={newLabel}
                onChangeText={setNewLabel}
                onSubmitEditing={addLabel}
                placeholder={added(lang).contact.labelPh}
                placeholderTextColor={ink.s5}
                returnKeyType="done"
                style={{ ...field, flex: 1, borderWidth: 1, borderColor: surface.line, borderRadius: 14, backgroundColor: surface.white }}
              />
              <Pressable
                testID="contact-form-label-add"
                onPress={addLabel}
                accessibilityRole="button"
                style={{ height: 48, paddingHorizontal: 18, borderRadius: 14, justifyContent: 'center', backgroundColor: surface.fill }}
              >
                <Text token="bodyS" weight="600">
                  {added(lang).contact.labelAdd}
                </Text>
              </Pressable>
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
      {contact ? <PhotoSheet open={photoOpen} contactId={contact.id} hasPhoto={hasPhoto} onClose={() => setPhotoOpen(false)} /> : null}
      <Toast />
    </>
  );
}

/**
 * Compose's recipient fields: the WhatsApp number with its country picker,
 * and the email To / Subject pair. SCREENS.md § 13.
 *
 * Both stay left-to-right in Arabic — numbers and addresses are LTR islands
 * (README § RTL). Suggestions from People appear only while something is
 * being typed and the field is not yet valid.
 */
import { Pressable, TextInput, View } from 'react-native';

import { CountryButton, CountryList } from '@/ui/CountryPicker';
import { Icon } from '@/ui/Icon';
import { LTRText, Text } from '@/ui/Text';
import type { Country } from '@/content/countries';
import { fontFamily, ink, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { initials, type Contact } from '@/lib/model-types';

import { localDigits, type FieldState } from './recipient';

/** A format hint, not copy: the shape of a Gulf mobile number, as drawn. */
const PHONE_PLACEHOLDER = '5X XXX XXXX';

const inputText = {
  fontFamily: `${fontFamily}_400Regular`,
  color: ink.base,
  paddingVertical: 0,
  writingDirection: 'ltr' as const,
  textAlign: 'left' as const,
};

function messageColour(state: FieldState, okColour: string): string {
  return state === 'bad' ? status.invalid : state === 'ok' ? okColour : ink.s4;
}

export function PhoneField({
  dial,
  phone,
  state,
  pickerOpen,
  suggestions,
  onTogglePicker,
  onPickCountry,
  onChangePhone,
  onPickContact,
}: {
  dial: string;
  phone: string;
  state: FieldState;
  pickerOpen: boolean;
  suggestions: Contact[];
  onTogglePicker: () => void;
  onPickCountry: (country: Country) => void;
  onChangePhone: (phone: string) => void;
  onPickContact: (contact: Contact) => void;
}) {
  const { t } = useLanguage();
  const border =
    state === 'bad' ? status.invalid : state === 'ok' ? typeColour.whatsapp.fg : phone ? ink.base : surface.line;
  const message = state === 'bad' ? t.c_phoneErr : state === 'ok' ? t.savedNext : t.c_phoneAsk;
  const showSuggestions = state !== 'ok' && !pickerOpen && localDigits(phone).length > 0 && suggestions.length > 0;

  return (
    // Above what follows, so the open country list can lie over it.
    <View style={{ gap: 6, zIndex: 30 }}>
      <Text token="micro" color={ink.s4}>
        {t.c_phone}
      </Text>
      <View style={{ zIndex: 30 }}>
        <View
          style={{
            direction: 'ltr',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            // 52 plus two 1.5 pt borders: the prototype's box is content-box.
            height: 55,
            borderWidth: 1.5,
            borderColor: border,
            borderRadius: 14,
            paddingLeft: 6,
            paddingRight: 14,
            backgroundColor: surface.white,
          }}
        >
          <CountryButton
            testID="compose-country"
            dial={dial}
            open={pickerOpen}
            onPress={onTogglePicker}
          />
          <TextInput
            testID="compose-phone"
            value={phone}
            onChangeText={onChangePhone}
            placeholder={PHONE_PLACEHOLDER}
            placeholderTextColor={ink.s5}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            style={{ ...inputText, flex: 1, minWidth: 0, fontSize: 16 }}
          />
          {state === 'ok' ? <Icon name="check" size={18} color={typeColour.whatsapp.fg} strokeWidth={2.4} /> : null}
        </View>

        {pickerOpen ? (
          <CountryList testID="compose-countries" dial={dial} onPick={onPickCountry} maxHeight={260} />
        ) : null}
      </View>
      <Text token="micro" color={messageColour(state, typeColour.whatsapp.fg)} testID="compose-phone-msg">
        {message}
      </Text>
      {showSuggestions ? (
        <Suggestions
          contacts={suggestions}
          value={(c) => `${c.dial ?? ''} ${c.phone ?? ''}`.trim()}
          onPick={onPickContact}
          style={{ marginTop: -6 }}
        />
      ) : null}
    </View>
  );
}

export function EmailFields({
  email,
  subject,
  state,
  suggestions,
  onChangeEmail,
  onChangeSubject,
  onPickContact,
}: {
  email: string;
  subject: string;
  state: FieldState;
  suggestions: Contact[];
  onChangeEmail: (email: string) => void;
  onChangeSubject: (subject: string) => void;
  onPickContact: (contact: Contact) => void;
}) {
  const { t } = useLanguage();
  const dir = useDirection();
  const border = state === 'bad' ? status.invalid : state === 'ok' ? typeColour.email.fg : surface.line;
  const message = state === 'bad' ? t.c_emailErr : state === 'ok' ? t.savedNext : t.c_emailAsk;
  const showSuggestions = state !== 'ok' && email.length > 0 && suggestions.length > 0;

  const row = {
    flexDirection: dir.row,
    alignItems: 'center' as const,
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
  };
  const label = (text: string) => (
    <Text token="caption" color={ink.s4} style={{ width: 58 }}>
      {text}
    </Text>
  );

  return (
    <>
      <View style={{ borderWidth: 1.5, borderColor: border, borderRadius: 14, overflow: 'hidden', backgroundColor: surface.white }}>
        <View style={{ ...row, borderBottomWidth: 1, borderBottomColor: surface.lineSoft }}>
          {label(t.c_to)}
          <TextInput
            testID="compose-email"
            value={email}
            onChangeText={onChangeEmail}
            placeholder={t.c_emailPh}
            placeholderTextColor={ink.s5}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            style={{ ...inputText, flex: 1, minWidth: 0, fontSize: 15 }}
          />
          {/* Green, as the prototype draws it — not the email blue. */}
          {state === 'ok' ? <Icon name="check" size={18} color={typeColour.whatsapp.fg} strokeWidth={2.4} /> : null}
        </View>
        <View style={row}>
          {label(t.c_subject)}
          <TextInput
            testID="compose-subject"
            value={subject}
            onChangeText={onChangeSubject}
            style={{
              ...inputText,
              flex: 1,
              minWidth: 0,
              fontSize: 15,
              writingDirection: dir.isRTL ? 'rtl' : 'ltr',
              textAlign: dir.textAlign,
            }}
          />
        </View>
      </View>
      <Text
        token="micro"
        color={messageColour(state, typeColour.email.fg)}
        style={{ marginTop: -10 }}
        testID="compose-email-msg"
      >
        {message}
      </Text>
      {showSuggestions ? (
        <Suggestions contacts={suggestions} value={(c) => c.email ?? ''} onPick={onPickContact} style={{ marginTop: -6 }} />
      ) : null}
    </>
  );
}

/** "Matches": up to three people from People who fit what is typed. */
function Suggestions({
  contacts,
  value,
  onPick,
  style,
}: {
  contacts: Contact[];
  value: (c: Contact) => string;
  onPick: (c: Contact) => void;
  style?: object;
}) {
  const { t } = useLanguage();
  const dir = useDirection();
  return (
    <View style={[{ gap: 6 }, style]} testID="compose-suggestions">
      {/* Only ever shown while typing, so always "Matches", never "Sent before". */}
      <Text token="micro" color={ink.s4}>
        {t.sugMatch}
      </Text>
      <View style={{ borderWidth: 1, borderColor: surface.cardLine, borderRadius: 14, overflow: 'hidden' }}>
        {contacts.map((c) => (
          <Pressable
            key={c.id}
            testID={`compose-suggestion-${c.id}`}
            onPress={() => onPick(c)}
            accessibilityRole="button"
            style={{
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderBottomWidth: 1,
              borderBottomColor: surface.avatar,
              backgroundColor: surface.white,
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: surface.avatarPeople,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text token="micro" weight="600" align="center">
                {initials(c.name)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text token="bodyS" weight="500" numberOfLines={1}>
                {c.name}
              </Text>
              <LTRText token="micro" color={ink.s4} numberOfLines={1} align={dir.textAlign}>
                {value(c)}
              </LTRText>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

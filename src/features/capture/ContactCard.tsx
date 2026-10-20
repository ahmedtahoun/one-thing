/**
 * The contact the Assistant has heard so far, as a card the person can fix by
 * typing: name, number, email (and a company or role when one was said). The
 * Assistant fills it from a sentence or a voice note; nothing is saved until
 * "Save contact".
 */
import { Pressable, TextInput, View } from 'react-native';

import type { Added } from '@/content/additions';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { fontFamily, ink, status, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import type { ContactEdit, ContactFields } from '@/lib/parse/contact';

export type { ContactEdit };

type Props = {
  fields: ContactFields;
  /** The code shown before the number: the one said, else the phone's own country. */
  dial: string;
  copy: Added['contact'];
  /** An existing contact these details match: offer to update it rather than add a second one. */
  duplicate?: { id: string; name: string };
  error?: string;
  /** When they matter, which of the fields cannot be saved without. */
  canSave: boolean;
  canSaveNameOnly: boolean;
  onEdit: (edit: ContactEdit) => void;
  onSave: () => void;
  onSaveNameOnly: () => void;
  onUpdate: () => void;
  onSaveNew: () => void;
  onCancel: () => void;
};

export function ContactCard(props: Props) {
  const { fields, dial, copy, duplicate, error, canSave, canSaveNameOnly } = props;
  const dir = useDirection();

  const input = (label: string, value: string, onChange: (text: string) => void, extra: object = {}, prefix?: string) => (
    <View style={{ gap: 4 }}>
      <Text token="micro" color={ink.s4}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: dir.row,
          alignItems: 'center',
          gap: 6,
          height: 42,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: surface.line,
          borderRadius: 12,
          backgroundColor: surface.white,
        }}
      >
        {prefix ? (
          <Text token="bodyS" color={ink.s3} style={{ writingDirection: 'ltr' }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="—"
          placeholderTextColor={ink.s5}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: `${fontFamily}_400Regular`,
            fontSize: 15,
            color: ink.base,
            textAlign: dir.textAlign,
            writingDirection: dir.isRTL ? 'rtl' : 'ltr',
          }}
          {...extra}
        />
      </View>
    </View>
  );

  const button = (testID: string, label: string, onPress: () => void, kind: 'primary' | 'quiet', enabled = true) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      style={{
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: kind === 'primary' ? (enabled ? ink.solid : ink.disabledBtn) : surface.white,
        borderWidth: kind === 'primary' ? 0 : 1,
        borderColor: surface.line,
      }}
    >
      <Text token="bodyS" color={kind === 'primary' ? surface.white : ink.base} align="center">
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View testID="assistant-contact" style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, padding: 14, gap: 10, backgroundColor: surface.white }}>
      <View style={{ flexDirection: dir.row, gap: 10, alignItems: 'center' }}>
        <Icon name="users" size={18} strokeWidth={1.7} />
        <Text token="body" weight="600" style={{ flex: 1 }}>
          {fields.name || copy.fresh}
        </Text>
      </View>
      {input(copy.name, fields.name ?? '', (name) => props.onEdit({ name }), { testID: 'assistant-contact-name', autoCapitalize: 'words' })}
      {input(
        copy.phone,
        fields.phone ?? '',
        (phoneText) => props.onEdit({ phoneText }),
        { testID: 'assistant-contact-phone', keyboardType: 'phone-pad', textContentType: 'telephoneNumber' },
        dial
      )}
      {input(copy.email, fields.email ?? '', (email) => props.onEdit({ email }), {
        testID: 'assistant-contact-email',
        keyboardType: 'email-address',
        textContentType: 'emailAddress',
      })}
      {fields.role !== undefined
        ? input(copy.role, fields.role, (role) => props.onEdit({ role }), { testID: 'assistant-contact-role', autoCapitalize: 'sentences' })
        : null}
      {fields.address !== undefined
        ? input(copy.address, fields.address, (address) => props.onEdit({ address }), { testID: 'assistant-contact-address', autoCapitalize: 'sentences', autoCorrect: true })
        : null}
      {fields.guessedEmail ? (
        <Text token="micro" color={ink.s3}>
          {copy.guessed}
        </Text>
      ) : null}
      {error ? (
        <Text testID="assistant-contact-error" token="micro" color={status.invalid}>
          {error}
        </Text>
      ) : null}
      {duplicate ? (
        <View style={{ gap: 8 }}>
          {button('assistant-contact-update', copy.update.replace('{n}', duplicate.name), props.onUpdate, 'primary')}
          {button('assistant-contact-new', copy.saveNew, props.onSaveNew, 'quiet')}
          {button('assistant-contact-cancel', copy.cancel, props.onCancel, 'quiet')}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {button('assistant-contact-save', copy.save, props.onSave, 'primary', canSave)}
          {canSaveNameOnly ? button('assistant-contact-name-only', copy.nameOnly, props.onSaveNameOnly, 'quiet') : null}
          {button('assistant-contact-cancel', copy.cancel, props.onCancel, 'quiet')}
        </View>
      )}
    </View>
  );
}

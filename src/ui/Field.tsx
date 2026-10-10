/**
 * Text inputs. The design uses two heights: 58 pt with a 1.5 pt ink border for
 * the one field a screen is about (setup name, One Thing), and 52–54 pt with a
 * line border for form fields. SCREENS.md §§ 02, 05, 09.
 */
import { useState } from 'react';
import { TextInput, View, type KeyboardTypeOptions, type ViewStyle } from 'react-native';

import { Text } from './Text';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fontFamily, ink, radius, surface } from '@/design/tokens';

export type FieldProps = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** Small label above the field, 12/`ink-4`. */
  label?: string;
  /** `hero` is the 58 pt ink-bordered field; `form` is the 52 pt one. */
  size?: 'hero' | 'form';
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  /** Keeps the content left-to-right inside Arabic layout (phones, links). */
  forceLTR?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'go' | 'send';
  style?: ViewStyle;
  testID?: string;
};

export function Field({
  value,
  onChangeText,
  placeholder,
  label,
  size = 'form',
  keyboardType,
  autoFocus,
  multiline,
  numberOfLines = 3,
  forceLTR = false,
  onSubmitEditing,
  returnKeyType,
  style,
  testID,
}: FieldProps) {
  const { isRTL } = useLanguage();
  const [focused, setFocused] = useState(false);
  const hero = size === 'hero';

  const height = multiline ? undefined : hero ? 58 : 52;
  const borderColor = hero || focused ? ink.base : surface.line;

  return (
    <View style={style}>
      {label ? (
        <Text token="micro" color={ink.s4} weight="500" style={{ marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={ink.s5}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        style={{
          height,
          minHeight: multiline ? 24 * numberOfLines : undefined,
          borderWidth: 1.5,
          borderColor,
          borderRadius: hero ? radius.cardTight : radius.input,
          paddingHorizontal: 18,
          paddingVertical: multiline ? 14 : 0,
          fontSize: hero ? 18 : 16,
          fontFamily: `${fontFamily}_400Regular`,
          color: ink.base,
          backgroundColor: surface.white,
          textAlign: forceLTR ? 'left' : isRTL ? 'right' : 'left',
          textAlignVertical: multiline ? 'top' : 'center',
          writingDirection: forceLTR ? 'ltr' : isRTL ? 'rtl' : 'ltr',
        }}
      />
    </View>
  );
}

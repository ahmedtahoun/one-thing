/**
 * Consent checkbox: 22 × 22, radius 7. Off is a `#C9C9C5` border on white; on
 * is ink-filled with a white check. SCREENS.md § 01.
 */
import { Pressable, View } from 'react-native';

import { Icon } from './Icon';
import { useDirection } from '@/i18n/LanguageProvider';
import { ink, radius, surface } from '@/design/tokens';
import type { ReactNode } from 'react';

export function Checkbox({
  checked,
  onToggle,
  children,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  /** The label, which may contain tappable links. */
  children: ReactNode;
  testID?: string;
}) {
  const dir = useDirection();

  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      style={{ flexDirection: dir.row, gap: 12, alignItems: 'flex-start', paddingVertical: 4 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.checkbox,
          borderWidth: 1.5,
          borderColor: checked ? ink.base : surface.checkbox,
          backgroundColor: checked ? ink.base : surface.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={14} color={surface.white} strokeWidth={2.6} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

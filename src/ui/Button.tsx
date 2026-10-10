/**
 * Primary and secondary buttons: 56 pt tall, radius 28 (README § Radius).
 */
import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { Text } from './Text';
import { useDirection } from '@/i18n/LanguageProvider';
import { ink, radius, surface } from '@/design/tokens';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** `primary` is ink-filled; `outline` is white with a 1.5 pt border. */
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  /**
   * Dims to 45% but stays pressable — the sign-in buttons look disabled until
   * Terms are ticked, yet still respond so they can show the error.
   * SCREENS.md § 01.
   */
  dimmed?: boolean;
  loading?: boolean;
  /** Rendered before the label, in reading order. */
  icon?: ReactNode;
  style?: ViewStyle;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  dimmed = false,
  loading = false,
  icon,
  style,
  testID,
}: ButtonProps) {
  const dir = useDirection();
  const isPrimary = variant === 'primary';
  const bg = disabled ? ink.disabledBtn : isPrimary ? ink.base : surface.white;
  const fg = isPrimary || disabled ? surface.white : ink.base;

  return (
    <Pressable
      testID={testID}
      onPress={disabled || loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        {
          height: 56,
          borderRadius: radius.button,
          backgroundColor: bg,
          borderWidth: isPrimary || disabled ? 0 : 1.5,
          borderColor: surface.line,
          flexDirection: dir.row,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: dimmed ? 0.45 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text token="title" weight="500" color={fg} align="center">
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

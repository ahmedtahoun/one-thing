/**
 * Selectable pill. Unselected: white with a 1.5 pt line border. Selected:
 * `fill` with an ink border. SCREENS.md § 02.
 */
import { Pressable } from 'react-native';

import { Text } from './Text';
import { ink, MIN_TAP, radius, surface } from '@/design/tokens';

export function Chip({
  label,
  selected = false,
  onPress,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      // The visible pill is shorter than 44 pt, so the tap target is grown
      // with hitSlop rather than by changing the design.
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={{
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: selected ? ink.solid : surface.line,
        backgroundColor: selected ? surface.fill : surface.white,
      }}
    >
      <Text token="bodyS">{label}</Text>
    </Pressable>
  );
}

export const CHIP_MIN_TAP = MIN_TAP;

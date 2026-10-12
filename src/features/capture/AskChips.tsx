/**
 * The options under a question, as one wrapping row of pills. Tapping one is
 * the whole answer — nobody has to type to sort their own head out.
 */
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/Text';
import { ink, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import type { AskOption } from './ask';

export function AskChips({
  options,
  onPick,
  testID,
}: {
  options: readonly AskOption[];
  onPick: (option: AskOption) => void;
  testID?: string;
}) {
  const dir = useDirection();
  return (
    <View testID={testID} style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          testID={`ask-option-${option.key}`}
          onPress={() => onPick(option)}
          accessibilityRole="button"
          style={({ pressed }) => ({
            paddingVertical: 9,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: surface.line,
            backgroundColor: surface.white,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text token="caption" color={ink.base} numberOfLines={1}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

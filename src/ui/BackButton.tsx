/**
 * The chevron that goes back.
 *
 * Its height is a prop because the prototype's is not consistent: where the
 * button is `display: flex` the icon is 22 and the button is 34
 * (6 pt padding either side); where it is left as a block the icon sits in a
 * line box and the button comes out 40. Both appear, so both are available,
 * and a screen says which it is matching rather than inheriting a number.
 *
 * The chevron is a glyph, so it mirrors in Arabic — unlike layout, which the
 * writing direction on the root already handles.
 */
import { Pressable, View } from 'react-native';

import { Icon } from './Icon';
import { ink } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export function BackButton({
  onPress,
  /** 40 where the prototype leaves the button a block, 34 where it flexes it. */
  height = 40,
  color = ink.base,
  testID,
}: {
  onPress: () => void;
  height?: number;
  color?: string;
  testID?: string;
}) {
  const { a11y } = useLanguage();
  const dir = useDirection();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y.back}
      hitSlop={10}
      style={{ height, justifyContent: 'center', alignSelf: 'flex-start' }}
    >
      <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
        <Icon name="back" size={22} color={color} strokeWidth={1.7} />
      </View>
    </Pressable>
  );
}

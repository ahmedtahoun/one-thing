/**
 * The frame every screen sits in: a 54 pt status-bar spacer, the screen
 * background, and the active writing direction. README § Spacing.
 */
import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';

import { useLanguage } from '@/i18n/LanguageProvider';
import { space, surface } from '@/design/tokens';

export type ScreenProps = {
  children: ReactNode;
  /** `white` for most screens, `grouped` for Settings and Contact profile. */
  background?: 'white' | 'grouped' | string;
  /** 20 by default; 24 on onboarding, sign-in and paywall-style screens. */
  paddingX?: number;
  /** Bottom padding; 150 under the tab bar. */
  paddingBottom?: number;
  /** Top padding below the status-bar spacer. */
  paddingTop?: number;
  scroll?: boolean;
  /** Applied to the content container, so `gap` spaces the screen's sections. */
  style?: ViewStyle;
};

export function Screen({
  children,
  background = 'white',
  paddingX = space.screenX,
  paddingBottom = 40,
  paddingTop = 0,
  scroll = false,
  style,
}: ScreenProps) {
  const { dir } = useLanguage();
  const backgroundColor =
    background === 'white' ? surface.white : background === 'grouped' ? surface.fill2 : background;

  const inner: ViewStyle = {
    paddingHorizontal: paddingX,
    paddingBottom,
    paddingTop,
    flexGrow: 1,
    ...style,
  };

  return (
    <View style={{ flex: 1, backgroundColor, direction: dir }}>
      <View style={{ height: space.statusBar }} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={inner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={inner}>{children}</View>
      )}
    </View>
  );
}

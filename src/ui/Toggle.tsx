/**
 * The 44 × 26 switch on Settings: a 20 pt white knob that slides 18 pt
 * (SCREENS.md § 21). Drawn, not the platform Switch, because the design's is
 * exact and identical on both platforms.
 *
 * The knob slides toward the writing direction's end edge, as the
 * prototype's does (`translateX(-18px)` in Arabic).
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { ink, motion, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

export function Toggle({ on, offColour = surface.trackOff }: { on: boolean; offColour?: string }) {
  const { isRTL } = useDirection();
  const anim = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: on ? 1 : 0,
      duration: motion.toggle,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: false,
    }).start();
  }, [on, anim]);

  return (
    <Animated.View
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        paddingHorizontal: 3,
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: [offColour, ink.base] }),
      }}
    >
      <Animated.View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: surface.white,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
          // Layout already starts the knob at the start edge in either
          // direction; the slide is a physical translate, so it flips sign.
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, isRTL ? -18 : 18] }) }],
        }}
      />
    </Animated.View>
  );
}


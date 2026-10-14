/**
 * The listening state's two animations, from the prototype's keyframes:
 * `otPulse` (a ring growing from the orb, 1.6 s, scale 1 → 1.9, opacity
 * .35 → 0) and `otBar` (nine 4 × 36 bars breathing between 30 % and full
 * height, each at its own speed and delay).
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { ink } from '@/design/tokens';

export function Pulse() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 60,
        backgroundColor: ink.solid,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
      }}
    />
  );
}

function Bar({ index }: { index: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const half = ((0.7 + (index % 3) * 0.2) * 1000) / 2;
    const ease = Easing.inOut(Easing.ease);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: half, easing: ease, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: half, easing: ease, useNativeDriver: true }),
      ])
    );
    const start = setTimeout(() => loop.start(), index * 80);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [t, index]);
  return (
    <Animated.View
      style={{
        width: 4,
        height: 36,
        borderRadius: 2,
        backgroundColor: ink.solid,
        transform: [{ scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
      }}
    />
  );
}

export function Bars() {
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', height: 36 }}>
      {Array.from({ length: 9 }, (_, i) => (
        <Bar key={i} index={i} />
      ))}
    </View>
  );
}

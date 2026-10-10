/**
 * The 260 pt progress ring on the Focus screen. SCREENS.md § 15.
 *
 * The prototype draws it with `filter: invert(1)` over the ink background —
 * an ink track on white becomes a white track on ink. React Native has no CSS
 * filters, so the inverted colours are written out: the track is the light
 * grey the prototype inverts to, and the progress arc is white.
 */
import { Animated, Easing, View } from 'react-native';
import { Circle, Defs, RadialGradient, Stop, Svg } from 'react-native-svg';
import { useEffect, useRef } from 'react';

import { LTRText, Text } from '@/ui/Text';
import { ink, surface } from '@/design/tokens';

const SIZE = 260;
const RADIUS = 118;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The glow reaches 34 pt past the ring on every side. */
const GLOW = SIZE + 68;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function RingTimer({
  /** 0 at the start of the session, 1 at the end. */
  progress,
  /** "23:10". */
  timeLeft,
  label,
  running,
}: {
  progress: number;
  timeLeft: string;
  label: string;
  running: boolean;
}) {
  // "breathing glow while running" — a slow pulse behind the ring.
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!running) {
      breath.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [running, breath]);

  return (
    <View style={{ width: SIZE, height: SIZE, marginTop: 12, alignItems: 'center', justifyContent: 'center' }}>
      {/* The prototype's glow is a radial gradient, inset 34 beyond the
          ring: black at 16% fading out by 62%, which its `invert(1)` turns
          white. No CSS filters here, so it is written out inverted. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: GLOW,
          height: GLOW,
          opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }],
        }}
      >
        <Svg width={GLOW} height={GLOW}>
          <Defs>
            <RadialGradient id="focusGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.16} />
              <Stop offset="62%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#focusGlow)" />
        </Svg>
      </Animated.View>

      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={130} cy={130} r={RADIUS} fill="none" stroke="#131317" strokeWidth={3} />
        <AnimatedCircle
          cx={130}
          cy={130}
          r={RADIUS}
          fill="none"
          stroke={surface.white}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))}
        />
      </Svg>

      <View style={{ position: 'absolute', alignItems: 'center', gap: 2 }}>
        <LTRText
          token="display"
          size={56}
          lh={84}
          weight="500"
          color={surface.white}
          tabular
          align="center"
          testID="focus-time"
          style={{ letterSpacing: 1.12 }}
        >
          {timeLeft}
        </LTRText>
        <Text token="caption" color={ink.s4} align="center">
          {label}
        </Text>
      </View>
    </View>
  );
}

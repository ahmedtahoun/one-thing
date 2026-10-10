/**
 * Apple and Google marks for the sign-in buttons.
 *
 * Path data is from the handoff's source/app-content.js → BRAND_IC, which used
 * React DOM elements; it is the same geometry here, drawn with react-native-svg.
 * Both buttons must follow their owner's sign-in button guidelines: the Apple
 * mark is white on the ink button, and the Google mark keeps its four brand
 * colours on a white button (README § Icons).
 */
import { View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

export function AppleMark({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8s2.3-1.3 3.1-2.5c1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"
      />
    </Svg>
  );
}

export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1C3.4 21.4 7.4 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5h-4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1c.9-2.8 3.5-4.8 6.6-4.8z"
      />
    </Svg>
  );
}

/**
 * The logo mark: a 64 circle with a 1.5 pt ink border, a 36 inner ring, and an
 * 11 dot (SCREENS.md § 01). Plain views rather than SVG — it is three
 * concentric circles, and borders describe it exactly.
 */
export function LogoMark({ size = 64, color = '#0B0B0B' }: { size?: number; color?: string }) {
  const ring = size * (36 / 64);
  const dot = size * (11 / 64);
  const centre = { alignItems: 'center', justifyContent: 'center' } as const;

  return (
    <View
      style={[
        centre,
        { width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color },
      ]}
    >
      <View
        style={[
          centre,
          { width: ring, height: ring, borderRadius: ring / 2, borderWidth: 1.5, borderColor: color },
        ]}
      >
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />
      </View>
    </View>
  );
}

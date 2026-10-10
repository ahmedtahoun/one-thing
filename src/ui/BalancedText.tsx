/**
 * `text-wrap: balance` for React Native.
 *
 * README § Typography asks for balanced wrapping on big titles ("or platform
 * equivalent"). CSS does it for free; React Native has no equivalent, and
 * without it a hero title breaks as "Your day, under / control." where the
 * design reads "Your day, / under control."
 *
 * The emulation is the same idea CSS uses: keep the line count the text
 * naturally takes, then narrow the box as far as it can go without adding a
 * line. The result is lines of roughly equal length. Measurement happens in
 * two passes, so the first frame renders unbalanced and settles immediately
 * after — which is why it is only used on headings, never on body copy.
 */
import { useCallback, useRef, useState } from 'react';
import { View, type LayoutChangeEvent, type NativeSyntheticEvent, type TextLayoutEventData } from 'react-native';

import { Text, type AppTextProps } from './Text';

/** Narrowing stops here; past it, balancing starts to look like a mistake. */
const MIN_WIDTH_RATIO = 0.55;

/** How finely the width is searched, as a fraction of the full width. */
const STEP_RATIO = 0.04;

export function BalancedText({ children, ...textProps }: AppTextProps) {
  const [fullWidth, setFullWidth] = useState<number | null>(null);
  const [maxWidth, setMaxWidth] = useState<number | null>(null);

  // The line count at full width, which balancing must not change.
  const targetLines = useRef<number | null>(null);
  const settled = useRef(false);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setFullWidth((current) => (current === null ? w : current));
  }, []);

  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (settled.current || fullWidth === null) return;
      const lines = e.nativeEvent.lines.length;

      // First measurement: a single line is already balanced.
      if (targetLines.current === null) {
        targetLines.current = lines;
        if (lines <= 1) {
          settled.current = true;
          return;
        }
        setMaxWidth(fullWidth * (1 - STEP_RATIO));
        return;
      }

      // Too narrow now — step back to the last width that held the line count.
      if (lines > targetLines.current) {
        settled.current = true;
        setMaxWidth((w) => (w === null ? null : w + fullWidth * STEP_RATIO));
        return;
      }

      const next = (maxWidth ?? fullWidth) - fullWidth * STEP_RATIO;
      if (next < fullWidth * MIN_WIDTH_RATIO) {
        settled.current = true;
        return;
      }
      setMaxWidth(next);
    },
    [fullWidth, maxWidth]
  );

  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      <Text
        {...textProps}
        onTextLayout={onTextLayout}
        style={[maxWidth !== null ? { maxWidth } : null, textProps.style]}
      >
        {children}
      </Text>
    </View>
  );
}

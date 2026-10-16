/**
 * The tour: the screen dimmed, one control left bright, an arrow and a box
 * of text.
 *
 * The dimming is four rectangles around the control rather than one view
 * with a hole in it — React Native has no cut-out, and four plain views
 * need no mask, no SVG and no blend mode, so it behaves the same on both
 * phones and in the web harness.
 *
 * Where the box goes and which way the arrow points is arithmetic, and it
 * lives in `./geometry.ts` where it is tested against the awkward cases: a
 * control at the bottom of the screen, one in a corner, one on a phone
 * narrower than the box.
 *
 * Tapping anywhere advances, which is what people try first. The explicit
 * buttons are there for everyone else.
 */
import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { added } from '@/content/additions';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { Text } from '@/ui/Text';
import { useCoachAnchors } from './CoachProvider';
import { highlight, place } from './geometry';
import { shouldRun, visibleSteps } from './steps';

const SCRIM = 'rgba(11, 11, 11, 0.62)';
const PAD = 8;
const ARROW = 9;

/**
 * The bubble has to read against whatever is behind it, and what is behind
 * it is not always the dimmed screen: the mark on the mic sits over the
 * *bright* tab bar, where a white box on a white bar disappears and the
 * arrow with it. The same shadow the tab bar and the country list use.
 */
const LIFT = {
  shadowColor: 'rgba(20,20,18,1)',
  shadowOpacity: 0.18,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 12,
} as const;

/**
 * The screen, then the control's rounded rectangle wound the other way, so
 * an even-odd fill leaves the control clear. `a` draws each corner.
 */
function cutOut(screen: { width: number; height: number }, hole: { x: number; y: number; width: number; height: number }, r: number): string {
  const radius = Math.min(r, hole.width / 2, hole.height / 2);
  const { x, y, width: w, height: h } = hole;
  const outer = `M0 0 H${screen.width} V${screen.height} H0 Z`;
  const inner =
    `M${x + radius} ${y} H${x + w - radius} A${radius} ${radius} 0 0 1 ${x + w} ${y + radius}` +
    ` V${y + h - radius} A${radius} ${radius} 0 0 1 ${x + w - radius} ${y + h}` +
    ` H${x + radius} A${radius} ${radius} 0 0 1 ${x} ${y + h - radius}` +
    ` V${y + radius} A${radius} ${radius} 0 0 1 ${x + radius} ${y} Z`;
  return `${outer} ${inner}`;
}

export function CoachMarks({ onboarded, seen, onDone }: { onboarded: boolean; seen: boolean; onDone: () => void }) {
  const { lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).coach;
  const anchors = useCoachAnchors();
  const screen = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const steps = visibleSteps(anchors);
  if (!shouldRun(onboarded, seen, steps.length)) return null;

  const step = steps[Math.min(index, steps.length - 1)]!;
  const anchor = anchors[step.anchor]!;
  const last = index >= steps.length - 1;

  const hole = highlight(anchor, screen, PAD);
  const spot = place(anchor, screen, { bubbleWidth: 320, bubbleHeight: 132, gap: 14, margin: 16, arrowHalf: ARROW });

  const advance = () => (last ? onDone() : setIndex(index + 1));

  // A round control gets a round hole; everything else a rounded rectangle.
  const round = Math.abs(hole.width - hole.height) < 12;
  const hollow = round ? Math.min(hole.width, hole.height) / 2 : 20;

  return (
    <View testID="coach" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* One path, filled even-odd: the whole screen minus the control. A
          real cut-out rather than four panels around a gap, which matters
          for more than the rounded corners — a gap lets the tap through to
          the control underneath, so tapping the spotlit "Lock In" during
          the tour would start a focus session. Here every tap lands on the
          overlay and moves the tour on. */}
      <Pressable testID="coach-advance" onPress={advance} accessibilityRole="button" accessibilityLabel={copy.next} style={{ flex: 1 }}>
        <Svg width={screen.width} height={screen.height}>
          <Path d={cutOut(screen, hole, hollow)} fill={SCRIM} fillRule="evenodd" />
        </Svg>
      </Pressable>

      {/* A ring, so the bright patch reads as chosen rather than as a hole. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: hole.y,
          left: hole.x,
          width: hole.width,
          height: hole.height,
          borderRadius: hollow,
          borderWidth: 2,
          borderColor: surface.white,
        }}
      />

      <View
        testID={`coach-bubble-${step.copy}`}
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          ...(spot.from === 'top' ? { top: spot.offset } : { bottom: spot.offset }),
          left: spot.left,
          width: spot.width,
        }}
      >
        {spot.arrow === 'up' ? <Arrow pointing="up" offset={spot.arrowOffset} /> : null}
        <View style={{ backgroundColor: surface.white, borderRadius: 18, padding: 16, gap: 10, ...LIFT }}>
          <Text token="body" weight="600" style={{ textAlign: dir.textAlign }}>
            {copy.steps[step.copy].title}
          </Text>
          <Text token="bodyS" color={ink.s3} style={{ textAlign: dir.textAlign }}>
            {copy.steps[step.copy].body}
          </Text>
          <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
            <Pressable testID="coach-skip" onPress={onDone} accessibilityRole="button" hitSlop={8}>
              <Text token="caption" color={ink.s4}>
                {copy.skip}
              </Text>
            </Pressable>
            <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12 }}>
              <Text token="caption" color={ink.s5} testID="coach-count">
                {`${index + 1}/${steps.length}`}
              </Text>
              <Pressable
                testID="coach-next"
                onPress={advance}
                accessibilityRole="button"
                style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: ink.base }}
              >
                <Text token="caption" weight="600" color={surface.white}>
                  {last ? copy.done : copy.next}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        {spot.arrow === 'down' ? <Arrow pointing="down" offset={spot.arrowOffset} /> : null}
      </View>
    </View>
  );
}

/**
 * A triangle, drawn as a square turned 45° with half of it hidden behind
 * the bubble — React Native has no polygon, and a border trick cannot take
 * the bubble's own background colour on both phones.
 */
function Arrow({ pointing, offset }: { pointing: 'up' | 'down'; offset: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: offset - ARROW,
        ...(pointing === 'up' ? { top: -ARROW + 1 } : { bottom: -ARROW + 1 }),
        width: ARROW * 2,
        height: ARROW * 2,
        backgroundColor: surface.white,
        transform: [{ rotate: '45deg' }],
        borderRadius: 3,
        ...LIFT,
      }}
    />
  );
}

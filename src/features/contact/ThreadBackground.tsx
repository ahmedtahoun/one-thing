/**
 * The wallpaper behind a person's thread: a warm ground with the app's own
 * small marks (a phone, a chat, a bell, a tick) scattered faintly, tiled so it
 * never repeats in a way the eye catches. The colours are tokens, so it turns
 * into a deep blue-black in dark mode like the rest of the app.
 */
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';

import { ICONS, type IconPart } from '@/design/icon-paths';
import { surface } from '@/design/tokens';

/** Where each mark sits in a 168 pt tile: icon, x, y, turn in degrees, size. */
const MARKS: [keyof typeof ICONS, number, number, number, number][] = [
  ['msg', 14, 12, -12, 22],
  ['phone', 92, 20, 14, 20],
  ['bell', 56, 62, 8, 20],
  ['mail', 126, 78, -10, 22],
  ['star', 10, 104, 16, 18],
  ['check', 80, 118, -8, 18],
  ['clock', 134, 136, 12, 18],
  ['note', 40, 144, -14, 18],
];

function Mark({ name, x, y, turn, size, stroke }: { name: keyof typeof ICONS; x: number; y: number; turn: number; size: number; stroke: string }) {
  const parts = ICONS[name] as readonly IconPart[];
  const scale = size / 24;
  const common = { stroke, fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <G transform={`translate(${x} ${y}) rotate(${turn} ${size / 2} ${size / 2}) scale(${scale})`}>
      {parts.map((part, i) => {
        if (part[0] === 'path') return <Path key={i} d={part[1]} {...common} />;
        if (part[0] === 'circle') return <Circle key={i} {...part[1]} {...common} />;
        if (part[0] === 'rect') return <Rect key={i} {...part[1]} {...common} />;
        return <Line key={i} {...part[1]} {...common} />;
      })}
    </G>
  );
}

export function ThreadBackground() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: surface.thread }}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="thread-marks" x="0" y="0" width="168" height="168" patternUnits="userSpaceOnUse">
            {MARKS.map(([name, x, y, turn, size]) => (
              <Mark key={name} name={name} x={x} y={y} turn={turn} size={size} stroke={surface.threadMark} />
            ))}
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#thread-marks)" />
      </Svg>
    </View>
  );
}

/**
 * Line icons, drawn from the handoff's exact path data.
 * 24-unit viewBox, round caps and joins, stroke 1.7–2.2 (README § Icons).
 */
import { Circle, Line, Path, Rect, Svg } from 'react-native-svg';

import { ICONS, type IconName, type IconPart } from '@/design/icon-paths';
import { EXTRA_ICONS } from '@/design/icons-extra';
import { ink } from '@/design/tokens';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** README gives 1.7 for inactive tabs, 2 for active, up to 2.2 for emphasis. */
  strokeWidth?: number;
  /** Solid-filled marks (e.g. a filled dot) rather than stroked ones. */
  filled?: boolean;
};

export function Icon({ name, size = 20, color = ink.base, strokeWidth = 1.8, filled = false }: IconProps) {
  const parts = ICONS[name] ?? EXTRA_ICONS[name];
  if (!parts) return null;

  const stroke = filled ? 'none' : color;
  const fill = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {parts.map((part: IconPart, i) => {
        const common = {
          stroke,
          fill,
          strokeWidth,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
        };
        if (part[0] === 'path') return <Path key={i} d={part[1]} {...common} />;
        if (part[0] === 'circle') return <Circle key={i} {...part[1]} {...common} />;
        if (part[0] === 'rect') return <Rect key={i} {...part[1]} {...common} />;
        return <Line key={i} {...part[1]} {...common} />;
      })}
    </Svg>
  );
}

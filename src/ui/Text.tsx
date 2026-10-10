/**
 * Typography. One component per README type token, so sizes and weights can
 * never drift from the scale.
 */
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useLanguage } from '@/i18n/LanguageProvider';
import { fontFamily, ink, type as scale } from '@/design/tokens';

type Token = keyof typeof scale;

export type AppTextProps = TextProps & {
  /** A token from the README type scale. Defaults to `body`. */
  token?: Token;
  /** Overrides the token's weight — e.g. a 15/500 list title. */
  weight?: '400' | '500' | '600' | '700';
  color?: string;
  align?: TextStyle['textAlign'];
  /** Tabular figures, for anything that counts or ticks. */
  tabular?: boolean;
};

/** Maps a weight to the matching IBM Plex Sans Arabic family name. */
const FAMILY: Record<string, string> = {
  '400': `${fontFamily}_400Regular`,
  '500': `${fontFamily}_500Medium`,
  '600': `${fontFamily}_600SemiBold`,
  '700': `${fontFamily}_700Bold`,
};

export function Text({
  token = 'body',
  weight,
  color = ink.base,
  align,
  tabular,
  style,
  ...rest
}: AppTextProps) {
  const { isRTL } = useLanguage();
  const t = scale[token];
  const w = weight ?? t.weight;

  return (
    <RNText
      style={[
        {
          fontFamily: FAMILY[w] ?? FAMILY['400'],
          fontSize: t.size,
          lineHeight: t.lh,
          color,
          textAlign: align ?? (isRTL ? 'right' : 'left'),
          writingDirection: isRTL ? 'rtl' : 'ltr',
          ...('tracking' in t ? { letterSpacing: (t as { tracking: number }).tracking } : null),
          ...(tabular ? { fontVariant: ['tabular-nums' as const] } : null),
        },
        style,
      ]}
      {...rest}
    />
  );
}

/**
 * An island that stays left-to-right inside Arabic layout: phone numbers,
 * times, prices and links. README § RTL / Arabic.
 */
export function LTRText(props: AppTextProps) {
  return <Text {...props} align={props.align ?? 'left'} style={[{ writingDirection: 'ltr' }, props.style]} />;
}

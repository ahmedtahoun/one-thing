/**
 * Typography. One component per README type token, so sizes and weights can
 * never drift from the scale.
 */
import { Platform, StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useLanguage } from '@/i18n/LanguageProvider';
import { fontFamily, ink, naturalLineHeight, type as scale } from '@/design/tokens';

type Token = keyof typeof scale;

export type AppTextProps = TextProps & {
  /** A token from the README type scale. Defaults to `body`. */
  token?: Token;
  /** Overrides the token's size; the line height follows the font's metrics. */
  size?: number;
  /**
   * An explicit line height, for the few elements where the prototype sets
   * one. Leave it alone otherwise: the token already carries the font's own
   * line height, which is what the prototype renders everywhere else.
   */
  lh?: number;
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

/**
 * React Native on a phone swaps a text's 'left' and 'right' when the layout
 * around it is right-to-left (RCTAttributedTextUtils.mm on iOS,
 * TextAttributeProps on Android). The web does not. Every alignment here is
 * written as the side it should land on, as the web shows it, so on a phone
 * in Arabic it is swapped first and the platform's swap puts it back. Without
 * this, every line of Arabic sat against the left edge on the iPhone.
 */
const SWAPS = Platform.OS !== 'web';

const ARABIC = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;
/** A line with English in it and no Arabic: a name, a role, an email. */
const allLatin = (children: unknown): boolean => {
  const text = typeof children === 'string' ? children : Array.isArray(children) && children.every((c) => typeof c === 'string' || typeof c === 'number') ? children.join('') : null;
  return text !== null && LATIN.test(text) && !ARABIC.test(text);
};
const onScreen = (align: TextStyle['textAlign'], isRTL: boolean): TextStyle['textAlign'] =>
  SWAPS && isRTL ? (align === 'right' ? 'left' : align === 'left' ? 'right' : align) : align;

export function Text({
  token = 'body',
  size,
  lh,
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
  const fontSize = size ?? t.size;
  const lineHeight = lh ?? (size === undefined ? t.lh : naturalLineHeight(size));

  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const asked = flat?.textAlign;
  const spaced = isRTL && (flat?.letterSpacing ?? 0) > 0;

  return (
    <RNText
      style={[
        {
          fontFamily: FAMILY[w] ?? FAMILY['400'],
          fontSize,
          lineHeight,
          color,
          textAlign: onScreen(align ?? (isRTL ? 'right' : 'left'), isRTL),
          // English inside the Arabic layout still reads left to right — "+20… · Manager · @co" keeps its
          // order — while it sits on the Arabic side of the line.
          writingDirection: isRTL && !allLatin(rest.children) ? 'rtl' : 'ltr',
          // Spacing letters apart breaks Arabic's joined script ("ا لمسا"), so Arabic gets none.
          ...('tracking' in t && !isRTL ? { letterSpacing: (t as { tracking: number }).tracking } : null),
          ...(tabular ? { fontVariant: ['tabular-nums' as const] } : null),
        },
        style,
        asked ? { textAlign: onScreen(asked, isRTL) } : null,
        spaced ? { letterSpacing: 0 } : null,
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

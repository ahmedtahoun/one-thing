/**
 * The building blocks of Settings: the white grouped card, the accordion
 * row and its panel, segmented pickers, switch rows and link rows.
 * SCREENS.md § 21–23; measurements are the prototype's.
 *
 * Every row in a card draws its own 1 pt bottom rule (`line-soft`), as the
 * prototype does — the last row of a card passes `last` to drop it.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { ForwardChevron } from '@/ui/ForwardChevron';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { type IconName } from '@/design/icon-paths';
import { ink, motion, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

const rule = { borderBottomWidth: 1, borderBottomColor: surface.lineSoft } as const;

/** White, radius 16, clipped — the two grouped cards. */
export function SettingsCard({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: surface.white, borderRadius: 16, overflow: 'hidden' }}>{children}</View>;
}

/** A 32 pt rounded tile holding a 17 pt icon, at the start of a row. */
export function RowTile({ icon, bg, fg }: { icon: IconName; bg: string; fg: string }) {
  return (
    <View
      style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} size={17} color={fg} strokeWidth={2} />
    </View>
  );
}

/**
 * One accordion heading: tile, label, the current value, and a chevron that
 * turns over when the panel is open. Only one panel is open at a time; the
 * screen owns which.
 */
export function AccordionRow({
  testID,
  tile,
  label,
  value,
  open,
  onToggle,
  last = false,
}: {
  testID?: string;
  tile: ReactNode;
  label: string;
  value?: string;
  open: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  const dir = useDirection();
  const turn = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(turn, {
      toValue: open ? 1 : 0,
      duration: motion.toggle,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
  }, [open, turn]);

  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 12,
        paddingVertical: 15,
        paddingHorizontal: 16,
        backgroundColor: surface.white,
        ...(last ? null : rule),
      }}
    >
      {tile}
      <Text token="body" style={{ flex: 1 }}>
        {label}
      </Text>
      {value ? (
        <Text token="caption" color={ink.s4} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <Animated.View
        style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}
      >
        <Icon name="chev" size={16} color={ink.s6} strokeWidth={2} />
      </Animated.View>
    </Pressable>
  );
}

/** The tinted body under an open accordion row. */
export function AccordionPanel({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: surface.accordionOpen, ...rule }}>{children}</View>;
}

/**
 * A segmented control on the `fill` track: 3 pt inset, 36 pt segments,
 * white with a soft shadow when selected.
 */
export function Segmented<K extends string | number>({
  options,
  value,
  onPick,
  testID,
}: {
  options: { key: K; label: string }[];
  value: K;
  onPick: (key: K) => void;
  testID?: string;
}) {
  const dir = useDirection();
  return (
    <View
      style={{ flexDirection: dir.row, backgroundColor: surface.fill, borderRadius: 12, padding: 3, gap: 3 }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={String(o.key)}
            testID={testID ? `${testID}-${o.key}` : undefined}
            onPress={() => onPick(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? surface.white : 'transparent',
              ...(on
                ? {
                    shadowColor: '#000',
                    shadowOpacity: 0.12,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }
                : null),
            }}
          >
            <Text token="bodyS" align="center">
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A label (and optional second line) with a switch at the end. */
export function ToggleRow({
  testID,
  label,
  sub,
  on,
  onToggle,
  lead,
  offColour,
  last = false,
}: {
  testID?: string;
  label: string;
  sub?: string;
  on: boolean;
  onToggle: () => void;
  lead?: ReactNode;
  offColour?: string;
  last?: boolean;
}) {
  const dir = useDirection();
  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        ...(last ? null : rule),
      }}
    >
      {lead}
      <View style={{ flex: 1, gap: 2 }}>
        <Text token="body">{label}</Text>
        {sub ? (
          <Text token="micro" color={ink.s4}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Toggle on={on} offColour={offColour} />
    </Pressable>
  );
}

/** A tappable row that leads somewhere: label, optional extras, chevron. */
export function LinkRow({
  testID,
  label,
  onPress,
  last = false,
  background,
}: {
  testID?: string;
  label: string;
  onPress: () => void;
  last?: boolean;
  background?: string;
}) {
  const dir = useDirection();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: background,
        ...(last ? null : rule),
      }}
    >
      <Text token="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <ForwardChevron />
    </Pressable>
  );
}

export { rule as rowRule };

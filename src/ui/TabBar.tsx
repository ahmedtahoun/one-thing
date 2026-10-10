/**
 * The glass tab bar: Today · Tasks · [mic] · Follow-ups · People.
 * README § Elevation and SCREENS.md § Main tabs.
 *
 * Floats 24 pt above the bottom, inset 16 pt either side, 64 pt tall at
 * radius 32, over a white fade. The active tab is a frosted white pill; the
 * mic orb is raised 26 pt above the bar. Tapping the orb opens Quick capture,
 * holding it for 450 ms opens Brain dump.
 */
import { useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon } from './Icon';
import { Text } from './Text';
import { type IconName } from '@/design/icon-paths';
import { ink, motion, surface } from '@/design/tokens';
import { useLanguage } from '@/i18n/LanguageProvider';

export type TabKey = 'today' | 'tasks' | 'followups' | 'people';

/** Left pair, then the orb, then the right pair — the design's order. */
const LEFT: { key: TabKey; icon: IconName; labelIndex: number }[] = [
  { key: 'today', icon: 'home', labelIndex: 0 },
  { key: 'tasks', icon: 'list', labelIndex: 1 },
];
const RIGHT: { key: TabKey; icon: IconName; labelIndex: number }[] = [
  { key: 'followups', icon: 'loop', labelIndex: 2 },
  { key: 'people', icon: 'users', labelIndex: 3 },
];

const INACTIVE = '#9A9A96';

export function TabBar({
  active,
  onSelect,
  onCapture,
  onBrainDump,
}: {
  active: TabKey;
  onSelect: (key: TabKey) => void;
  /** Tap the orb. */
  onCapture: () => void;
  /** Hold the orb for 450 ms. */
  onBrainDump: () => void;
}) {
  const { t, dir } = useLanguage();

  return (
    <>
      {/* White fade so content scrolling under the bar stays legible. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }}
      />

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 24,
          height: 64,
          // The bar sits outside <Screen>, so it carries the writing
          // direction itself. With that set, the row below mirrors on its
          // own and the tab order must not also be reversed.
          direction: dir,
          borderRadius: 32,
          overflow: 'visible',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.7)',
          shadowColor: 'rgba(20,20,18,1)',
          shadowOpacity: 0.14,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        }}
      >
        <BlurView
          intensity={Platform.OS === 'android' ? 40 : 22}
          tint="light"
          style={{
            ...FILL,
            borderRadius: 32,
            overflow: 'hidden',
            backgroundColor: 'rgba(250,250,248,0.55)',
          }}
        />

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 6,
          }}
        >
          {LEFT.map((tab) => (
            <Tab
              key={tab.key}
              icon={tab.icon}
              label={t.tabs[tab.labelIndex] ?? ''}
              active={active === tab.key}
              onPress={() => onSelect(tab.key)}
            />
          ))}

          <View style={{ width: 76, alignItems: 'center' }}>
            <MicOrb onCapture={onCapture} onBrainDump={onBrainDump} />
          </View>

          {RIGHT.map((tab) => (
            <Tab
              key={tab.key}
              icon={tab.icon}
              label={t.tabs[tab.labelIndex] ?? ''}
              active={active === tab.key}
              onPress={() => onSelect(tab.key)}
            />
          ))}
        </View>
      </View>
    </>
  );
}

function Tab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`tab-${label}`}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flex: 1,
        height: 52,
        marginHorizontal: 2,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        backgroundColor: active ? 'rgba(255,255,255,0.85)' : 'transparent',
        shadowColor: '#000',
        shadowOpacity: active ? 0.08 : 0,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Icon name={icon} size={22} color={active ? ink.base : INACTIVE} strokeWidth={active ? 2 : 1.7} />
      <Text
        token="tab"
        weight={active ? '600' : '500'}
        color={active ? ink.base : INACTIVE}
        numberOfLines={1}
        align="center"
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The raised mic: tap to capture, hold to brain-dump. */
function MicOrb({ onCapture, onBrainDump }: { onCapture: () => void; onBrainDump: () => void }) {
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { a11y } = useLanguage();

  const start = () => {
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      onBrainDump();
    }, motion.micHold);
  };

  const end = () => {
    if (timer.current) clearTimeout(timer.current);
    // A hold has already opened Brain dump; only a short press captures.
    if (!held.current) onCapture();
  };

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    held.current = false;
  };

  return (
    <Pressable
      testID="mic-orb"
      onPressIn={start}
      onPressOut={end}
      onTouchCancel={cancel}
      accessibilityRole="button"
      accessibilityLabel={a11y.capture}
      accessibilityHint={a11y.brainDump}
      style={({ pressed }) => ({
        width: 60,
        height: 60,
        marginTop: -26,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#141413',
        // The design's rings are spread shadows, not borders — a border would
        // eat 5 pt off the orb instead of sitting outside it.
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      {/* The white ring the design draws around the orb. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -5,
          left: -5,
          right: -5,
          bottom: -5,
          borderRadius: 35,
          borderWidth: 5,
          borderColor: 'rgba(255,255,255,0.75)',
        }}
      />
      {/* The orb's lit top-left, as a radial gradient would give on the web. */}
      <LinearGradient
        colors={['#4A4A47', '#141413', '#000000']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.25, y: 0.15 }}
        end={{ x: 0.85, y: 1 }}
        style={{ ...FILL, borderRadius: 30 }}
      />
      <View style={{ zIndex: 1 }}>
        <Icon name="mic" size={22} color={surface.white} strokeWidth={1.9} />
      </View>
    </Pressable>
  );
}

const FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

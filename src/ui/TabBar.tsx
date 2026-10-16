/**
 * The glass tab bar: People · Today · [mic] · Assistant.
 * README § Elevation and SCREENS.md § Main tabs.
 *
 * Floats 24 pt above the bottom, inset 16 pt either side, 64 pt tall at
 * radius 32, over a white fade. The active tab is a frosted white pill; the
 * mic orb is raised 26 pt above the bar. Tapping the orb opens Quick capture,
 * holding it for 450 ms opens Brain dump.
 */
import { useRef, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useCoachAnchor } from '@/features/coach/CoachProvider';

import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Text } from './Text';
import { type IconName } from '@/design/icon-paths';
import { ink, motion, status, surface } from '@/design/tokens';
import { added } from '@/content/additions';
import { useLanguage } from '@/i18n/LanguageProvider';
import { buildNext } from '@/features/next/build';
import { useCadence } from '@/lib/cadence';
import { useFavorites } from '@/lib/favorites';
import { followUpStatus } from '@/lib/model-types';
import { useHiddenCards } from '@/lib/next-state';
import { usePeople } from '@/lib/people';
import { ME_PHOTO } from '@/lib/photos';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';

/**
 * People leads: it is where the person you need is, and where follow-ups now
 * live. The Assistant is a place to go, not a tab you stay on, so it is never
 * the active one — it opens its own full-screen chat.
 */
export type TabKey = 'people' | 'today' | 'assistant' | 'settings';

/** `t.tabs` is Today, Tasks, Follow-ups, People; the Assistant's name is `t.asst`. Tasks and Follow-ups no longer have tabs: they live on Today and in People. */
const label = (t: { tabs: readonly string[]; asst: string }, names: { me: string; home: string }, key: TabKey): string =>
  key === 'assistant' ? t.asst : key === 'settings' ? names.me : key === 'today' ? names.home : (t.tabs[3] ?? '');

/** People and Today, then the orb, then the Assistant and the person's own picture (Settings). */
const LEFT: { key: TabKey; icon: IconName }[] = [
  { key: 'people', icon: 'users' },
  { key: 'today', icon: 'home' },
];
const RIGHT: { key: TabKey; icon: IconName }[] = [
  { key: 'assistant', icon: 'spark' },
  { key: 'settings', icon: 'users' },
];


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
  const { t, dir, lang, theme } = useLanguage();
  const { session } = useSession();
  const names = { me: added(lang).today.me, home: added(lang).today.home };

  // Counts on the icons, as a chat app has them: who needs a nudge, and what is overdue.
  const { followUps, contacts } = usePeople();
  const { tasks } = useTasks();
  const favorites = useFavorites();
  const cadence = useCadence();
  const hidden = useHiddenCards();
  const now = new Date();
  const badges: Partial<Record<TabKey, number>> = {
    people: followUps.filter((f) => followUpStatus(f, now) === 'due').length,
    today: buildNext({ tasks, followUps, contacts, favorites, cadence, hidden, now }).urgent,
  };

  return (
    <>
      {/* White fade so content scrolling under the bar stays legible. */}
      <LinearGradient
        pointerEvents="none"
        colors={[surface.glassFadeFrom, surface.glassFadeTo]}
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
          borderColor: surface.glassBorder,
          shadowColor: 'rgba(20,20,18,1)',
          shadowOpacity: 0.14,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        }}
      >
        <BlurView
          intensity={Platform.OS === 'android' ? 40 : 22}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={{
            ...FILL,
            borderRadius: 32,
            overflow: 'hidden',
            backgroundColor: surface.glassFill,
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
              label={label(t, names, tab.key)}
              active={active === tab.key}
              badge={badges[tab.key]}
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
              label={label(t, names, tab.key)}
              active={active === tab.key}
              badge={badges[tab.key]}
              avatar={tab.key === 'settings' ? <Avatar name={session?.name ?? ''} contactId={ME_PHOTO} size={26} /> : undefined}
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
  badge = 0,
  avatar,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  /** A count on the icon; nothing when zero. */
  badge?: number;
  /** Drawn in place of the icon: the person's own picture. */
  avatar?: ReactNode;
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
        backgroundColor: active ? surface.glassActive : 'transparent',
        shadowColor: '#000',
        shadowOpacity: active ? 0.08 : 0,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <View>
        {avatar ?? <Icon name={icon} size={22} color={active ? ink.base : ink.muted} strokeWidth={active ? 2 : 1.7} />}
        {badge > 0 ? (
          <View
            testID={`tab-badge-${label}`}
            style={{
              position: 'absolute',
              top: -6,
              right: -12,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              paddingHorizontal: 5,
              backgroundColor: status.invalid,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: surface.glassRing,
            }}
          >
            <Text size={10} weight="700" color="#FFFFFF" align="center">
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        token="tab"
        weight={active ? '600' : '500'}
        color={active ? ink.base : ink.muted}
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
      {...useCoachAnchor('mic')}
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
          borderColor: surface.glassRing,
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
        {/* The orb is black in both themes, so its mic is always white. */}
        <Icon name="mic" size={22} color="#FFFFFF" strokeWidth={1.9} />
      </View>
    </Pressable>
  );
}

const FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

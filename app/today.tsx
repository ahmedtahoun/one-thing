/**
 * 06 · Today — the home screen. SCREENS.md § 06.
 *
 * Built so far: header, the first-run card, the One Thing card and the
 * quick-action grid. The "Small promises" list, the evening variant and the
 * glass tab bar arrive with the task store and the tab layout.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { FirstRunCard } from '@/features/today/FirstRunCard';
import { OneThingCard } from '@/features/today/OneThingCard';
import { QuickActions } from '@/features/today/QuickActions';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { ink, space, surface, type TaskType } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useSession } from '@/lib/session';

/** Evening starts at 18:00 — the point the card flips to "Close the day". */
const EVENING_HOUR = 18;

export default function Today() {
  const { t, inline, lang } = useLanguage();
  const dir = useDirection();
  const { session, update } = useSession();
  const toast = useToast();

  const [oneThing, setOneThing] = useState<string | null>(null);
  const [oneThingDone] = useState(false);

  const now = new Date();
  const isEvening = now.getHours() >= EVENING_HOUR;
  const firstName = session?.firstName ?? '';

  const greeting = (isEvening ? inline.goodEvening : inline.goodMorning) + firstName;

  // "Thursday, 9 October" — weekday, comma, day, month, as the design shows.
  // Intl's en-GB long date has no comma, so the parts are joined by hand.
  const dateLabel = useMemo(() => {
    const locale = lang === 'ar' ? 'ar' : 'en-GB';
    const weekday = now.toLocaleDateString(locale, { weekday: 'long' });
    const dayMonth = now.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    return `${weekday}, ${dayMonth}`;
  }, [lang, now]);

  const setFirstOneThing = useCallback(
    (title: string) => {
      setOneThing(title);
      update({ firstRun: false });
      // No Undo: setting the One Thing is not destructive, and the toast's
      // job here is to explain that gentle reminders are now on.
      toast.show(inline.firstRunToast, { undo: false });
    },
    [update, toast, inline.firstRunToast]
  );

  const skipFirstRun = useCallback(() => {
    update({ firstRun: false });
  }, [update]);

  const onQuickAction = useCallback((type: TaskType) => {
    // Call / Email / WhatsApp pick a contact first; Remind captures; the four
    // event types open the event form. Those screens land in the next step.
    router.push(`/new?type=${type}`);
  }, []);

  const showFirstRun = Boolean(session?.firstRun) && !isEvening;

  return (
    <>
      <Screen scroll paddingBottom={space.tabBarInset} style={{ backgroundColor: surface.white }}>
        <View
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
            paddingBottom: 24,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text token="caption" color={ink.s4}>
              {dateLabel}
            </Text>
            <Text token="title" style={{ fontSize: 21, lineHeight: 27 }} testID="today-greeting">
              {greeting}
            </Text>
          </View>

          <View style={{ flexDirection: dir.row, gap: 8 }}>
            <HeaderCircle icon="spark" onPress={() => router.push('/assistant')} label="Assistant" />
            <HeaderCircle icon="moon" onPress={() => router.push('/review')} label="Daily review" />
            <Pressable
              testID="today-avatar"
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: ink.base,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text token="body" weight="600" color={surface.white}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 24 }}>
          {showFirstRun ? (
            <FirstRunCard onSet={setFirstOneThing} onLater={skipFirstRun} />
          ) : oneThing ? (
            <OneThingCard
              title={oneThing}
              focusMinutes={45}
              done={oneThingDone}
              onEdit={() => router.push('/priority')}
              onLockIn={() => router.push('/focus')}
              onShrink={() => router.push('/overwhelm')}
            />
          ) : null}

          <QuickActions onPress={onQuickAction} />

          <View style={{ gap: 4 }}>
            <Text token="title">{t.next}</Text>
            <Text token="micro" color={ink.s4}>
              {t.nextNote}
            </Text>
          </View>
        </View>
      </Screen>
      <Toast />
    </>
  );
}

/** One of the 44 pt round buttons in the Today header. */
function HeaderCircle({
  icon,
  onPress,
  label,
}: {
  icon: string;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: surface.fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={20} strokeWidth={1.8} />
    </Pressable>
  );
}

/**
 * 15 · Focus (Lock In). SCREENS.md § 15.
 *
 * Full-bleed ink, a 260 pt ring, and as little else as possible. Two details
 * carry the intent: the UI dims after a few seconds so the timer is all
 * that's left, and "Park it" exists so remembering something mid-session
 * doesn't end the session.
 *
 * The completion notification is scheduled when the session starts, as the
 * spec says — not when it ends, which the app may not be open to see.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { track } from '@/lib/analytics/track';
import { RingTimer } from '@/features/focus/RingTimer';
import { BalancedText } from '@/ui/BalancedText';
import { BackButton } from '@/ui/BackButton';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { ink, motion, radius, space, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { cancelFocusEnd, scheduleFocusEnd } from '@/lib/notifications/scheduler';
import { usePrefs } from '@/lib/prefs';
import { useTasks } from '@/lib/tasks';

/** mm:ss, always LTR digits. */
function clock(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export default function Focus() {
  const { t, inline, a11y } = useLanguage();
  const dir = useDirection();
  const { prefs } = usePrefs();
  const { tasks, oneThing, setOneThingDone } = useTasks();
  const toast = useToast();

  // Overwhelm's "5-minute sprint" arrives with its own length; otherwise the
  // One Thing's, which Settings sets.
  const params = useLocalSearchParams<{ minutes?: string }>();
  const minutes = Number(params.minutes) || oneThing?.focusMinutes || prefs.focusMinutes;
  const total = minutes * 60;

  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(true);
  const [idle, setIdle] = useState(false);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The clock starts with the screen, so a mount is a started session.
  useEffect(() => track({ name: 'focus_started', min: minutes }), [minutes]);

  const wake = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), motion.focusIdleDim);
  }, []);

  useEffect(() => {
    wake();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [wake]);

  // The UI only dims while the session is actually running.
  useEffect(() => {
    if (!running) setIdle(false);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      setRemaining((left) => {
        if (left <= 1) {
          clearInterval(tick);
          setRunning(false);
          return 0;
        }
        return left - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [running]);

  // Scheduled on start, and re-scheduled whenever the session is resumed, so
  // the notification always lands at the real end time.
  useEffect(() => {
    if (!running) {
      cancelFocusEnd().catch(() => {});
      return;
    }
    const endsAt = new Date(Date.now() + remaining * 1000);
    scheduleFocusEnd(endsAt, minutes, prefs, t).catch(() => {});
    // `remaining` is deliberately not a dependency: it changes every second,
    // and the end time it implies does not move while the clock runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, minutes, prefs, t]);

  useEffect(() => () => void cancelFocusEnd().catch(() => {}), []);

  // Everything still open, not just today's: during a session what is on
  // your mind is the whole list, which is what "safe until later" answers.
  const openCount = useMemo(() => tasks.filter((task) => task.status === 'open').length, [tasks]);

  const finish = useCallback(() => {
    const early = remaining > 0 && remaining < total - 1;
    const done = () => {
      // "Completed" is the user saying the One Thing is done, which is what
      // this button means whether the clock ran out or they ended it early.
      // A session abandoned by leaving the screen reports nothing, so
      // started-minus-completed is the drop-off.
      track({ name: 'focus_completed' });
      setRunning(false);
      setOneThingDone(true);
      cancelFocusEnd().catch(() => {});
      toast.show(t.toastDone, { undo: false });
      router.replace('/today');
    };

    if (!early) return done();

    const message = inline.endFocusEarly.replace('{t}', clock(remaining));
    // Alert is unavailable on web, where the harness renders; there the
    // confirmation is skipped rather than silently blocking the button.
    if (Platform.OS === 'web') return done();
    Alert.alert(message, undefined, [
      { text: t.cancel, style: 'cancel' },
      { text: t.finish, style: 'destructive', onPress: done },
    ]);
  }, [remaining, total, setOneThingDone, toast, t, inline]);

  const dim = idle ? 0.08 : 1;

  return (
    <>
      <StatusBar style="light" />
      <Pressable
        testID="focus-screen"
        onPress={wake}
        style={{
          flex: 1,
          backgroundColor: ink.base,
          direction: dir.isRTL ? 'rtl' : 'ltr',
          alignItems: 'center',
          paddingTop: 66,
          paddingHorizontal: space.screenXWide,
          paddingBottom: 44,
          gap: 20,
        }}
      >
        <View
          style={{
            width: '100%',
            flexDirection: dir.row,
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: dim,
          }}
        >
          <BackButton testID="focus-back" onPress={() => router.back()} color={surface.white} />

          <Text token="eyebrow" color={ink.s6} style={{ letterSpacing: 1.76 }}>
            {t.f_k}
          </Text>

          <Pressable
            testID="focus-stuck"
            onPress={() => router.push('/overwhelm')}
            accessibilityRole="button"
            style={{
              borderWidth: 1,
              borderColor: surface.onInkLine,
              borderRadius: radius.pill,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Text token="micro" color={surface.white}>
              {t.stuck}
            </Text>
          </Pressable>
        </View>

        <BalancedText
          token="h3"
          size={22}
          lh={28.6}
          color={surface.white}
          align="center"
          style={{ paddingTop: 8, paddingHorizontal: 8 }}
        >
          {oneThing?.title ?? ''}
        </BalancedText>

        <RingTimer progress={1 - remaining / total} timeLeft={clock(remaining)} label={t.f_left} running={running} />

        <View style={{ flexDirection: dir.row, gap: 10, width: '100%', marginTop: 8, opacity: dim }}>
          <Pressable
            testID="focus-pause"
            onPress={() => setRunning((v) => !v)}
            accessibilityRole="button"
            style={{
              flex: 1,
              height: 52,
              borderRadius: 26,
              borderWidth: 1,
              borderColor: surface.onInkLine,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text token="bodyL" color={surface.white} numberOfLines={1}>
              {running ? t.pause : `${inline.resumePrefix}${clock(remaining)}${inline.resumeSuffix}`}
            </Text>
          </Pressable>

          <Pressable
            testID="focus-finish"
            onPress={finish}
            accessibilityRole="button"
            style={{
              flex: 1,
              height: 52,
              borderRadius: 26,
              backgroundColor: surface.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text token="bodyL" weight="500">
              {t.finish}
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Text token="micro" color={ink.s4} align="center" style={{ opacity: idle ? 1 : 0 }}>
            {t.f_tap}
          </Text>
        </View>

        <Pressable
          testID="focus-park"
          onPress={() => router.push('/capture?from=focus')}
          accessibilityRole="button"
          style={{
            opacity: dim,
            width: '100%',
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 14,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: '#2C2C2A',
            backgroundColor: '#161615',
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: surface.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="mic" size={22} strokeWidth={1.9} />
          </View>
          <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
            <Text token="body" weight="500" color={surface.white}>
              {t.f_cap}
            </Text>
            <Text token="micro" color={ink.s6}>
              {t.f_safe.replace('{n}', String(openCount))}
            </Text>
          </View>
        </Pressable>
      </Pressable>
      <Toast />
    </>
  );
}

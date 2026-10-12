/**
 * 06 · Today — the home screen. SCREENS.md § 06.
 *
 * Container is 8 / 20 / 150 with a 24 pt gap between sections, matching the
 * prototype. Which card leads depends on the time and whether this is a first
 * run: evening shows "Close the day", a first run asks for the One Thing, and
 * otherwise the One Thing card leads.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { EveningCard } from '@/features/today/EveningCard';
import { FirstRunCard } from '@/features/today/FirstRunCard';
import { OneThingCard } from '@/features/today/OneThingCard';
import { QuickActions } from '@/features/today/QuickActions';
import { quickActionRoute } from '@/features/today/quick-route';
import { SmallPromises } from '@/features/today/SmallPromises';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { TabBar } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { type IconName } from '@/design/icon-paths';
import { ink, space, surface, type TaskType } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { dateKey, isOnDay, type Task } from '@/lib/model-types';
import { usePrefs } from '@/lib/prefs';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';

/** Evening starts at 18:00 — the point the card flips to "Close the day". */
const EVENING_HOUR = 18;

export default function Today() {
  const { t, inline, a11y, lang } = useLanguage();
  const dir = useDirection();
  const { session, update } = useSession();
  const { tasks, oneThing, setOneThing, toggleDone, restore } = useTasks();
  const { prefs } = usePrefs();
  const toast = useToast();

  const [now] = useState(() => new Date());
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

  // Done last, then by time — so what is still to come stays at the top.
  const todaysTasks = useMemo(() => {
    const today = dateKey(now);
    return tasks
      .filter((task) => isOnDay(task, today) && task.status !== 'cancelled')
      .sort((a, b) => {
        const done = Number(a.status === 'done') - Number(b.status === 'done');
        return done !== 0 ? done : (a.dueAt ?? '').localeCompare(b.dueAt ?? '');
      });
  }, [tasks, now]);

  // The first-run card suggests what they already have to do, before the stock
  // examples: today's open tasks, then the rest, without repeats.
  const ownSuggestions = useMemo(() => {
    const open = [...todaysTasks, ...tasks].filter((task) => task.status === 'open' || task.status === 'snoozed');
    return [...new Set(open.map((task) => task.title.trim()).filter(Boolean))].slice(0, 4);
  }, [todaysTasks, tasks]);

  const openCount = todaysTasks.filter((task) => task.status !== 'done').length;

  const setFirstOneThing = useCallback(
    (title: string) => {
      setOneThing(title, prefs.focusMinutes);
      update({ firstRun: false });
      // Not destructive, so no Undo: the toast's job is to say that gentle
      // reminders are now on.
      toast.show(inline.firstRunToast, { undo: false });
    },
    [setOneThing, prefs.focusMinutes, update, toast, inline.firstRunToast]
  );

  const skipFirstRun = useCallback(() => {
    update({ firstRun: false });
  }, [update]);

  const onToggle = useCallback(
    (task: Task) => {
      const before = tasks;
      const next = toggleDone(task.id);
      // Checking something off is undoable for the length of the toast.
      if (next === 'done') toast.show(t.toastDone, { undo: () => restore(before) });
    },
    [tasks, toggleDone, toast, t.toastDone, restore]
  );

  const onQuickAction = useCallback((type: TaskType) => {
    // Call / Email / WhatsApp pick a contact first (People in its pick mode,
    // which then opens Compose); Remind captures; the four event types open
    // the event form.
    router.push(quickActionRoute(type));
  }, []);

  const showFirstRun = Boolean(session?.firstRun) && !isEvening;
  const showOneThing = !showFirstRun && !isEvening && oneThing !== null;

  return (
    <>
      <Screen
        scroll
        paddingTop={8}
        paddingBottom={space.tabBarInset}
        style={{ gap: 24 }}
        background={surface.white}
      >
        <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2, flexShrink: 1 }}>
            {/* Neither header line is given a line-height in the prototype,
                so both take the font's natural 1.5. */}
            <Text token="caption" color={ink.s4}>
              {dateLabel}
            </Text>
            <Text token="title" size={21} numberOfLines={1} testID="today-greeting">
              {greeting}
            </Text>
          </View>

          <View style={{ flexDirection: dir.row, gap: 6 }}>
            <HeaderCircle icon="spark" label={a11y.assistant} onPress={() => router.push('/assistant')} />
            <HeaderCircle icon="moon" label={a11y.dailyReview} onPress={() => router.push('/review')} />
            <Pressable
              testID="today-avatar"
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel={a11y.settings}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: ink.base,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <Text token="body" weight="600" color={surface.white}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* First, so a task is one tap from the top of the screen. */}
        <QuickActions onPress={onQuickAction} />

        {isEvening ? (
          <EveningCard
            oneThingLine={oneThing ? `${oneThing.title} — ${oneThing.done ? t.doneToday : t.notYet}` : ''}
            keptLine={t.tk_sum
              .replace('{a}', String(openCount))
              .replace('{b}', String(todaysTasks.length - openCount))}
            onReview={() => router.push('/review')}
          />
        ) : showFirstRun ? (
          <FirstRunCard onSet={setFirstOneThing} onLater={skipFirstRun} suggestions={ownSuggestions} />
        ) : showOneThing && oneThing ? (
          <OneThingCard
            title={oneThing.title}
            focusMinutes={oneThing.focusMinutes}
            done={oneThing.done}
            progress={{ done: todaysTasks.length - openCount, total: todaysTasks.length }}
            onEdit={() => router.push('/priority')}
            onLockIn={() => router.push('/focus')}
            onShrink={() => router.push('/overwhelm')}
          />
        ) : null}

        <SmallPromises
          tasks={todaysTasks}
          onToggle={onToggle}
          onOpen={(task) => router.push(`/compose?id=${task.id}`)}
          onReschedule={(task) => router.push(`/reschedule?id=${task.id}`)}
          onSeeAll={() => router.push('/tasks')}
          onBrainDump={() => router.push('/brain-dump')}
        />
      </Screen>

      <TabBar
        active="today"
        onSelect={(key) => router.push(`/${key === 'today' ? 'today' : key}`)}
        onCapture={() => router.push('/capture')}
        onBrainDump={() => router.push('/brain-dump')}
      />
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
  icon: IconName;
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

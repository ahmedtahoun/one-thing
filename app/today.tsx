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
import { HabitRow } from '@/features/today/HabitRow';
import { starterIdeas } from '@/features/today/starter-ideas';
import { OneThingCard } from '@/features/today/OneThingCard';
import { OneThingSheet } from '@/features/today/OneThingSheet';
import { QuickActions } from '@/features/today/QuickActions';
import { quickActionRoute } from '@/features/today/quick-route';
import { AllTasks } from '@/features/home/AllTasks';
import { NextList } from '@/features/next/NextList';
import { AddSheet } from '@/features/tasks/AddSheet';
import { FilterChips } from '@/features/tasks/FilterChips';
import { type TaskFilter } from '@/features/tasks/groups';
import { ViewSwitch, type HomeView } from '@/features/home/ViewSwitch';
import { TodayEmpty } from '@/features/today/TodayEmpty';
import { added } from '@/content/additions';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { TabBar } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { type IconName } from '@/design/icon-paths';
import { ink, space, surface, type TaskType } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { dateKey, isOnDay } from '@/lib/model-types';
import { useNotifications } from '@/lib/notifications/NotificationsProvider';
import { usePrefs } from '@/lib/prefs';
import { streakOf } from '@/lib/streak';
import { useWins } from '@/lib/wins';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';

/** Evening starts at 18:00 — the point the card flips to "Close the day". */
const EVENING_HOUR = 18;

export default function Today() {
  const { t, inline, lang } = useLanguage();
  const dir = useDirection();
  const { session, update } = useSession();
  const { tasks, oneThing, setOneThing } = useTasks();
  const { prefs } = usePrefs();
  const toast = useToast();
  const { allowed, ask, turnOn } = useNotifications();
  const wins = useWins();

  const [now] = useState(() => new Date());
  const [oneOpen, setOneOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // Two views: Today, and All — the full list, whose own filters are the second row.
  const [view, setView] = useState<HomeView>('today');
  const [filter, setFilter] = useState<TaskFilter>('all');
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
    const own = [...new Set(open.map((task) => task.title.trim()).filter(Boolean))].slice(0, 4);
    // Nothing yet: a founder gets founder-shaped ideas, everyone else the stock examples.
    return own.length > 0 ? own : (starterIdeas(session?.jobTitle, lang) ?? []);
  }, [todaysTasks, tasks, session?.jobTitle, lang]);

  const streak = useMemo(() => streakOf(wins, now), [wins, now]);

  const openCount = todaysTasks.filter((task) => task.status !== 'done').length;

  const setFirstOneThing = useCallback(
    (title: string) => {
      setOneThing(title, prefs.focusMinutes);
      update({ firstRun: false });
      // Choosing a first One Thing is the moment a reminder means something.
      ask().catch(() => {});
      // Not destructive, so no Undo: the toast's job is to say that gentle
      // reminders are now on.
      toast.show(inline.firstRunToast, { undo: false });
    },
    [setOneThing, prefs.focusMinutes, update, toast, inline.firstRunToast, ask]
  );

  const skipFirstRun = useCallback(() => {
    update({ firstRun: false });
  }, [update]);

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

          <View style={{ flexDirection: dir.row, gap: 8 }}>
            {/* One way to add from Today (the four tiles below); the + belongs to the full list. */}
            {view === 'all' ? (
              <HeaderCircle testID="home-add" icon="plus" solid label={added(lang).today.add} onPress={() => setAddOpen(true)} />
            ) : null}
          </View>
        </View>

        <ViewSwitch value={view} onChange={setView} />

        {view === 'all' ? (
          <>
            <FilterChips active={filter} onPick={setFilter} />
            <AllTasks filter={filter} now={now} />
          </>
        ) : null}

        {view === 'today' ? (
          <>
        {/* First, so a task is one tap from the top of the screen. */}
        <QuickActions onPress={onQuickAction} />

        <HabitRow streak={streak} nudgesOff={allowed === false && !showFirstRun} onTurnOn={() => void turnOn()} />

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
            onEdit={() => setOneOpen(true)}
            onLockIn={() => router.push('/focus')}
            onShrink={() => router.push('/overwhelm')}
          />
        ) : null}

        {!showFirstRun && !isEvening && oneThing === null ? (
          <Pressable
            testID="today-set-one"
            onPress={() => setOneOpen(true)}
            accessibilityRole="button"
            style={{ flexDirection: dir.row, alignItems: 'center', gap: 10, paddingVertical: 4 }}
          >
            <Icon name="target" size={18} color={ink.s3} strokeWidth={1.9} />
            <Text token="bodyS" weight="600" color={ink.s3}>
              {added(lang).today.setOne}
            </Text>
          </Pressable>
        ) : null}

        {showFirstRun ? null : (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text token="title">{added(lang).next.title}</Text>
            </View>
            <NextList
              now={now}
              onNothing={tasks.length === 0 ? <TodayEmpty
                  onBrainDump={() => router.push('/brain-dump')}
                  onTry={(say) => router.push({ pathname: '/assistant', params: { say } })}
                /> : undefined}
            />
          </View>
        )}
          </>
        ) : null}
      </Screen>

      <OneThingSheet
        key={String(oneOpen)}
        open={oneOpen}
        initial={oneThing?.title}
        suggestions={ownSuggestions}
        onClose={() => setOneOpen(false)}
        onSave={(title) => {
          setOneThing(title, prefs.focusMinutes);
          setOneOpen(false);
        }}
      />

      <AddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={(type) => {
          setAddOpen(false);
          router.push(`/new?type=${type}`);
        }}
        onVoice={() => {
          setAddOpen(false);
          router.push('/capture');
        }}
      />

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
  testID,
  icon,
  onPress,
  label,
  solid = false,
}: {
  testID?: string;
  icon: IconName;
  /** The dark filled one: Add. */
  solid?: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: solid ? ink.solid : surface.fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={20} color={solid ? surface.white : ink.base} strokeWidth={solid ? 2.2 : 1.8} />
    </Pressable>
  );
}

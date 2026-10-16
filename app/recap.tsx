/**
 * Your week — the weekly recap.
 *
 * Sold on the paywall before it existed and taken off the card rather than
 * faked (§2.56); written now (§2.70). SCREENS.md never described it, so what
 * it shows was decided by one rule: every line comes off something the app
 * genuinely dates, and no row is filled with an estimate.
 * `src/features/recap/week.ts` holds that reading and is tested without a
 * screen; this draws it.
 *
 * Nothing here is computed from a server and nothing is sent to one. It is
 * free, and `can('weeklyRecap')` is true: it reads data the person already
 * has, so there is nothing to meter.
 */
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import { hasAnything, weekOf, type Week } from '@/features/recap/week';
import { BackButton } from '@/ui/BackButton';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { usePeople } from '@/lib/people';
import { useTasks } from '@/lib/tasks';
import { useWins } from '@/lib/wins';

/** At most this many people and tasks listed; the rest are a count. */
const ROWS = 5;

export default function Recap() {
  const { lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).recap;
  const { tasks } = useTasks();
  const { contacts, followUps, history } = usePeople();
  const wins = useWins();

  const week = useMemo(
    () => weekOf({ tasks, followUps, contacts, history, wins, now: new Date() }),
    [tasks, followUps, contacts, history, wins],
  );

  const one = (n: number, singular: string, plural: string): string => (n === 1 ? singular : plural.replace('{n}', String(n)));

  const section = (children: React.ReactNode) => (
    <View style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, padding: 14, gap: 10, backgroundColor: surface.white }}>{children}</View>
  );

  const countLine = (label: string, value: number) =>
    value === 0 ? null : (
      <View key={label} style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
        <Text token="bodyS" color={ink.s3}>
          {label}
        </Text>
        <Text token="bodyS" weight="600" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
      </View>
    );

  return (
    <Screen scroll paddingBottom={60} style={{ gap: 14 }}>
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingTop: 6 }}>
        <BackButton testID="recap-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} />
        <Text token="title">{copy.title}</Text>
      </View>

      {!hasAnything(week) ? (
        <View testID="recap-empty" style={{ gap: 8, paddingTop: 30 }}>
          <Text token="body" weight="600" align="center">
            {copy.empty}
          </Text>
          <Text token="bodyS" color={ink.s3} align="center">
            {copy.emptyBody}
          </Text>
        </View>
      ) : (
        <>
          {/* The days, and the streak that goes with them. */}
          <View testID="recap-days" style={{ gap: 6 }}>
            <Text token="h1" size={26} weight="700">
              {one(week.activeDays, copy.dayOne, copy.daysN)}
            </Text>
            {week.streak.current > 0 ? (
              <Text token="bodyS" color={ink.solid} weight="600">
                {copy.streakN.replace('{n}', String(week.streak.current))}
              </Text>
            ) : null}
          </View>

          {/* What went out. */}
          {section(
            week.sentTotal === 0 ? (
              <Text testID="recap-sent" token="bodyS" color={ink.s3}>
                {copy.nothingSent}
              </Text>
            ) : (
              <>
                <Text testID="recap-sent" token="body" weight="600">
                  {one(week.sentTotal, copy.sentOne, copy.sentN)}
                </Text>
                {[
                  countLine(copy.calls, week.sent.calls),
                  countLine(copy.messages, week.sent.messages),
                  countLine(copy.emails, week.sent.emails),
                  countLine(copy.meetings, week.sent.meetings),
                  countLine(copy.notes, week.sent.notes),
                ].filter(Boolean)}
              </>
            ),
          )}

          {/* Who heard from you. */}
          {week.reached.length > 0
            ? section(
                <>
                  <Text testID="recap-reached" token="body" weight="600">
                    {one(week.reached.length, copy.reachedOne, copy.reached)}
                  </Text>
                  {week.reached.slice(0, ROWS).map((r) => (
                    <Pressable
                      key={r.contact.id}
                      testID={`recap-person-${r.contact.id}`}
                      onPress={() => router.push(`/contact?id=${r.contact.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={r.contact.name}
                      style={({ pressed }) => ({
                        flexDirection: dir.row,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: pressed ? surface.fill : 'transparent',
                      })}
                    >
                      <Text token="bodyS" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
                        {r.contact.name}
                      </Text>
                      <Text token="micro" color={ink.s4}>
                        {one(r.times, copy.timesOne, copy.timesN)}
                      </Text>
                    </Pressable>
                  ))}
                </>,
              )
            : null}

          {/* The loop: closed, and still open. */}
          {week.closed > 0 || week.waiting > 0
            ? section(
                <>
                  {week.closed > 0 ? (
                    <Text testID="recap-closed" token="body" weight="600">
                      {one(week.closed, copy.closedOne, copy.closedN)}
                    </Text>
                  ) : null}
                  {week.waiting > 0 ? (
                    <Pressable
                      testID="recap-waiting"
                      onPress={() => router.push('/followups')}
                      accessibilityRole="button"
                      style={({ pressed }) => ({ flexDirection: dir.row, alignItems: 'center', gap: 8, backgroundColor: pressed ? surface.fill : 'transparent', borderRadius: 10 })}
                    >
                      <Text token="bodyS" color={ink.s3} style={{ flex: 1, minWidth: 0 }}>
                        {one(week.waiting, copy.waitingOne, copy.waitingN)}
                      </Text>
                      <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
                        <Icon name="chevR" size={16} color={ink.s4} strokeWidth={2} />
                      </View>
                    </Pressable>
                  ) : null}
                </>,
              )
            : null}

          {/* What next week inherits. */}
          {section(
            week.carrying.length === 0 ? (
              <Text testID="recap-carrying" token="bodyS" color={ink.s3}>
                {copy.allClear}
              </Text>
            ) : (
              <>
                <Text testID="recap-carrying" token="body" weight="600">
                  {one(week.carrying.length, copy.carryingOne, copy.carrying)}
                </Text>
                {week.carrying.slice(0, ROWS).map((task) => (
                  <Pressable
                    key={task.id}
                    testID={`recap-task-${task.id}`}
                    onPress={() => router.push(`/compose?id=${task.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={task.title}
                    style={({ pressed }) => ({
                      flexDirection: dir.row,
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 6,
                      borderRadius: 10,
                      backgroundColor: pressed ? surface.fill : 'transparent',
                    })}
                  >
                    <Icon name={TYPE_ICON[task.type]} size={16} color={typeColour[task.type].fg} strokeWidth={1.9} />
                    <Text token="bodyS" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
                      {task.title}
                    </Text>
                  </Pressable>
                ))}
              </>
            ),
          )}
        </>
      )}
    </Screen>
  );
}

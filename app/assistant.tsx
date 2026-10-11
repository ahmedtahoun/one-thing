/**
 * 19 · Assistant chat. SCREENS.md § 19.
 *
 * A header (back, the spark, "Assistant" over today's One Thing), the
 * conversation, the suggestion chips and the message bar. It greets by name
 * and does three things, as the prototype does: catch a task (shown as a card
 * that waits for "Looks right"), lay out the day, and say who is still owed a
 * reply. Its scope stops there — tasks, contacts, reminders and follow-ups —
 * because ParsedTask / AssistantIntent have no room for anything else
 * (src/lib/parse/types.ts).
 *
 * Each message sent spends one of the Free plan's 10 a day. The eleventh opens
 * the paywall instead of sending — BUILD-REVIEW.md §2.34.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { NOBODY, whenText } from '@/features/capture/labels';
import { SendRow } from '@/features/capture/SendRow';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast } from '@/ui/Toast';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useAssistantMeter } from '@/lib/assistant-meter';
import { dateKey, followUpStatus, isOnDay, timeLabel, type Task } from '@/lib/model-types';
import { AssistLimitError, textParser, type AssistantIntent, type ParsedTask } from '@/lib/parse';
import { taskFromParsed } from '@/lib/parse/to-task';
import { usePeople } from '@/lib/people';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';

/** How long the prototype takes to answer. */
const REPLY_DELAY = 650;

type Message =
  | { id: string; from: 'me'; text: string }
  | { id: string; from: 'bot'; kind: 'greet' }
  | { id: string; from: 'bot'; kind: 'saved'; time: string }
  | { id: string; from: 'bot'; intent: AssistantIntent; confirmed?: boolean };

const newId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/** The One Thing goes first in the plan, at the prototype's 09:00 — "while your head is fresh". */
const ONE_THING_SLOT = '09:00';

export default function Assistant() {
  const { t, fux, a11y, lang } = useLanguage();
  const dir = useDirection();
  const { session } = useSession();
  const { tasks, oneThing, addTask } = useTasks();
  const { contacts, followUps } = usePeople();
  const meter = useAssistantMeter();

  const [messages, setMessages] = useState<Message[]>([{ id: 'greet', from: 'bot', kind: 'greet' }]);
  const [input, setInput] = useState('');
  const scroll = useRef<ScrollView>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || !meter.ready) return;
    if (!meter.canAsk) {
      router.push('/paywall');
      return;
    }
    meter.spend();
    const sent = newId();
    setMessages((list) => [...list, { id: sent, from: 'me', text }]);
    if (raw === undefined) setInput('');
    let intent: AssistantIntent;
    try {
      intent = await textParser.interpret(text, { lang, now: new Date(), contacts });
    } catch (error) {
      if (!(error instanceof AssistLimitError)) throw error;
      // The server's count says today's are used up — another device spent
      // them. As at the eleventh request here: no message, the paywall.
      setMessages((list) => list.filter((m) => m.id !== sent));
      if (raw === undefined) setInput(text);
      router.push('/paywall');
      return;
    }
    timers.current.push(
      setTimeout(() => setMessages((list) => [...list, { id: newId(), from: 'bot', intent }]), REPLY_DELAY)
    );
  };

  const confirm = (id: string, task: ParsedTask) => {
    addTask(taskFromParsed(task, 'assistant'));
    setMessages((list) => [
      ...list.map((m) => (m.id === id ? { ...m, confirmed: true } : m)),
      { id: newId(), from: 'bot', kind: 'saved', time: timeLabel(task.when) },
    ]);
  };

  // The greeting names the person where the prototype names its demo user.
  const demoFirst = t.set_name.split(' ')[0] ?? '';
  const greeting = session?.firstName ? t.bot0.replace(demoFirst, session.firstName) : t.bot0;

  const today = dateKey();
  const todaysOpen = tasks
    .filter((task) => task.status === 'open' && isOnDay(task, today))
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));

  const now = new Date();
  const nudge = followUps.filter((f) => followUpStatus(f, now) === 'due').length;
  const waiting = followUps.filter((f) => followUpStatus(f, now) === 'waiting').length;
  // botFu is the prototype's demo sentence ("Three threads are open. Noura
  // is the oldest — 3 days."); the Follow-ups summary says the same thing
  // from real counts — BUILD-REVIEW.md §2.34.
  const followUpLine = nudge + waiting === 0 ? fux.sum0 : fux.sum.replace('{a}', String(nudge)).replace('{b}', String(waiting));

  return (
    <>
      <Screen paddingX={0} paddingBottom={0}>
        <View
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 10,
            paddingTop: 4,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: surface.lineSoft,
          }}
        >
          <Pressable
            testID="assistant-back"
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={a11y.back}
            hitSlop={10}
            // 40 tall: the icon sits in the button's 28 pt line box.
            style={{ paddingTop: 6, paddingBottom: 12 }}
          >
            <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
              <Icon name="back" size={22} strokeWidth={1.7} />
            </View>
          </Pressable>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: ink.base, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="spark" size={15} color={surface.white} strokeWidth={1.7} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text token="body" weight="600">
              {t.asst}
            </Text>
            <Text token="micro" color={ink.s4} numberOfLines={1}>
              {oneThing?.title ?? ''}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) =>
            m.from === 'me' ? (
              <View
                key={m.id}
                testID="assistant-mine"
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '78%',
                  backgroundColor: ink.base,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                }}
              >
                <Text token="body" lh={21.75} color={surface.white}>
                  {m.text}
                </Text>
              </View>
            ) : (
              <View key={m.id} testID="assistant-reply" style={{ alignSelf: 'flex-start', maxWidth: '88%', gap: 8 }}>
                <Bubble>
                  {'kind' in m
                    ? m.kind === 'greet'
                      ? greeting
                      : t.botSaved.replace('{t}', m.time)
                    : m.intent.kind === 'task'
                      ? t.botTask
                      : m.intent.kind === 'plan'
                        ? t.botPlan
                        : followUpLine}
                </Bubble>
                {'intent' in m && m.intent.kind === 'task' ? (
                  <TaskCard task={m.intent.task} confirmed={Boolean(m.confirmed)} onConfirm={() => confirm(m.id, (m.intent as { task: ParsedTask }).task)} />
                ) : null}
                {'intent' in m && m.intent.kind === 'plan' ? (
                  <Plan oneThing={oneThing ? { title: oneThing.title, meta: t.focusMeta.replace('{n}', String(oneThing.focusMinutes)) } : null} tasks={todaysOpen} />
                ) : null}
                {'intent' in m && m.intent.kind === 'followups' ? (
                  <Pressable
                    testID="assistant-open-followups"
                    onPress={() => router.push('/followups')}
                    accessibilityRole="button"
                    style={{
                      alignSelf: 'flex-start',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: ink.base,
                      backgroundColor: surface.white,
                    }}
                  >
                    <Text token="bodyS">{t.openFu}</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          )}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}
        >
          {t.chips.map((chip, i) => (
            <Pressable
              key={chip}
              testID={`assistant-chip-${i}`}
              onPress={() => send(chip)}
              accessibilityRole="button"
              style={{
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: surface.line,
                backgroundColor: surface.white,
              }}
            >
              <Text token="caption" numberOfLines={1}>
                {chip}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          <SendRow
            testID="assistant"
            value={input}
            onChange={setInput}
            onSend={() => send()}
            placeholder={t.chatPh}
            sendLabel={a11y.send}
          />
        </View>
      </Screen>
      <Toast />
    </>
  );
}

function Bubble({ children }: { children: string }) {
  return (
    <View style={{ backgroundColor: surface.langTrack, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 18 }}>
      <Text token="body" lh={22.5}>
        {children}
      </Text>
    </View>
  );
}

function TaskCard({ task, confirmed, onConfirm }: { task: ParsedTask; confirmed: boolean; onConfirm: () => void }) {
  const { t } = useLanguage();
  const dir = useDirection();
  const colour = typeColour[task.type];
  return (
    <View testID="assistant-card" style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, padding: 14, gap: 10, backgroundColor: surface.white }}>
      <View style={{ flexDirection: dir.row, gap: 10, alignItems: 'center' }}>
        <Icon name={TYPE_ICON[task.type]} size={18} color={colour.fg} strokeWidth={1.9} />
        <Text token="body" weight="600" style={{ flex: 1 }}>
          {task.title}
        </Text>
      </View>
      <Text token="caption" color={ink.s3}>
        <Text token="caption" weight="600" color={colour.fg}>
          {t.types[task.type]}
        </Text>
        {` · ${task.who ?? NOBODY} · ${whenText(task.when, t)}`}
      </Text>
      {confirmed ? (
        <View testID="assistant-kept" style={{ flexDirection: dir.row, gap: 6, alignItems: 'center' }}>
          <Icon name="check" size={16} strokeWidth={1.7} />
          <Text token="caption" color={ink.s3}>
            {t.kept}
          </Text>
        </View>
      ) : (
        <Pressable
          testID="assistant-confirm"
          onPress={onConfirm}
          accessibilityRole="button"
          style={{ height: 40, borderRadius: 20, backgroundColor: ink.base, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text token="bodyS" color={surface.white} align="center">
            {t.ok}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function Plan({ oneThing, tasks }: { oneThing: { title: string; meta: string } | null; tasks: Task[] }) {
  const { t } = useLanguage();
  const dir = useDirection();
  const rows = [
    ...(oneThing ? [{ key: 'one', time: ONE_THING_SLOT, title: oneThing.title, sub: oneThing.meta, icon: <Icon name="target" size={16} strokeWidth={1.7} /> }] : []),
    ...tasks.map((task) => ({
      key: task.id,
      time: timeLabel(task.dueAt),
      title: task.title,
      sub: [t.types[task.type], task.who].filter(Boolean).join(' · '),
      icon: <Icon name={TYPE_ICON[task.type]} size={16} color={typeColour[task.type].fg} strokeWidth={1.9} />,
    })),
  ];
  return (
    <View testID="assistant-plan" style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, overflow: 'hidden', backgroundColor: surface.white }}>
      {rows.map((row) => (
        <View
          key={row.key}
          style={{
            flexDirection: dir.row,
            gap: 12,
            paddingVertical: 11,
            paddingHorizontal: 14,
            borderBottomWidth: 1,
            borderBottomColor: surface.lineSoft,
            alignItems: 'center',
          }}
        >
          <Text token="micro" color={ink.s4} tabular style={{ width: 40 }}>
            {row.time}
          </Text>
          {row.icon}
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text token="bodyS" weight="500">
              {row.title}
            </Text>
            <Text token="micro" color={ink.s4}>
              {row.sub}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

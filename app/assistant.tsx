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

import { added } from '@/content/additions';
import { AskChips } from '@/features/capture/AskChips';
import { optionsFor, questionFor, type AskAction, type AskOption } from '@/features/capture/ask';
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
import {
  answerFromText,
  clarify,
  suggestWho,
  withWhen,
  withWho,
  type Gap,
  type QuickWhen,
  type Settled,
  type World,
} from '@/lib/parse/clarify';
import { taskFromParsed } from '@/lib/parse/to-task';
import { usePeople } from '@/lib/people';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';

/** How long the prototype takes to answer. */
const REPLY_DELAY = 650;

/**
 * A question the Assistant is waiting on. `text` is what the person originally
 * wrote, so each answer can be checked against it again; `settled` is what
 * they have already waved away, so nothing is asked twice.
 */
type Ask = {
  id: string;
  from: 'bot';
  kind: 'ask';
  gap: Gap;
  draft: ParsedTask;
  text: string;
  settled: Settled;
  answered?: boolean;
};

type Message =
  | { id: string; from: 'me'; text: string }
  | { id: string; from: 'bot'; kind: 'greet' }
  | { id: string; from: 'bot'; kind: 'saved'; time: string }
  | { id: string; from: 'bot'; kind: 'note'; text: string }
  | Ask
  | { id: string; from: 'bot'; intent: AssistantIntent; confirmed?: boolean };

const newId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/** The One Thing goes first in the plan, at the prototype's 09:00 — "while your head is fresh". */
const ONE_THING_SLOT = '09:00';

export default function Assistant() {
  const { t, fux, a11y, lang } = useLanguage();
  const dir = useDirection();
  const { session } = useSession();
  const { tasks, oneThing, addTask } = useTasks();
  const { contacts, followUps, addContact } = usePeople();
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

  const copy = added(lang);
  const quick = t.rQuick as unknown as readonly QuickWhen[];
  const world = (): World => ({ contacts, tasks, followUps, now: new Date() });

  /** The last question still waiting for an answer, if the chat is mid-question. */
  const pending = [...messages].reverse().find((m): m is Ask => 'kind' in m && m.kind === 'ask' && !m.answered) ?? null;

  /** Asks the next question, or — when nothing is left to ask — shows the card. */
  const proceed = (draft: ParsedTask, text: string, settled: Settled) => {
    const gap = clarify(text, draft, world(), settled);
    setMessages((list) => [
      ...list,
      gap
        ? { id: newId(), from: 'bot', kind: 'ask', gap, draft, text, settled }
        : { id: newId(), from: 'bot', intent: { kind: 'task', task: draft } },
    ]);
  };

  /** Closes a question, shows the answer as the person's own bubble, then carries on. */
  const answer = (ask: Ask, label: string, draft: ParsedTask, settled: Settled, note?: string) => {
    setMessages((list) => [
      ...list.map((m) => (m.id === ask.id ? { ...m, answered: true } : m)),
      { id: newId(), from: 'me', text: label },
      ...(note ? [{ id: newId(), from: 'bot' as const, kind: 'note' as const, text: note }] : []),
    ]);
    timers.current.push(setTimeout(() => proceed(draft, ask.text, settled), 350));
  };

  /** Closes a question and asks a different one in its place, for the same sentence. */
  const reask = (ask: Ask, label: string, gap: Gap) => {
    setMessages((list) => [
      ...list.map((m) => (m.id === ask.id ? { ...m, answered: true } : m)),
      { id: newId(), from: 'me', text: label },
      { id: newId(), from: 'bot', kind: 'ask', gap, draft: ask.draft, text: ask.text, settled: ask.settled },
    ]);
  };

  const choose = (ask: Ask, option: AskOption) => {
    const action: AskAction = option.action;
    if (action.kind === 'who') {
      answer(ask, option.label, withWho(ask.draft, action.contact), { ...ask.settled, who: true });
    } else if (action.kind === 'add') {
      // A name and nothing else: Compose asks for the number when they are first messaged.
      const person = addContact({ name: action.name });
      answer(ask, option.label, withWho(ask.draft, person), { ...ask.settled, who: true }, copy.ask.added.replace('{n}', action.name));
    } else if (action.kind === 'elsewhere') {
      reask(ask, option.label, { kind: 'who-missing', suggestions: suggestWho(ask.draft.type, world()) });
    } else {
      answer(ask, option.label, withWhen(ask.draft, action.iso), { ...ask.settled, when: true });
    }
  };

  /** A typed reply to the open question: no Assistant request is spent on it. */
  const reply = (ask: Ask, text: string) => {
    const found = answerFromText(ask.gap, text, world());
    if (found.kind === 'who') {
      answer(ask, text, withWho(ask.draft, found.contact), { ...ask.settled, who: true });
    } else if (found.kind === 'when') {
      answer(ask, text, withWhen(ask.draft, found.iso), { ...ask.settled, when: true });
    } else if (found.kind === 'who-several') {
      reask(ask, text, { kind: 'who-ambiguous', name: found.name, options: found.options });
    } else if (found.kind === 'who-new') {
      reask(ask, text, { kind: 'who-unknown', name: found.name });
    } else {
      setMessages((list) => [
        ...list,
        { id: newId(), from: 'me', text },
        { id: newId(), from: 'bot', kind: 'note', text: copy.ask.unreadable },
      ]);
    }
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    // Mid-question, typing answers it. The suggestion chips are always a new message.
    if (pending && raw === undefined) {
      setInput('');
      reply(pending, text);
      return;
    }
    if (!meter.ready) return;
    if (pending) setMessages((list) => list.map((m) => ('kind' in m && m.kind === 'ask' ? { ...m, answered: true } : m)));
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
      setTimeout(() => {
        // A task is checked for what is missing before it is shown for "Looks right".
        if (intent.kind === 'task') proceed(intent.task, text, {});
        else setMessages((list) => [...list, { id: newId(), from: 'bot', intent }]);
      }, REPLY_DELAY)
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
                      : m.kind === 'saved'
                        ? t.botSaved.replace('{t}', m.time)
                        : m.kind === 'note'
                          ? m.text
                          : questionFor(m.gap, m.draft, copy)
                    : m.intent.kind === 'task'
                      ? t.botTask
                      : m.intent.kind === 'plan'
                        ? t.botPlan
                        : followUpLine}
                </Bubble>
                {'kind' in m && m.kind === 'ask' && !m.answered ? (
                  <AskChips
                    testID="assistant-ask"
                    options={optionsFor(m.gap, m.draft, copy, quick, new Date())}
                    onPick={(option) => choose(m, option)}
                  />
                ) : null}
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

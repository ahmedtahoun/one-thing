/**
 * An answer the Assistant found in the app's own data, drawn in the chat.
 *
 * `src/lib/parse/ask-data.ts` decides *what* answers a question and hands
 * back the people, tasks or follow-ups themselves; this writes the line in
 * the person's language and draws what can be tapped — call, WhatsApp, email,
 * a profile, a task, a follow-up's "Replied". Nothing here reads data or
 * saves any: every action is handed up to the screen.
 *
 * The sentence over the card is ./answer-line.ts, which is pure and has no
 * React Native in it, so the copy for every shape is checked in both
 * languages without a renderer.
 */
import { Pressable, View } from 'react-native';

import type { Added } from '@/content/additions';
import { own } from '@/lib/bidi';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, status, surface, typeColour } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import { displayName, type Contact, type FollowUp, type HistoryEntry, type Task } from '@/lib/model-types';
import { waitingByPerson, type DataAnswer, type Want } from '@/lib/parse/ask-data';
import { MAX_ROWS } from './answer-line';

export type DataCardProps = {
  answer: DataAnswer;
  copy: Added['qa'];
  /** "Tue · 14:30" for a task's own day, written by the screen. */
  whenLabel: (iso: string | null) => string;
  onContact: (contact: Contact) => void;
  onCall: (contact: Contact) => void;
  onWhatsApp: (contact: Contact) => void;
  onEmail: (contact: Contact) => void;
  onTask: (task: Task) => void;
  onFollowUps: () => void;
  /** Every open wait on that person: one reply answers them all. */
  onReplied: (followUps: FollowUp[]) => void;
  /** Tick a task off from the chat. Undo is the screen's business. */
  onDone: (task: Task) => void;
  /** A line of the day's log opens the person it was with. */
  onLogEntry: (entry: HistoryEntry) => void;
  /**
   * One of several people with that name, chosen. The question that was
   * asked comes back with it, so choosing answers it instead of walking
   * away from it onto a profile.
   */
  onWhich: (contact: Contact, want: Want) => void;
  /** "Search People" on a question about somebody the app does not know. */
  onFindPerson: (want: Want) => void;
  /** Today's One Thing: start its focus session, tick it off, or name one. */
  onFocus: () => void;
  onOneThingDone: () => void;
  onChooseOneThing: () => void;
  /**
   * What is done *now*, read from the live lists. An answer is a snapshot
   * of when it was asked; these let its rows show a tick the moment one is
   * pressed, and lose it again on Undo.
   */
  doneTasks?: ReadonlySet<string>;
  closedFollowUps?: ReadonlySet<string>;
  oneThingDone?: boolean;
};

export function DataCard(props: DataCardProps) {
  const { answer, copy } = props;
  const dir = useDirection();

  const frame = (children: React.ReactNode, testID: string) => (
    <View testID={testID} style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, backgroundColor: surface.white, overflow: 'hidden' }}>
      {children}
    </View>
  );

  const row = (
    key: string,
    testID: string,
    onPress: () => void,
    left: React.ReactNode,
    title: string,
    sub: string,
    right?: React.ReactNode,
    first = false,
    done = false
  ) => (
    <Pressable
      key={key}
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: surface.lineFaint,
        backgroundColor: pressed ? surface.fill : 'transparent',
      })}
    >
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          token="bodyS"
          weight="600"
          numberOfLines={1}
          color={done ? ink.muted : ink.base}
          style={done ? { textDecorationLine: 'line-through' } : undefined}
        >
          {own(title)}
        </Text>
        {sub ? (
          <Text token="micro" color={ink.s4} numberOfLines={1}>
            {own(sub)}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );

  const more = (total: number) =>
    total > MAX_ROWS ? (
      <Text token="micro" color={ink.s4} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
        {copy.more.replace('{n}', String(total - MAX_ROWS))}
      </Text>
    ) : null;

  /** `done` turns it green with a tick: the action went through. */
  const pill = (testID: string, label: string, onPress: () => void, done = false) => (
    <Pressable
      key={testID}
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={done ? { checked: true } : undefined}
      style={({ pressed }) => ({
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 5,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: done ? status.successBg : surface.line,
        backgroundColor: done ? status.successBg : pressed ? surface.fill : surface.white,
      })}
    >
      {done ? <Icon name="check" size={14} color={status.successFg} strokeWidth={2.6} /> : null}
      <Text token="caption" weight="600" color={done ? status.successFg : ink.base}>
        {label}
      </Text>
    </Pressable>
  );

  if (answer.kind === 'person') {
    const c = answer.contact;
    return (
      <View testID="qa-person" style={{ flexDirection: dir.row, gap: 8, flexWrap: 'wrap' }}>
        {c.phone ? pill('qa-call', copy.call, () => props.onCall(c)) : null}
        {c.phone ? pill('qa-whatsapp', copy.whatsapp, () => props.onWhatsApp(c)) : null}
        {c.email ? pill('qa-email', copy.email, () => props.onEmail(c)) : null}
        {pill('qa-profile', copy.profile, () => props.onContact(c))}
      </View>
    );
  }

  if (answer.kind === 'who') {
    const want = answer.want;
    return frame(
      answer.options
        .slice(0, MAX_ROWS)
        .map((c, i) => row(c.id, `qa-who-${c.id}`, () => props.onWhich(c, want), null, c.name, c.role ?? '', undefined, i === 0)),
      'qa-who'
    );
  }

  /**
   * Nobody of that name. The question stays answerable: People is searched
   * from here rather than from another screen, and picking somebody answers
   * what was asked about them.
   */
  if (answer.kind === 'nobody') {
    return (
      <View testID="qa-nobody" style={{ flexDirection: dir.row, gap: 8, flexWrap: 'wrap' }}>
        {pill('qa-find', copy.find, () => props.onFindPerson(answer.want))}
      </View>
    );
  }

  if (answer.kind === 'history') {
    if (answer.entries.length === 0) return null;
    return frame(
      <>
        {answer.entries
          .slice(0, MAX_ROWS)
          .map((e, i) => row(e.id, `qa-history-${e.id}`, () => props.onContact(answer.contact), null, e.text, props.whenLabel(e.at), undefined, i === 0))}
        {more(answer.entries.length)}
      </>,
      'qa-history'
    );
  }

  /** One task's row, with the tick that closes it without leaving the chat. */
  const taskRow = (task: Task, i: number) =>
    row(
      task.id,
      `qa-task-${task.id}`,
      () => props.onTask(task),
      <Icon name={TYPE_ICON[task.type]} size={16} color={typeColour[task.type].fg} strokeWidth={1.9} />,
      task.title,
      [task.who, props.whenLabel(task.dueAt)].filter(Boolean).join(' · '),
      pill(`qa-done-${task.id}`, copy.done, () => props.onDone(task), props.doneTasks?.has(task.id) ?? false),
      i === 0,
      props.doneTasks?.has(task.id) ?? false
    );

  if (answer.kind === 'tasks') {
    if (answer.tasks.length === 0) return null;
    return frame(
      <>
        {answer.tasks.slice(0, MAX_ROWS).map((task, i) => taskRow(task, i))}
        {more(answer.tasks.length)}
      </>,
      'qa-tasks'
    );
  }

  if (answer.kind === 'next') {
    if (!answer.task) return null;
    return frame(taskRow(answer.task, 0), 'qa-next');
  }

  /**
   * The One Thing is the one answer that is a decision rather than a list,
   * so its card is buttons: start the focus session it already carries, tick
   * it off, or — with none named — go and name one.
   */
  if (answer.kind === 'oneThing') {
    const one = answer.oneThing;
    const oneDone = props.oneThingDone ?? one?.done ?? false;
    return (
      <View testID="qa-one-thing" style={{ flexDirection: dir.row, gap: 8, flexWrap: 'wrap' }}>
        {!one ? pill('qa-choose', copy.choose, props.onChooseOneThing) : null}
        {one && !oneDone ? pill('qa-focus', copy.focus, props.onFocus) : null}
        {one ? pill('qa-one-done', copy.done, props.onOneThingDone, oneDone) : null}
      </View>
    );
  }

  if (answer.kind === 'log') {
    if (answer.entries.length === 0) return null;
    return frame(
      <>
        {answer.entries
          .slice(0, MAX_ROWS)
          .map((e, i) => row(e.id, `qa-log-${e.id}`, () => props.onLogEntry(e), null, e.text, props.whenLabel(e.at), undefined, i === 0))}
        {more(answer.entries.length)}
      </>,
      'qa-log'
    );
  }

  /**
   * Everything open with one person: their tasks, then the replies they owe.
   * Two sources in one card on purpose — the question was about the person,
   * not about which of the app's lists their commitments are filed in.
   */
  if (answer.kind === 'withPerson') {
    const groups = waitingByPerson(answer.followUps);
    if (answer.tasks.length === 0 && groups.length === 0) return null;
    return frame(
      <>
        {answer.tasks.slice(0, MAX_ROWS).map((task, i) => taskRow(task, i))}
        {groups.slice(0, Math.max(0, MAX_ROWS - answer.tasks.length)).map((group, i) => {
          const f = group[0]!;
          const closed = group.every((g) => props.closedFollowUps?.has(g.id));
          return row(
            f.id,
            `qa-with-wait-${f.id}`,
            props.onFollowUps,
            null,
            f.what,
            group.length > 1 ? `${displayName(f.who)} · ×${group.length}` : displayName(f.who),
            pill(`qa-replied-${f.id}`, copy.replied, () => props.onReplied(group), closed),
            answer.tasks.length === 0 && i === 0,
            closed
          );
        })}
        {more(answer.tasks.length + groups.length)}
      </>,
      'qa-with-person'
    );
  }

  if (answer.kind === 'findTask') {
    if (answer.tasks.length === 0) return null;
    return frame(
      <>
        {answer.tasks.slice(0, MAX_ROWS).map((task, i) => taskRow(task, i))}
        {more(answer.tasks.length)}
      </>,
      'qa-found-task'
    );
  }

  if (answer.kind === 'waiting') {
    const people = waitingByPerson(answer.items);
    if (people.length === 0) return null;
    return frame(
      <>
        {people.slice(0, MAX_ROWS).map((group, i) => {
          const f = group[0]!;
          const closed = group.every((g) => props.closedFollowUps?.has(g.id));
          return row(
            f.id,
            `qa-waiting-${f.id}`,
            props.onFollowUps,
            null,
            displayName(f.who),
            group.length > 1 ? `${f.what} · ×${group.length}` : f.what,
            pill(`qa-replied-${f.id}`, copy.replied, () => props.onReplied(group), closed),
            i === 0,
            closed
          );
        })}
        {more(people.length)}
      </>,
      'qa-waiting'
    );
  }

  if (answer.kind === 'quiet') {
    if (answer.items.length === 0) return null;
    return frame(
      <>
        {answer.items
          .slice(0, MAX_ROWS)
          .map((q, i) =>
            row(
              q.contact.id,
              `qa-quiet-${q.contact.id}`,
              () => props.onContact(q.contact),
              null,
              q.contact.name,
              copy.quietDays.replace('{n}', String(q.days)),
              undefined,
              i === 0
            )
          )}
        {more(answer.items.length)}
      </>,
      'qa-quiet'
    );
  }

  if (answer.kind === 'people') {
    if (answer.contacts.length === 0) return null;
    return frame(
      <>
        {answer.contacts
          .slice(0, MAX_ROWS)
          .map((c, i) => row(c.id, `qa-people-${c.id}`, () => props.onContact(c), null, c.name, c.role ?? '', undefined, i === 0))}
        {more(answer.contacts.length)}
      </>,
      'qa-people'
    );
  }

  return null;
}

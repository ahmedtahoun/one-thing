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
 * React Native in it, so the copy for all nine shapes is checked in both
 * languages without a renderer.
 */
import { Pressable, View } from 'react-native';

import type { Added } from '@/content/additions';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, surface, typeColour } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import { displayName, type Contact, type FollowUp, type HistoryEntry, type Task } from '@/lib/model-types';
import type { DataAnswer } from '@/lib/parse/ask-data';
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
  onReplied: (followUp: FollowUp) => void;
  /** Tick a task off from the chat. Undo is the screen's business. */
  onDone: (task: Task) => void;
  /** A line of the day's log opens the person it was with. */
  onLogEntry: (entry: HistoryEntry) => void;
  /** Today's One Thing: start its focus session, tick it off, or name one. */
  onFocus: () => void;
  onOneThingDone: () => void;
  onChooseOneThing: () => void;
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
    first = false
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
        <Text token="bodyS" weight="600" numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text token="micro" color={ink.s4} numberOfLines={1}>
            {sub}
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

  const pill = (testID: string, label: string, onPress: () => void) => (
    <Pressable
      key={testID}
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: surface.line,
        backgroundColor: pressed ? surface.fill : surface.white,
      })}
    >
      <Text token="caption" weight="600">
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
    return frame(
      answer.options
        .slice(0, MAX_ROWS)
        .map((c, i) => row(c.id, `qa-who-${c.id}`, () => props.onContact(c), null, c.name, c.role ?? '', undefined, i === 0)),
      'qa-who'
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
      pill(`qa-done-${task.id}`, copy.done, () => props.onDone(task)),
      i === 0
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
    return (
      <View testID="qa-one-thing" style={{ flexDirection: dir.row, gap: 8, flexWrap: 'wrap' }}>
        {!one ? pill('qa-choose', copy.choose, props.onChooseOneThing) : null}
        {one && !one.done ? pill('qa-focus', copy.focus, props.onFocus) : null}
        {one ? pill('qa-one-done', one.done ? copy.undone : copy.done, props.onOneThingDone) : null}
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

  if (answer.kind === 'waiting') {
    if (answer.items.length === 0) return null;
    return frame(
      <>
        {answer.items.slice(0, MAX_ROWS).map((f, i) =>
          row(
            f.id,
            `qa-waiting-${f.id}`,
            props.onFollowUps,
            null,
            displayName(f.who),
            f.what,
            pill(`qa-replied-${f.id}`, copy.replied, () => props.onReplied(f)),
            i === 0
          )
        )}
        {more(answer.items.length)}
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

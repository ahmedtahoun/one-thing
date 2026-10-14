/**
 * The cards that say what to do now, as a block to place on a screen that has
 * a Toast mounted. Today shows it; there is no separate tab for it.
 *
 * Three lead: what is late, who owes you a reply, what is due today, and which
 * favourite has gone quiet. Each says why it is here and puts the real action
 * one tap away (WhatsApp, call, email, nudge). "Later" moves it to tomorrow
 * morning; the tick closes it.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import { useNudge } from '@/features/followups/nudge';
import { primaryChannel } from '@/features/people/channel';
import { useStartTask } from '@/features/people/start-task';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { ink, status } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useCadence } from '@/lib/cadence';
import { useFavorites } from '@/lib/favorites';
import { hideUntil, unhide, useHiddenCards } from '@/lib/next-state';
import { usePeople } from '@/lib/people';
import { remindAt } from '@/lib/reminders';
import { useTasks } from '@/lib/tasks';

import { buildNext, MAX_TOP, tomorrowMorning, type NextCard } from './build';
import { NextCardView } from './NextCardView';

const QUIET_PAUSE_DAYS = 7;

export function NextList({ now, onNothing, hideWhenNothing = false }: { now: Date; onNothing?: ReactNode; hideWhenNothing?: boolean }) {
  const { lang, t } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).next;
  const toast = useToast();

  const { tasks, toggleDone, updateTask, restore } = useTasks();
  const { contacts, followUps, updateFollowUp, restoreFollowUps } = usePeople();
  const favorites = useFavorites();
  const cadence = useCadence();
  const hidden = useHiddenCards();
  const nudge = useNudge();
  const start = useStartTask();
  const [all, setAll] = useState(false);

  const { cards } = useMemo(
    () => buildNext({ tasks, followUps, contacts, favorites, cadence, hidden, now }),
    [tasks, followUps, contacts, favorites, cadence, hidden, now]
  );
  const shown = all ? cards : cards.slice(0, MAX_TOP);

  const open = useCallback(
    (card: NextCard) => {
      if (card.source === 'task' && card.taskId) return router.push(`/compose?id=${card.taskId}`);
      if (card.source === 'followup') {
        const f = followUps.find((x) => x.id === card.followUpId);
        if (f) nudge(f);
        return;
      }
      const person = contacts.find((c) => c.id === card.contactId);
      if (person) start(person, primaryChannel(person) ?? 'whatsapp', 'checkin');
    },
    [followUps, contacts, nudge, start]
  );

  const done = useCallback(
    (card: NextCard) => {
      if (card.source === 'task' && card.taskId) {
        const before = tasks;
        toggleDone(card.taskId);
        toast.show(t.toastDone, { undo: () => restore(before) });
      } else if (card.source === 'followup' && card.followUpId) {
        const before = followUps;
        updateFollowUp(card.followUpId, { status: 'done', lastAction: 'closed', lastActionAt: new Date().toISOString() });
        toast.show(t.toastDone, { undo: () => restoreFollowUps(before) });
      }
    },
    [tasks, followUps, toggleDone, updateFollowUp, restore, restoreFollowUps, toast, t.toastDone]
  );

  const later = useCallback(
    (card: NextCard) => {
      const when = tomorrowMorning(new Date());
      if (card.source === 'task' && card.taskId) {
        const task = tasks.find((x) => x.id === card.taskId);
        if (!task) return;
        const before = tasks;
        const dueAt = when.toISOString();
        updateTask(task.id, { status: 'open', snoozedUntil: null, dueAt, remindAt: remindAt({ ...task, dueAt }) });
        toast.show(copy.toastLater, { undo: () => restore(before) });
      } else if (card.source === 'followup' && card.followUpId) {
        const before = followUps;
        updateFollowUp(card.followUpId, { status: 'waiting', nextAt: when.toISOString() });
        toast.show(copy.toastLater, { undo: () => restoreFollowUps(before) });
      } else {
        const until = new Date(Date.now() + QUIET_PAUSE_DAYS * 86400000);
        hideUntil(card.id, until).catch(() => {});
        toast.show(copy.toastQuiet, { undo: () => void unhide(card.id) });
      }
    },
    [tasks, followUps, updateTask, updateFollowUp, restore, restoreFollowUps, toast, copy.toastLater, copy.toastQuiet]
  );

  if (cards.length === 0) {
    if (hideWhenNothing) return null;
    if (onNothing) return <>{onNothing}</>;
    return (
      <View testID="next-empty" style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingVertical: 14 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: status.successBgSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={18} color={status.successFg} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text token="body" weight="600">
            {copy.emptyTitle}
          </Text>
          <Text token="caption" color={ink.s4}>
            {copy.emptyBody}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {shown.map((card) => (
        <NextCardView
          key={card.id}
          card={card}
          copy={copy}
          onPrimary={() => open(card)}
          onDone={() => done(card)}
          onLater={() => later(card)}
        />
      ))}
      {cards.length > MAX_TOP ? (
        <Pressable
          testID="next-more"
          onPress={() => setAll((v) => !v)}
          accessibilityRole="button"
          style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 }}
        >
          <Text token="bodyS" weight="600" color={ink.s3}>
            {all ? copy.less : copy.more.replace('{n}', String(cards.length - MAX_TOP))}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

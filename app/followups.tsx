/**
 * 14 · Follow-ups — who owes the user a reply. SCREENS.md § 14.
 *
 * Container is 8 / 20 / 120 with an 18 pt gap, under the tab bar. Three
 * segments — Nudge (overdue), Waiting, Closed — over a list of cards. Nudge
 * creates a follow-up task with a ready draft and opens Compose on it; it
 * never sends anything (README § Global behaviour).
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { TabBar } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { type IconName } from '@/design/icon-paths';
import { ink, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import {
  displayName,
  followUpStatus,
  initials,
  type Channel,
  type FollowUp,
  type FollowUpStatus,
} from '@/lib/model-types';
import { usePeople } from '@/lib/people';
import { useTasks } from '@/lib/tasks';

const BOTTOM_INSET = 120;

/** The three segments, in order, and the status each one lists. */
const SEGMENTS: FollowUpStatus[] = ['due', 'waiting', 'done'];

const CHANNEL_ICON: Record<Channel, IconName> = { whatsapp: 'msg', email: 'mail', call: 'phone' };

export default function FollowUps() {
  const { t, fux, inline } = useLanguage();
  const dir = useDirection();
  const { followUps, updateFollowUp, restoreFollowUps } = usePeople();
  const { addTask } = useTasks();
  const toast = useToast();
  const [segment, setSegment] = useState(0);
  const [now] = useState(() => new Date());

  const withStatus = useMemo(
    () => followUps.map((f) => ({ f, status: followUpStatus(f, now) })),
    [followUps, now]
  );
  const count = (s: FollowUpStatus) => withStatus.filter((x) => x.status === s).length;
  const counts = SEGMENTS.map(count);
  const [nDue, nWaiting] = counts as [number, number, number];
  const rows = withStatus.filter((x) => x.status === SEGMENTS[segment]);

  const summary =
    nDue + nWaiting === 0
      ? fux.sum0
      : fux.sum.replace('{a}', String(nDue)).replace('{b}', String(nWaiting));

  /**
   * A follow-up task with the draft already written, then Compose. The
   * prototype runs this from both buttons — Nudge on an overdue card and
   * Remind me on a waiting one — so this does too (BUILD-REVIEW.md §2.19).
   */
  const nudge = useCallback(
    (f: FollowUp) => {
      const what = f.what.toLowerCase();
      const first = displayName(f.who).split(' ')[0] ?? '';
      const task = addTask({
        type: f.channel,
        title: inline.nudgeTitle.replace('{what}', f.what),
        who: f.who,
        contactIds: f.contactId ? [f.contactId] : [],
        dueAt: new Date().toISOString(),
        goal: inline.nudgeGoal.replace('{what}', what),
        points: [...inline.nudgePoints],
        draft: { body: inline.nudgeDraft.replace('{n}', first).replace('{what}', what) },
        createdVia: 'followup',
      });
      updateFollowUp(f.id, { taskId: task.id, lastAction: 'nudged', lastActionAt: new Date().toISOString() });
      router.push(`/compose?id=${task.id}`);
    },
    [addTask, updateFollowUp, inline]
  );

  const close = useCallback(
    (f: FollowUp) => {
      const before = followUps;
      updateFollowUp(f.id, { status: 'done', lastAction: 'closed', lastActionAt: new Date().toISOString() });
      toast.show(fux.toastClose.replace('{n}', displayName(f.who)), { undo: () => restoreFollowUps(before) });
    },
    [followUps, updateFollowUp, restoreFollowUps, toast, fux.toastClose]
  );

  const reopen = useCallback(
    (f: FollowUp) => updateFollowUp(f.id, { status: 'waiting', lastAction: null, lastActionAt: null }),
    [updateFollowUp]
  );

  const empty = fux.empty[segment] ?? ['', ''];

  return (
    <>
      <Screen scroll paddingTop={8} paddingBottom={BOTTOM_INSET} style={{ gap: 18 }}>
        <View style={{ gap: 6 }}>
          <Text token="h1">{t.fu_t}</Text>
          <Text token="body" color={ink.s3} testID="followups-summary">
            {summary}
          </Text>
        </View>

        <View style={{ flexDirection: dir.row, backgroundColor: surface.fill, borderRadius: 14, padding: 4, gap: 4 }}>
          {fux.tabs.map((label, i) => {
            const on = i === segment;
            const n = counts[i] ?? 0;
            const alert = i === 0 && n > 0;
            return (
              <Pressable
                key={label}
                testID={`followups-tab-${SEGMENTS[i]}`}
                onPress={() => setSegment(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: on ? surface.white : 'transparent',
                  flexDirection: dir.row,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  ...(on
                    ? {
                        shadowColor: '#000',
                        shadowOpacity: 0.12,
                        shadowRadius: 3,
                        shadowOffset: { width: 0, height: 1 },
                        elevation: 1,
                      }
                    : null),
                }}
              >
                <Text token="caption" weight="500">
                  {label}
                </Text>
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    paddingHorizontal: 5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alert ? status.countBadge : on ? ink.base : surface.countIdle,
                  }}
                >
                  <Text size={11} weight="600" color={alert || on ? surface.white : ink.s3} tabular align="center">
                    {n}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 10 }}>
          {rows.map(({ f, status: s }) => (
            <FollowUpCard
              key={f.id}
              f={f}
              status={s}
              onNudge={() => nudge(f)}
              onClose={() => close(f)}
              onReopen={() => reopen(f)}
            />
          ))}

          {rows.length === 0 ? (
            <View testID="followups-empty" style={{ alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 20 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: status.successBgSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size={24} color={status.successFg} strokeWidth={2.4} />
              </View>
              <Text token="title" align="center">
                {empty[0]}
              </Text>
              <Text token="bodyS" color={ink.s4} align="center">
                {empty[1]}
              </Text>
            </View>
          ) : null}
        </View>
      </Screen>

      <TabBar
        active="followups"
        onSelect={(key) => router.push(`/${key}`)}
        onCapture={() => router.push('/capture')}
        onBrainDump={() => router.push('/brain-dump')}
      />
      <Toast />
    </>
  );
}

function FollowUpCard({
  f,
  status: s,
  onNudge,
  onClose,
  onReopen,
}: {
  f: FollowUp;
  status: FollowUpStatus;
  onNudge: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  const { fux, inline } = useLanguage();
  const dir = useDirection();
  const who = displayName(f.who);
  const due = s === 'due';
  const done = s === 'done';
  const since = f.lastAction === 'nudged' ? inline.draftReadyNote : f.lastAction === 'closed' ? fux.closedNow : f.since;

  const pill = due
    ? { label: fux.due, bg: status.dangerBg, fg: status.overdueFg }
    : done
      ? { label: fux.closed, bg: status.successBgSoft, fg: status.successFg }
      : { label: fux.wait, bg: surface.fill, fg: ink.s3 };

  return (
    <View
      testID={`followup-${f.id}`}
      style={{
        backgroundColor: surface.white,
        borderWidth: 1,
        borderColor: surface.cardLine,
        borderRadius: 20,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12 }}>
        <View>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: surface.avatar,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text token="bodyS" weight="600" color={ink.s2} align="center">
              {initials(who)}
            </Text>
          </View>
          {/* The channel, as a small badge on the avatar's lower end corner.
              A physical side, not `end`: React Native Web resolves `end`
              from the app-wide direction, not the one set on the screen. */}
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              ...(dir.isRTL ? { left: -2 } : { right: -2 }),
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: surface.white,
              backgroundColor: typeColour[f.channel].bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={CHANNEL_ICON[f.channel]} size={11} color={typeColour[f.channel].fg} strokeWidth={2.4} />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text token="body" weight="600">
            {who}
          </Text>
          <Text token="bodyS" color={ink.s2}>
            {f.what}
          </Text>
        </View>
        <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: pill.bg }}>
          <Text token="micro" weight="500" color={pill.fg} numberOfLines={1}>
            {pill.label}
          </Text>
        </View>
      </View>

      {done ? (
        <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
          <Text token="micro" color={ink.s5}>
            {since}
          </Text>
          <Pressable
            testID={`followup-${f.id}-reopen`}
            onPress={onReopen}
            accessibilityRole="button"
            style={{ paddingVertical: 6 }}
          >
            <Text token="caption" weight="500">
              {fux.reopen}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
          <Text token="micro" color={ink.s5} style={{ flex: 1 }}>
            {since}
          </Text>
          <Pressable
            testID={`followup-${f.id}-close`}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={fux.closeL}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: surface.line,
              backgroundColor: surface.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={16} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            testID={`followup-${f.id}-nudge`}
            onPress={onNudge}
            accessibilityRole="button"
            style={{
              height: 40,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: due ? ink.base : surface.fill,
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name={due ? 'send' : 'bell'} size={14} color={due ? surface.white : ink.base} strokeWidth={2} />
            <Text token="bodyS" weight="500" color={due ? surface.white : ink.base}>
              {due ? fux.nudge : fux.remind}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

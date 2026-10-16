/**
 * 14 · Follow-ups — who owes the user a reply. SCREENS.md § 14.
 *
 * Three segments — Nudge (overdue), Waiting, Closed — over a list of cards.
 * Nudge creates a follow-up task with a ready draft and opens Compose on it;
 * it never sends anything (README § Global behaviour).
 *
 * This used to be a tab of its own. It is now a panel inside People — the
 * "Follow-ups" chip after Recent — because a follow-up is always about a
 * person, and one place to look is fewer taps than two.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useNudge } from '@/features/followups/nudge';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';
import { ink, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import {
  displayName,
  followUpStatus,
  type FollowUp,
  type FollowUpStatus,
} from '@/lib/model-types';
import { usePeople } from '@/lib/people';

/** The three segments, in order, and the status each one lists. */
const SEGMENTS: FollowUpStatus[] = ['due', 'waiting', 'done'];

/** The follow-ups, as a block to place on a screen that has a Toast mounted. */
export function FollowUpsPanel() {
  const { fux } = useLanguage();
  const dir = useDirection();
  const { followUps, updateFollowUp, restoreFollowUps } = usePeople();
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

  const nudge = useNudge();

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
    <View style={{ gap: 18 }}>
        <Text token="body" color={ink.s3} testID="followups-summary">
          {summary}
        </Text>

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
                    backgroundColor: alert ? status.countBadge : on ? ink.solid : surface.countIdle,
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
    </View>
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
        <Avatar name={who} contactId={f.contactId ?? undefined} size={46} channel={f.channel} />
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
              backgroundColor: due ? ink.solid : surface.fill,
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

/**
 * One "small promise" row. SCREENS.md § 06.
 *
 * Swipe right marks it done (WhatsApp green behind), swipe left opens
 * reschedule (reminder purple behind). The thresholds and the 150 pt travel
 * limit come from the prototype's own drag handling. In Arabic the gesture
 * mirrors, so the physical direction is converted to a logical one first.
 */
import { clockOf } from '@/lib/clock-format';
import { useRef } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { LTRText, Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, radius, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import type { InlineCopy } from '@/content/inline-copy';
import { minutesUntil, type Task } from '@/lib/model-types';

/** How far a swipe must travel before it commits. */
const COMMIT = 90;

/** How far the row can be dragged. */
const MAX_TRAVEL = 150;

export function TaskRow({
  task,
  showRelative,
  onToggle,
  onOpen,
  onReschedule,
}: {
  task: Task;
  /** The "in 40 min" line, shown only on the next upcoming task. */
  showRelative: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onReschedule: () => void;
}) {
  const { t, inline, isRTL } = useLanguage();
  const dir = useDirection();
  const colour = typeColour[task.type];
  const done = task.status === 'done';

  const dx = useRef(new Animated.Value(0)).current;
  // Read in the pan handlers, which cannot see React state updates.
  const travel = useRef(0);

  const settle = () => {
    Animated.timing(dx, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  };

  const pan = useRef(
    PanResponder.create({
      // Only claim the gesture once it is clearly horizontal, so the list
      // can still be scrolled vertically through a row.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => {
        travel.current = Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, g.dx));
        dx.setValue(travel.current);
      },
      onPanResponderRelease: () => {
        const logical = travel.current * (isRTL ? -1 : 1);
        travel.current = 0;
        settle();
        if (logical > COMMIT) onToggle();
        else if (logical < -COMMIT) onReschedule();
      },
      onPanResponderTerminate: () => {
        travel.current = 0;
        settle();
      },
    })
  ).current;

  // The colour behind the row depends on which way it is being pulled.
  const behind = dx.interpolate({
    inputRange: [-MAX_TRAVEL, -1, 0, 1, MAX_TRAVEL],
    outputRange: [
      typeColour.reminder.fg,
      typeColour.reminder.fg,
      'transparent',
      typeColour.whatsapp.fg,
      typeColour.whatsapp.fg,
    ],
    extrapolate: 'clamp',
  });

  const minutes = minutesUntil(task);
  const relative =
    showRelative && minutes !== null && minutes > 0
      ? t.relIn.replace('{m}', formatGap(minutes, inline))
      : '';

  return (
    <Animated.View style={{ borderRadius: radius.cardTight, overflow: 'hidden', backgroundColor: behind }}>
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          flexDirection: dir.row,
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}
      >
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 6 }}>
          <Icon name="check" size={16} color={surface.white} strokeWidth={2.4} />
          <Text token="caption" weight="600" color={surface.white}>
            {t.nDone}
          </Text>
        </View>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 6 }}>
          <Text token="caption" weight="600" color={surface.white}>
            {t.resched}
          </Text>
          <Icon name="clock" size={16} color={surface.white} strokeWidth={2.2} />
        </View>
      </View>

      <Animated.View
        {...pan.panHandlers}
        style={{
          flexDirection: dir.row,
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: surface.fill2,
          transform: [{ translateX: dx }],
        }}
      >
        <Pressable
          testID={`task-check-${task.id}`}
          onPress={onToggle}
          accessibilityRole="checkbox"
          // Named after the task, for the same reason as the Tasks row (§2.99).
          accessibilityLabel={task.title}
          accessibilityState={{ checked: done }}
          hitSlop={8}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1.5,
            borderColor: ink.base,
            backgroundColor: done ? ink.solid : surface.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done ? <Icon name="check" size={14} color={surface.white} strokeWidth={2.4} /> : null}
        </Pressable>

        <Pressable
          testID={`task-open-${task.id}`}
          onPress={onOpen}
          accessibilityRole="button"
          style={{ flex: 1, minWidth: 0, flexDirection: dir.row, alignItems: 'center', gap: 12 }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              backgroundColor: colour.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={TYPE_ICON[task.type]} size={18} color={colour.fg} strokeWidth={1.9} />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              token="body"
              weight="500"
              numberOfLines={1}
              color={done ? ink.muted : ink.base}
              style={done ? { textDecorationLine: 'line-through' } : undefined}
            >
              {task.title}
            </Text>
            <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 5 }}>
              <Text token="micro" weight="600" color={colour.fg} numberOfLines={1}>
                {t.types[task.type]}
              </Text>
              {task.who ? (
                <>
                  {/* The separator is its own element so flex ordering, not
                      bidi, decides which side of the type label it sits on. */}
                  <Text token="micro" color={ink.s4}>
                    ·
                  </Text>
                  <Text token="micro" color={ink.s4} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {task.who}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <LTRText token="caption" tabular>
              {clockOf(task.dueAt)}
            </LTRText>
            {relative ? (
              <Text token="eyebrow" weight="500" color={status.dangerFg} style={{ letterSpacing: 0 }}>
                {relative}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * "40 min", or "1h 20m" once it is over an hour, matching the prototype.
 * The suffixes are the handoff's own, ported by scripts/extract-inline-copy.js.
 */
export function formatGap(minutes: number, inline: InlineCopy): string {
  if (minutes < 60) return `${minutes}${inline.minSuffix}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = `${hours}${inline.hourSuffix}`;
  return rest ? `${h}${rest}${inline.minuteSuffix}` : h.trim();
}

/**
 * The dark "Up next" card at the top of Tasks. SCREENS.md § 07.
 *
 * Its primary button is the task's own next step — "Open WhatsApp draft",
 * "Call Mohammed" — and it opens Compose rather than sending anything, which
 * is the handoff's standing rule: nothing is ever sent automatically.
 */
import { Pressable, View } from 'react-native';

import { formatGap } from '@/features/today/TaskRow';
import { Icon } from '@/ui/Icon';
import { LTRText, Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, radius, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { minutesUntil, timeLabel, type Task } from '@/lib/model-types';

export function UpNextCard({
  task,
  now,
  onOpen,
  onReschedule,
  onToggle,
}: {
  task: Task;
  now: Date;
  onOpen: () => void;
  onReschedule: () => void;
  onToggle: () => void;
}) {
  const { t, inline } = useLanguage();
  const dir = useDirection();
  const colour = typeColour[task.type];

  const gap = minutesUntil(task, now) ?? 0;
  const relative = gap <= 0 ? t.nowW : t.relIn.replace('{m}', formatGap(gap, inline));

  // A call names the person; everything else has a fixed verb.
  const action =
    task.type === 'call' && task.who
      ? t.unCall.replace('{n}', task.who.split(' ')[0] ?? '')
      : t.unAct[task.type];

  return (
    <View
      testID="up-next"
      style={{ backgroundColor: ink.base, borderRadius: 22, padding: 18, gap: 14 }}
    >
      <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'center' }}>
        <Text token="eyebrow" weight="400" color={ink.s6}>
          {t.upNext}
        </Text>
        <Text token="micro" weight="600" color={status.onInkUrgent} style={{ letterSpacing: 0 }}>
          {relative}
        </Text>
      </View>

      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        style={{ flexDirection: dir.row, alignItems: 'center', gap: 12 }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            backgroundColor: colour.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={TYPE_ICON[task.type]} size={22} color={colour.fg} strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text token="bodyL" size={18} lh={22.5} weight="600" color={surface.white} numberOfLines={2}>
            {task.title}
          </Text>
          <Text token="caption" color={ink.onInk} numberOfLines={1}>
            {/* The time is an LTR island because it sits next to a name. */}
            <LTRText token="caption" color={ink.onInk} tabular>
              {timeLabel(task.dueAt)}
            </LTRText>
            {task.who ? ` · ${task.who}` : ''}
          </Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: dir.row, gap: 8 }}>
        <Pressable
          testID="up-next-action"
          onPress={onOpen}
          accessibilityRole="button"
          style={{
            flex: 1,
            height: 48,
            borderRadius: 24,
            backgroundColor: surface.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text token="body" weight="600">
            {action}
          </Text>
        </Pressable>
        <CircleButton icon="clock" label={t.resched} onPress={onReschedule} strokeWidth={2} />
        <CircleButton icon="check" label={t.nDone} onPress={onToggle} strokeWidth={2.2} />
      </View>
    </View>
  );
}

/** One of the two 48 pt outlined circles beside the primary action. */
function CircleButton({
  icon,
  label,
  onPress,
  strokeWidth,
}: {
  icon: 'clock' | 'check';
  label: string;
  onPress: () => void;
  strokeWidth: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: surface.onInkLine,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={16} color={surface.white} strokeWidth={strokeWidth} />
    </Pressable>
  );
}

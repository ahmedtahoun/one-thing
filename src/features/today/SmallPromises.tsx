/**
 * Today's "Small promises" section: the red Now divider, up to two rows, and
 * the "See all {n} tasks" link. SCREENS.md § 06.
 */
import { Pressable, View } from 'react-native';

import { TaskRow } from './TaskRow';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ink, radius, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { timeLabel, type Task } from '@/lib/model-types';

/** The design shows two rows on Today; the rest live on the Tasks screen. */
const VISIBLE_ROWS = 2;

export function SmallPromises({
  tasks,
  onToggle,
  onOpen,
  onReschedule,
  onSeeAll,
  onBrainDump,
}: {
  /** Today's tasks, already ordered. */
  tasks: Task[];
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  onReschedule: (task: Task) => void;
  onSeeAll: () => void;
  onBrainDump: () => void;
}) {
  const { t, isRTL } = useLanguage();
  const dir = useDirection();

  // Today's link is a plain "See all"; the counted "See all {n} tasks" is the
  // Tasks screen's own button (app-logic.js: seeAllL vs moreLabel).
  const seeAllLabel = isRTL ? 'الكل' : 'See all';

  const visible = tasks.slice(0, VISIBLE_ROWS);
  // The divider sits above the first task still to come.
  const now = new Date();
  const nowLabel = timeLabel(now.toISOString());
  const nextIndex = tasks.findIndex(
    (task) => task.status !== 'done' && task.dueAt !== null && new Date(task.dueAt) >= now
  );

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text token="title">{t.next}</Text>
        {tasks.length ? (
          <Pressable
            testID="see-all-tasks"
            onPress={onSeeAll}
            accessibilityRole="button"
            hitSlop={8}
            style={{ paddingVertical: 6 }}
          >
            <Text token="caption" weight="500" color={ink.s3}>
              {seeAllLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {tasks.length === 0 ? (
        <EmptyState onBrainDump={onBrainDump} />
      ) : (
        <View style={{ gap: 6 }}>
          {visible.map((task, i) => (
            <View key={task.id} style={{ gap: 6 }}>
              {i === nextIndex ? <NowDivider at={nowLabel} /> : null}
              <TaskRow
                task={task}
                showRelative={i === nextIndex}
                onToggle={() => onToggle(task)}
                onOpen={() => onOpen(task)}
                onReschedule={() => onReschedule(task)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** "● Now · 09:20 ─────" above the next thing due. */
function NowDivider({ at }: { at: string }) {
  const { t } = useLanguage();
  const dir = useDirection();
  return (
    <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8, paddingVertical: 2 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: status.dangerFg }} />
      <Text token="eyebrow" weight="600" color={status.dangerFg} style={{ letterSpacing: 0 }}>
        {t.nowL} · {at}
      </Text>
      <View style={{ flex: 1, height: 1.5, backgroundColor: status.dangerFg, opacity: 0.5 }} />
    </View>
  );
}

/** The dashed "Nothing here yet" card. */
function EmptyState({ onBrainDump }: { onBrainDump: () => void }) {
  const { t } = useLanguage();
  const dir = useDirection();
  return (
    <View
      testID="today-empty"
      style={{
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#DCDBD6',
        borderRadius: radius.card,
        paddingVertical: 26,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Text token="bodyL" weight="600" align="center">
        {t.empty_t}
      </Text>
      <Text token="bodyS" color={ink.s4} align="center">
        {t.empty_s}
      </Text>
      <Pressable
        testID="today-empty-dump"
        onPress={onBrainDump}
        accessibilityRole="button"
        style={{
          marginTop: 6,
          height: 44,
          paddingHorizontal: 18,
          borderRadius: radius.pill,
          backgroundColor: ink.base,
          flexDirection: dir.row,
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon name="mic" size={16} color={surface.white} strokeWidth={1.9} />
        <Text token="bodyS" color={surface.white}>
          {t.empty_cta}
        </Text>
      </Pressable>
    </View>
  );
}

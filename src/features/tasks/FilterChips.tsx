/**
 * The filters inside Home's "All" view: Open · Calls · Emails · WhatsApp ·
 * Reminders · Done. SCREENS.md § 07 — horizontal scroll, no scrollbar. The
 * chips look like People's (filled, round) so one kind of chip reads the same
 * everywhere; the four channels keep their colour dot.
 *
 * The row bleeds into the screen's own side padding (margin −20 / padding 20)
 * so the first chip lines up with the title while the rest can scroll past
 * the edge.
 */
import { Pressable, ScrollView, View } from 'react-native';

import { TASK_FILTERS, type TaskFilter } from './groups';
import { added } from '@/content/additions';
import { Text } from '@/ui/Text';
import { ink, space, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export function FilterChips({
  active,
  onPick,
}: {
  active: TaskFilter;
  onPick: (filter: TaskFilter) => void;
}) {
  const { t, lang } = useLanguage();
  const dir = useDirection();

  const label = (filter: TaskFilter) =>
    filter === 'all' ? added(lang).today.open : filter === 'done' ? t.doneF : t.fl[filter as keyof typeof t.fl];
  // Only the four channel filters carry a colour dot; read when drawn, so the dot follows the theme.
  const dot = (filter: TaskFilter): string | undefined =>
    filter === 'call' || filter === 'email' || filter === 'whatsapp' || filter === 'reminder' ? typeColour[filter].fg : undefined;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -space.screenX, flexGrow: 0 }}
      contentContainerStyle={{ flexDirection: dir.row, gap: 8, paddingHorizontal: space.screenX }}
    >
      {TASK_FILTERS.map((filter) => {
        const on = filter === active;
        const colour = dot(filter);
        return (
          <Pressable
            key={filter}
            testID={`filter-${filter}`}
            onPress={() => onPick(filter)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              height: 38,
              paddingHorizontal: 16,
              borderRadius: 999,
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 7,
              backgroundColor: on ? ink.solid : surface.fill,
            }}
          >
            {colour ? <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: on ? surface.white : colour }} /> : null}
            <Text token="bodyS" weight="600" color={on ? surface.white : ink.s2} numberOfLines={1}>
              {label(filter)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

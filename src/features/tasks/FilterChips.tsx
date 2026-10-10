/**
 * The Tasks filter chips: All · Calls · Emails · WhatsApp · Reminders · Done.
 * SCREENS.md § 07 — horizontal scroll, no scrollbar.
 *
 * The row bleeds into the screen's own side padding (margin −20 / padding 20)
 * so the first chip lines up with the title while the rest can scroll past
 * the edge.
 */
import { Pressable, ScrollView, View } from 'react-native';

import { TASK_FILTERS, type TaskFilter } from './groups';
import { Text } from '@/ui/Text';
import { ink, radius, space, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

/** Only the four channel filters carry a colour dot. */
const DOT: Partial<Record<TaskFilter, string>> = {
  call: typeColour.call.fg,
  email: typeColour.email.fg,
  whatsapp: typeColour.whatsapp.fg,
  reminder: typeColour.reminder.fg,
};

export function FilterChips({
  active,
  onPick,
}: {
  active: TaskFilter;
  onPick: (filter: TaskFilter) => void;
}) {
  const { t } = useLanguage();
  const dir = useDirection();

  const label = (filter: TaskFilter) =>
    filter === 'all' ? t.all : filter === 'done' ? t.doneF : t.fl[filter as keyof typeof t.fl];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -space.screenX, flexGrow: 0 }}
      contentContainerStyle={{ flexDirection: dir.row, gap: 6, paddingHorizontal: space.screenX }}
    >
      {TASK_FILTERS.map((filter) => {
        const on = filter === active;
        const dot = DOT[filter];
        return (
          <Pressable
            key={filter}
            testID={`filter-${filter}`}
            onPress={() => onPick(filter)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              height: 34,
              paddingHorizontal: 12,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: on ? ink.base : surface.line,
              backgroundColor: on ? ink.base : surface.white,
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 6,
            }}
          >
            {dot ? <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: dot }} /> : null}
            <Text token="caption" color={on ? surface.white : ink.base} numberOfLines={1}>
              {label(filter)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * The month grid in the reschedule sheet. SCREENS.md § 07 ("custom date/time
 * (calendar)").
 *
 * Past days are visible but unselectable — the point of the sheet is to move
 * something forward.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { LTRText, Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

/** Grey for a day that has already gone. */
const PAST = '#CFCFCB';

export function Calendar({
  view,
  selected,
  today,
  onView,
  onSelect,
}: {
  /** The month on screen. */
  view: { year: number; month: number };
  selected: Date;
  today: Date;
  onView: (next: { year: number; month: number }) => void;
  onSelect: (day: Date) => void;
}) {
  const { t } = useLanguage();
  const dir = useDirection();

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const canGoBack = view.year > today.getFullYear() || view.month > today.getMonth();

  const step = (delta: number) => {
    const month = view.month + delta;
    if (month < 0) return onView({ year: view.year - 1, month: 11 });
    if (month > 11) return onView({ year: view.year + 1, month: 0 });
    onView({ year: view.year, month });
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Whole weeks, so the grid does not reflow as months change.
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
        <Text token="body" weight="600" testID="reschedule-month">
          {`${t.months[view.month]} ${view.year}`}
        </Text>
        {/* The two arrows keep their physical order in both languages: the
            left one always goes back a month, as a calendar's do. */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <MonthButton direction="back" disabled={!canGoBack} onPress={() => step(-1)} />
          <MonthButton direction="forward" onPress={() => step(1)} />
        </View>
      </View>

      <View style={{ flexDirection: dir.row, flexWrap: 'wrap' }}>
        {t.wk.map((day, i) => (
          <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 }}>
            <Text token="eyebrow" weight="400" color={ink.s5} style={{ letterSpacing: 0 }}>
              {day}
            </Text>
          </View>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, height: 38 }} />;
          const date = new Date(view.year, view.month, day);
          const past = date < startOfToday;
          const isSelected = date.getTime() === new Date(selected.getFullYear(), selected.getMonth(), selected.getDate()).getTime();
          const isToday = date.getTime() === startOfToday.getTime();
          return (
            <View key={day} style={{ width: `${100 / 7}%`, padding: 1 }}>
              <Pressable
                testID={`reschedule-day-${day}`}
                onPress={past ? undefined : () => onSelect(date)}
                disabled={past}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: past }}
                style={{
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1.5,
                  borderColor: isSelected || isToday ? ink.base : 'transparent',
                  backgroundColor: isSelected ? ink.base : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LTRText
                  token="bodyS"
                  tabular
                  align="center"
                  weight={isToday || isSelected ? '600' : '400'}
                  color={isSelected ? surface.white : past ? PAST : ink.base}
                >
                  {String(day)}
                </LTRText>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MonthButton({
  direction,
  disabled,
  onPress,
}: {
  direction: 'back' | 'forward';
  disabled?: boolean;
  onPress: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Pressable
      testID={`reschedule-month-${direction}`}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={direction === 'back' ? t.months[0] : t.months[1]}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: surface.line,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <View style={{ transform: [{ scaleX: direction === 'back' ? 1 : -1 }] }}>
        <Icon name="back" size={16} strokeWidth={1.7} />
      </View>
    </Pressable>
  );
}

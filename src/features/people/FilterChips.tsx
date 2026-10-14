/**
 * The row of chips under People's search — All, Waiting, Favorites, Recent —
 * in the manner of a chat list. "Waiting" carries a red count of the people
 * whose follow-up needs a nudge now, the way "Unread" carries its count.
 */
import { Pressable, ScrollView } from 'react-native';

import type { Added } from '@/content/additions';
import type { PeopleFilter } from '@/features/people/filters';
import { Text } from '@/ui/Text';
import { ink, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

export function FilterChips({
  options,
  value,
  onChange,
  dueCount,
  labels,
  testID = 'people-filters',
}: {
  /** Which chips, in order. */
  options: readonly PeopleFilter[];
  value: PeopleFilter;
  onChange: (next: PeopleFilter) => void;
  /** People whose follow-up needs a nudge now. */
  dueCount: number;
  labels: Added['filters'];
  testID?: string;
}) {
  const dir = useDirection();
  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 8, flexDirection: dir.row }}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((filter) => {
        const on = value === filter;
        return (
          <Pressable
            key={filter}
            testID={`${testID}-${filter}`}
            onPress={() => onChange(filter)}
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
            <Text token="bodyS" weight="600" color={on ? surface.white : ink.s2}>
              {labels[filter]}
            </Text>
            {(filter === 'waiting' || filter === 'followups') && dueCount > 0 ? (
              <Text testID={`${testID}-badge`} token="bodyS" weight="600" color={on ? ink.onInkSoft : ink.s4}>
                {dueCount}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

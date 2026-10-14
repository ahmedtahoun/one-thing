/**
 * Home's two views: Today (what to do now) and All (the full list, with its
 * filters). A two-part switch rather than a row of chips, so it is plain that
 * these are two different places and that the filters belong to the second.
 */
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/Text';
import { ink, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export type HomeView = 'today' | 'all';

export function ViewSwitch({ value, onChange }: { value: HomeView; onChange: (view: HomeView) => void }) {
  const { t } = useLanguage();
  const dir = useDirection();
  const options: { key: HomeView; label: string }[] = [
    { key: 'today', label: t.today },
    { key: 'all', label: t.all },
  ];
  return (
    <View style={{ flexDirection: dir.row, backgroundColor: surface.fill, borderRadius: 14, padding: 4, gap: 4 }}>
      {options.map(({ key, label }) => {
        const on = value === key;
        return (
          <Pressable
            key={key}
            testID={`home-view-${key}`}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? surface.white : 'transparent',
            }}
          >
            <Text token="bodyS" weight="600" color={on ? ink.base : ink.s4}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

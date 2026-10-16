import { Pressable, View } from 'react-native';

import { added } from '@/content/additions';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

/** The dashed "Nothing here yet" card. */
export function TodayEmpty({ onBrainDump, onTry }: { onBrainDump: () => void; onTry: (sentence: string) => void }) {
  const { t, lang } = useLanguage();
  const copy = added(lang);
  const dir = useDirection();
  return (
    <View
      testID="today-empty"
      style={{
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: surface.handle,
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
          backgroundColor: ink.solid,
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

      {/* What makes this more than a list, shown rather than explained: two sentences to tap. */}
      <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 10 }}>
        <Text token="micro" color={ink.s4} align="center">
          {copy.today.tryIt}
        </Text>
        {[copy.loop.chipPromise, copy.loop.chipWait].map((sentence, i) => (
          <Pressable
            key={sentence}
            testID={`today-try-${i}`}
            onPress={() => onTry(sentence)}
            accessibilityRole="button"
            style={{ paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.input, backgroundColor: surface.fill }}
          >
            <Text token="bodyS" color={ink.s2} align="center">
              “{sentence}”
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

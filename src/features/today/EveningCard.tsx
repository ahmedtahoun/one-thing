/**
 * Today's evening variant: after 18:00 the One Thing card becomes an ink
 * "Close the day" card that leads into the Daily review. SCREENS.md § 06.
 */
import { View } from 'react-native';

import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export function EveningCard({
  oneThingLine,
  keptLine,
  onReview,
}: {
  /** How the day's One Thing ended up. */
  oneThingLine: string;
  /** How many promises were kept. */
  keptLine: string;
  onReview: () => void;
}) {
  const { t } = useLanguage();
  const dir = useDirection();

  return (
    <View
      testID="evening-card"
      style={{
        backgroundColor: ink.base,
        borderRadius: radius.oneThing,
        paddingTop: 24,
        paddingHorizontal: 22,
        paddingBottom: 20,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 6 }}>
        <Icon name="moon" size={14} color={ink.s6} strokeWidth={1.9} />
        <Text token="eyebrow" color={ink.s6}>
          {t.ev_k}
        </Text>
      </View>

      <Text token="h1" color={surface.white}>
        {t.ev_t}
      </Text>

      <View style={{ gap: 4 }}>
        <Text token="bodyS" color="#C9C9C5">
          {oneThingLine}
        </Text>
        <Text token="bodyS" color="#C9C9C5">
          {keptLine}
        </Text>
      </View>

      <Button
        testID="close-the-day"
        label={t.review}
        variant="outline"
        onPress={onReview}
        style={{ height: 54, backgroundColor: surface.white, borderWidth: 0 }}
      />
    </View>
  );
}

/**
 * Today's evening variant: after 18:00 the One Thing card becomes an ink
 * "Close the day" card that leads into the Daily review. SCREENS.md § 06.
 */
import { View } from 'react-native';

import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { BalancedText } from '@/ui/BalancedText';
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
        backgroundColor: ink.card,
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

      {/* 28 / 1.2, balanced — same treatment as the One Thing title. */}
      <BalancedText token="h1" lh={33.6} color={surface.onCard}>
        {t.ev_t}
      </BalancedText>

      <View style={{ gap: 4 }}>
        <Text token="bodyS" color={ink.onInk}>
          {oneThingLine}
        </Text>
        <Text token="bodyS" color={ink.onInk}>
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

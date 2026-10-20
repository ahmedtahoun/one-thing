/**
 * Today's evening band: after 18:00 the One Thing card gives way to the way
 * into the Daily review.
 *
 * It used to be a card the size of the One Thing card — an ink box 216pt tall
 * in Arabic, a quarter of the screen, holding a 28pt question, a count, a
 * blank line where the One Thing's outcome went when none was set, and a
 * full-width white button. It is a prompt, not the day's headline, and it was
 * pushing the people actually waiting below the fold. BUILD-REVIEW §2.112.
 *
 * So it is a band now: one line of words, one of numbers, and the action
 * beside them rather than under them. The eyebrow went with the height — the
 * greeting at the top of the screen already says good evening, and the moon
 * says the rest. src/features/today/evening.ts chooses the words.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { eveningWords, type DayCount } from './evening';

export function EveningCard({ count, onReview }: { count: DayCount; onReview: () => void }) {
  const { t } = useLanguage();
  const dir = useDirection();
  const { title, meta } = eveningWords(count, { ready: t.ev_t, allDone: t.ev_done, sum: t.tk_sum, sumAll: t.tk_prog });

  return (
    <View
      testID="evening-card"
      style={{
        backgroundColor: ink.card,
        borderRadius: radius.largeCard,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon name="moon" size={18} color={ink.onInk} strokeWidth={1.9} />

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text token="body" weight="600" color={surface.onCard} numberOfLines={1}>
          {title}
        </Text>
        <Text token="caption" color={ink.onInk} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      {/* The action sits beside the words, not under them: a 54pt white bar
          across the card was the heaviest treatment the app has, for a tap
          that only opens a screen. */}
      <Pressable
        testID="close-the-day"
        onPress={onReview}
        accessibilityRole="button"
        style={({ pressed }) => ({
          height: 38,
          paddingHorizontal: 16,
          borderRadius: radius.pill,
          backgroundColor: surface.white,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Text token="bodyS" weight="600" color={ink.base} numberOfLines={1}>
          {t.review}
        </Text>
      </Pressable>
    </View>
  );
}

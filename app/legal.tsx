/**
 * 03 · Legal — Terms of Service and Privacy Policy. SCREENS.md § 03.
 *
 * The same text must also be published at public URLs for the store listings
 * (BUILD-REVIEW.md §3); this screen is the in-app copy of it.
 */
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ink } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export default function Legal() {
  const { acc, a11y } = useLanguage();
  const dir = useDirection();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const showPrivacy = tab === 'privacy';
  const sections = showPrivacy ? acc.priv : acc.terms;
  const title = showPrivacy ? acc.si.privL : acc.si.termsL;

  return (
    <Screen scroll>
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingVertical: 6 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={a11y.back} hitSlop={12}>
          <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
            <Icon name="back" size={24} strokeWidth={2} />
          </View>
        </Pressable>
        <Text token="title">{title}</Text>
      </View>

      <Text token="caption" color={ink.s5} style={{ marginTop: 4, marginBottom: 20 }}>
        {acc.si.updated}
      </Text>

      <View style={{ gap: 20 }}>
        {sections.map(([heading, body]) => (
          <View key={heading} style={{ gap: 6 }}>
            <Text token="body" weight="600">
              {heading}
            </Text>
            <Text token="bodyS" color={ink.s2} lh={22.4}>
              {body}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

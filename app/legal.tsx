/**
 * 03 · Legal — Terms of Service and Privacy Policy. SCREENS.md § 03.
 *
 * The same text must also be published at public URLs for the store listings
 * (BUILD-REVIEW.md §3); this screen is the in-app copy of it.
 *
 * `?at=help` opens the Privacy tab already scrolled to "Helping improve
 * Sanad". It exists because that section is now the only place the detail
 * behind Sanad's consent card is written, and landing somebody at the top of
 * a policy to go and find it is how a policy goes unread. BUILD-REVIEW
 * §2.119.
 */
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { added } from '@/content/additions';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ink } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export default function Legal() {
  const { acc, a11y, lang } = useLanguage();
  const dir = useDirection();
  const { tab, at } = useLocalSearchParams<{ tab?: string; at?: string }>();

  const showPrivacy = tab === 'privacy';
  const sections = showPrivacy ? acc.priv : acc.terms;
  const title = showPrivacy ? acc.si.privL : acc.si.termsL;

  /**
   * The only anchor there is, resolved from the copy rather than passed as an
   * index: `at=help` is stable across both languages and survives the policy
   * being reordered, which a number would not.
   */
  const wanted = at === 'help' && showPrivacy ? added(lang).meet.helpSection : null;

  const list = useRef<ScrollView>(null);
  // Scrolled once, when the section it is waiting for reports where it is.
  const [landed, setLanded] = useState(false);

  return (
    <Screen paddingBottom={0}>
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingVertical: 6 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={a11y.back} hitSlop={12}>
          <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
            <Icon name="back" size={24} strokeWidth={2} />
          </View>
        </Pressable>
        <Text token="title">{title}</Text>
      </View>

      {/* Its own ScrollView rather than `<Screen scroll>`, so the anchor has
          something to scroll. Screen bounds a nested one for exactly this.
          The sections are direct children of the content container and not
          wrapped in a spacing View, because `onLayout` reports y against the
          immediate parent: wrapped, every offset would be short by the height
          of the "Last updated" line. */}
      <ScrollView ref={list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, gap: 20 }}>
        <Text token="caption" color={ink.s5} style={{ marginTop: 4 }}>
          {acc.si.updated}
        </Text>

        {sections.map(([heading, body]) => (
          <View
            key={heading}
            testID={heading === wanted ? 'legal-at' : undefined}
            style={{ gap: 6 }}
            onLayout={
              heading === wanted && !landed
                ? (e) => {
                    // 12 pt of air above it, so it reads as a section arrived
                    // at rather than one cut off at the top.
                    const y = Math.max(0, e.nativeEvent.layout.y - 12);
                    setLanded(true);
                    list.current?.scrollTo({ y, animated: false });
                  }
                : undefined
            }
          >
            <Text token="body" weight="600">
              {heading}
            </Text>
            <Text token="bodyS" color={ink.s2} lh={22.4}>
              {body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

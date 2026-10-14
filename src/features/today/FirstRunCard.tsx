/**
 * The dark first-run card on Today: ink background, radius 26, asking for the
 * user's first One Thing. SCREENS.md § 06.
 *
 * Shown only on the very first run. Setting it swaps the card for the normal
 * One Thing card and raises the toast; "Later" skips without setting one.
 *
 * Kept short on purpose — it sits under the quick actions, which are what
 * people reach for first: the question on two lines at most, "Later" in the
 * corner, and the suggestions in one scrolling row. The suggestions are the
 * person's own open tasks when they have any, and the stock examples only
 * when they have none.
 */
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { BalancedText } from '@/ui/BalancedText';
import { Text } from '@/ui/Text';
import { ONE_THING_SUGGESTIONS } from '@/content/seed';
import { fontFamily, ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export function FirstRunCard({
  onSet,
  onLater,
  suggestions,
}: {
  onSet: (title: string) => void;
  onLater: () => void;
  /** Their own open tasks, most useful first; the stock examples when omitted or empty. */
  suggestions?: readonly string[];
}) {
  const { inline, lang } = useLanguage();
  const dir = useDirection();
  const [draft, setDraft] = useState('');

  const filled = draft.trim().length > 0;
  const submit = () => {
    if (filled) onSet(draft.trim());
  };

  const labels = suggestions && suggestions.length > 0 ? suggestions : ONE_THING_SUGGESTIONS.map((s) => s[lang]);

  return (
    <View
      testID="first-run-card"
      style={{
        backgroundColor: ink.card,
        borderRadius: radius.oneThing,
        paddingTop: 16,
        paddingHorizontal: 18,
        paddingBottom: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text token="eyebrow" color={ink.s6}>
          {inline.firstRunEyebrow}
        </Text>
        <Pressable
          testID="first-run-later"
          onPress={onLater}
          accessibilityRole="button"
          hitSlop={10}
          style={{ flexShrink: 1 }}
        >
          <Text token="caption" color={ink.s6} numberOfLines={1}>
            {inline.firstRunLater}
          </Text>
        </Pressable>
      </View>
      {/* The question is one of the few places the prototype sets a
          line-height, and it balances its wrap; smaller here than the
          prototype's 26 so the card stays short. */}
      <BalancedText token="h2" size={21} lh={26} color={surface.onCard}>
        {inline.firstRunQuestion}
      </BalancedText>

      <View
        style={{
          flexDirection: dir.row,
          alignItems: 'center',
          backgroundColor: surface.onInkFill,
          borderRadius: radius.cardTight,
          padding: 4,
          gap: 8,
        }}
      >
        <TextInput
          testID="first-run-input"
          value={draft}
          onChangeText={setDraft}
          placeholder={inline.firstRunPlaceholder}
          placeholderTextColor={ink.s4}
          onSubmitEditing={submit}
          returnKeyType="done"
          style={{
            // minWidth 0 lets the input shrink inside the row; without it its
            // intrinsic width pushes the Set button off the card.
            flex: 1,
            minWidth: 0,
            height: 40,
            paddingHorizontal: 10,
            color: surface.onCard,
            fontSize: 16,
            fontFamily: `${fontFamily}_400Regular`,
            textAlign: dir.textAlign,
          }}
        />
        <Pressable
          testID="first-run-set"
          onPress={submit}
          accessibilityRole="button"
          style={{
            height: 40,
            paddingHorizontal: 16,
            borderRadius: radius.small,
            alignItems: 'center',
            justifyContent: 'center',
            // White once there is something to submit, muted while empty.
            backgroundColor: filled ? surface.white : ink.s4,
          }}
        >
          <Text token="body" weight="600" color={ink.base}>
            {inline.firstRunSet}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ marginHorizontal: -18, flexGrow: 0 }}
        contentContainerStyle={{ flexDirection: dir.row, gap: 8, paddingHorizontal: 18 }}
      >
        {labels.map((label) => (
          <Pressable
            key={label}
            onPress={() => onSet(label)}
            accessibilityRole="button"
            style={{
              maxWidth: 240,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: surface.onInkLine,
            }}
          >
            <Text token="caption" color={surface.onCard} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

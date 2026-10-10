/**
 * The dark first-run card on Today: ink background, radius 26, asking for the
 * user's first One Thing. SCREENS.md § 06.
 *
 * Shown only on the very first run. Setting it swaps the card for the normal
 * One Thing card and raises the toast; "Later" skips without setting one.
 */
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/ui/Text';
import { ONE_THING_SUGGESTIONS } from '@/content/seed';
import { fontFamily, ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export function FirstRunCard({
  onSet,
  onLater,
}: {
  onSet: (title: string) => void;
  onLater: () => void;
}) {
  const { inline, lang } = useLanguage();
  const dir = useDirection();
  const [draft, setDraft] = useState('');

  const filled = draft.trim().length > 0;
  const submit = () => {
    if (filled) onSet(draft.trim());
  };

  return (
    <View style={{ backgroundColor: ink.base, borderRadius: radius.oneThing, padding: 22, paddingTop: 24, gap: 16 }}>
      <Text token="eyebrow" color={ink.s6}>
        {inline.firstRunEyebrow}
      </Text>
      <Text token="h2" color={surface.white}>
        {inline.firstRunQuestion}
      </Text>

      <View
        style={{
          flexDirection: dir.row,
          alignItems: 'center',
          backgroundColor: '#1F1F1E',
          borderRadius: radius.cardTight,
          paddingHorizontal: 14,
          gap: 10,
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
            height: 52,
            color: surface.white,
            fontSize: 16,
            fontFamily: `${fontFamily}_400Regular`,
            textAlign: dir.textAlign,
          }}
        />
        <Pressable testID="first-run-set" onPress={submit} accessibilityRole="button" hitSlop={10}>
          {/* White once there is text to submit, muted while empty. */}
          <Text token="body" weight="600" color={filled ? surface.white : ink.s4}>
            {inline.firstRunSet}
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        <Text token="caption" color={ink.s6}>
          {inline.firstRunOrPick}
        </Text>
        <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8 }}>
          {ONE_THING_SUGGESTIONS.map((suggestion) => {
            const label = suggestion[lang];
            return (
              <Pressable
                key={label}
                onPress={() => onSet(label)}
                accessibilityRole="button"
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: '#3A3A38',
                }}
              >
                <Text token="caption" color={surface.white}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable testID="first-run-later" onPress={onLater} accessibilityRole="button" hitSlop={8}>
        <Text token="caption" color={ink.s6} style={{ textDecorationLine: 'underline' }}>
          {inline.firstRunLater}
        </Text>
      </Pressable>
    </View>
  );
}

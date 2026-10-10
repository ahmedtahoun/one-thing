/**
 * The dial-code button and the list it opens, shared by Compose's WhatsApp
 * number and the contact form's phone row. Both stay left-to-right in
 * Arabic: a number is an LTR island (README § RTL).
 *
 * The list lies over what follows it, so the row that holds it must sit
 * above its later siblings (`zIndex`).
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Icon } from './Icon';
import { LTRText, Text } from './Text';
import { COUNTRIES, type Country } from '@/content/countries';
import { fontFamily, ink, surface } from '@/design/tokens';
import { useLanguage } from '@/i18n/LanguageProvider';

export function countryFor(dial: string): Country {
  return COUNTRIES.find((c) => c.dial === dial) ?? (COUNTRIES[0] as Country);
}

export function CountryButton({
  dial,
  open,
  onPress,
  testID,
}: {
  dial: string;
  open: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const country = countryFor(dial);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 40,
        paddingLeft: 10,
        paddingRight: 8,
        borderRadius: 10,
        backgroundColor: surface.brief,
      }}
    >
      <Text size={20} lh={20}>
        {country.flag}
      </Text>
      <LTRText token="body" weight="500" tabular>
        {country.dial}
      </LTRText>
      {/* The prototype rotates its back chevron to point down, and in Arabic
          mirrors it first, so it points up there. A down chevron is the
          intent — BUILD-REVIEW.md §2.21. */}
      <View style={{ opacity: 0.6 }}>
        <Icon name="chev" size={16} strokeWidth={1.7} />
      </View>
    </Pressable>
  );
}

/**
 * The open list. `searchable` adds the search row the prototype draws on its
 * account-setup picker; the contact form needs it (SCREENS.md § 12, "searchable
 * list of all countries"), Compose's prototype picker has none.
 */
export function CountryList({
  dial,
  onPick,
  maxHeight,
  searchable = false,
  testID,
}: {
  dial: string;
  onPick: (country: Country) => void;
  maxHeight: number;
  searchable?: boolean;
  testID?: string;
}) {
  const { lang, inline } = useLanguage();
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/\D/g, '');
    return COUNTRIES.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.includes(query.trim()) ||
        (digits.length > 0 && c.dial.replace(/\D/g, '').startsWith(digits))
    );
  }, [query]);

  return (
    <View
      testID={testID}
      style={{
        // Inside the number's LTR island in the prototype, rows and all.
        direction: 'ltr',
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        zIndex: 30,
        maxHeight,
        borderWidth: 1,
        borderColor: surface.line,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: surface.white,
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 40,
        shadowOffset: { width: 0, height: 16 },
        elevation: 12,
      }}
    >
      {searchable ? (
        <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: surface.lineSoft }}>
          <TextInput
            testID={testID ? `${testID}-search` : undefined}
            value={query}
            onChangeText={setQuery}
            placeholder={inline.countrySearch}
            placeholderTextColor={ink.s5}
            autoCorrect={false}
            style={{
              height: 42,
              borderRadius: 11,
              backgroundColor: surface.fill,
              paddingHorizontal: 14,
              fontFamily: `${fontFamily}_400Regular`,
              fontSize: 15,
              color: ink.base,
              textAlign: lang === 'ar' ? 'right' : 'left',
            }}
          />
        </View>
      ) : null}
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 6 }}>
        {list.map((c) => (
          <Pressable
            key={c.iso}
            testID={testID ? `${testID}-${c.iso}` : undefined}
            onPress={() => onPick(c)}
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              height: 44,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: c.dial === dial ? surface.brief : surface.white,
            }}
          >
            <Text size={20} lh={20}>
              {c.flag}
            </Text>
            <Text token="body" style={{ flex: 1 }} numberOfLines={1}>
              {lang === 'ar' ? c.nameAr : c.nameEn}
            </Text>
            <LTRText token="bodyS" color={ink.s4} tabular>
              {c.dial}
            </LTRText>
          </Pressable>
        ))}
        {list.length === 0 ? (
          <View style={{ padding: 10 }}>
            <Text token="bodyS" color={ink.s5}>
              {inline.countryNone}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

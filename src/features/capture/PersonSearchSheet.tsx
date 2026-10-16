/**
 * "Search": when the question is who, and the few suggestions are not them —
 * a sheet with a search box over everyone in People, one tap to choose.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { floatFavorites } from '@/features/people/filters';
import { matchContact } from '@/features/people/search';
import { Avatar } from '@/ui/Avatar';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { fontFamily, ink, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useFavorites } from '@/lib/favorites';
import type { Contact } from '@/lib/model-types';
import { usePeople } from '@/lib/people';

export function PersonSearchSheet({ open, title, onClose, onPick }: { open: boolean; title: string; onClose: () => void; onPick: (contact: Contact) => void }) {
  const { t } = useLanguage();
  const dir = useDirection();
  const { contacts } = usePeople();
  const favorites = useFavorites();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => floatFavorites(contacts, favorites).filter((c) => matchContact(c, query)), [contacts, favorites, query]);
  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} testID="person-search" padding={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: 26 }} gap={10}>
      <Text token="title">{title}</Text>
      <TextInput
        testID="person-search-input"
        value={query}
        onChangeText={setQuery}
        placeholder={t.pp_ph}
        placeholderTextColor={ink.s5}
        autoFocus
        style={{
          height: 44,
          borderRadius: 14,
          paddingHorizontal: 14,
          backgroundColor: surface.fill,
          fontFamily: `${fontFamily}_400Regular`,
          fontSize: 15,
          color: ink.base,
          textAlign: dir.textAlign,
          writingDirection: dir.isRTL ? 'rtl' : 'ltr',
        }}
      />
      <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
        {shown.map((c) => (
          <Pressable
            key={c.id}
            testID={`person-search-${c.id}`}
            onPress={() => {
              setQuery('');
              onPick(c);
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 14, backgroundColor: pressed ? surface.fill : 'transparent' })}
          >
            <Avatar name={c.name} contactId={c.id} size={42} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text token="body" weight="600" numberOfLines={1}>
                {c.name}
              </Text>
              {c.role ? (
                <Text token="micro" color={ink.s4} numberOfLines={1}>
                  {c.role}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Sheet>
  );
}

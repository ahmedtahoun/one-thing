/**
 * "Who?" for Call, Email and WhatsApp on Home: a sheet over the screen instead
 * of a trip to People and back. Favourites lead, only people who can be
 * reached that way are listed, and one tap starts it.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import { canReach } from '@/features/people/channel';
import { floatFavorites } from '@/features/people/filters';
import { matchContact } from '@/features/people/search';
import { Avatar } from '@/ui/Avatar';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { fontFamily, ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useFavorites } from '@/lib/favorites';
import type { Channel, Contact } from '@/lib/model-types';
import { usePeople } from '@/lib/people';

export function PickSheet({ channel, onClose, onPick }: { channel: Channel | null; onClose: () => void; onPick: (contact: Contact, channel: Channel) => void }) {
  const { t, lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang);
  const { contacts } = usePeople();
  const favorites = useFavorites();
  const [query, setQuery] = useState('');

  const people = useMemo(
    () => (channel ? floatFavorites(contacts, favorites).filter((c) => canReach(c, channel)) : []),
    [contacts, favorites, channel]
  );
  const shown = people.filter((c) => matchContact(c, query));
  const colour = channel ? typeColour[channel] : null;

  return (
    <Sheet open={channel !== null} onClose={() => { setQuery(''); onClose(); }} testID="pick-sheet" padding={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: 26 }} gap={10}>
      {channel && colour ? (
        <>
          <Text token="title">{copy.pickWho[channel]}</Text>
          {people.length > 6 ? (
            <TextInput
              testID="pick-search"
              value={query}
              onChangeText={setQuery}
              placeholder={t.pp_ph}
              placeholderTextColor={ink.s5}
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
          ) : null}
          {people.length === 0 ? (
            <View style={{ gap: 10, paddingVertical: 8 }}>
              <Text token="bodyS" color={ink.s4}>
                {copy.today.pickEmpty}
              </Text>
              <Pressable
                testID="pick-add"
                onPress={() => {
                  onClose();
                  router.push('/contact-edit');
                }}
                accessibilityRole="button"
                style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colour.bg }}
              >
                <Text token="bodyS" weight="600" color={colour.fg}>
                  {copy.today.pickAdd}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {shown.map((c) => (
                <Pressable
                  key={c.id}
                  testID={`pick-${c.id}`}
                  onPress={() => {
                    setQuery('');
                    onPick(c, channel);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    flexDirection: dir.row,
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 8,
                    paddingHorizontal: 6,
                    borderRadius: 14,
                    backgroundColor: pressed ? surface.fill : 'transparent',
                  })}
                >
                  <Avatar name={c.name} contactId={c.id} size={42} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text token="body" weight="600" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text token="micro" color={ink.s4} numberOfLines={1} style={{ writingDirection: 'ltr', textAlign: dir.textAlign }}>
                      {channel === 'email' ? c.email : `${c.dial ?? ''} ${c.phone ?? ''}`.trim()}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </>
      ) : null}
    </Sheet>
  );
}

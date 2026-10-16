/**
 * "Who?" for Call, Email and WhatsApp on Home: a sheet over the screen instead
 * of a trip to People and back. Only people who can be reached that way are
 * listed, and one tap starts it.
 *
 * The list is ordered by what is owed rather than by who was added first,
 * and each row says what last happened instead of repeating a phone number
 * nobody opened the sheet to read. Why that order, and not a chat app's:
 * `./pick-order.ts`.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import { canReach } from '@/features/people/channel';
import { matchContact } from '@/features/people/search';
import { orderForPicking, type PickStatus } from '@/features/today/pick-order';
import { Avatar } from '@/ui/Avatar';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { fontFamily, ink, status as statusColour, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useFavorites } from '@/lib/favorites';
import type { Channel, Contact } from '@/lib/model-types';
import { usePeople } from '@/lib/people';

/** "Today", "Yesterday", "3d", "6w" — the age at the end of the row. */
function age(days: number, copy: ReturnType<typeof added>): string {
  if (days <= 0) return copy.pick.today;
  if (days === 1) return copy.pick.yesterday;
  if (days < 14) return copy.pick.days.replace('{n}', String(days));
  return copy.pick.weeks.replace('{n}', String(Math.floor(days / 7)));
}

/** What the row says under the name, and how old it is. */
function line(status: PickStatus, copy: ReturnType<typeof added>): { text: string; when: string } {
  switch (status.kind) {
    case 'owed':
      return {
        text: status.what.trim() ? copy.pick.owedWhat.replace('{what}', status.what.trim()) : copy.pick.owed,
        when: age(status.days, copy),
      };
    case 'reached':
      return { text: copy.pick.did[status.how], when: age(status.days, copy) };
    case 'cold':
      return { text: copy.pick.cold, when: age(status.days, copy) };
    case 'never':
      return { text: copy.pick.never, when: '' };
  }
}

export function PickSheet({ channel, onClose, onPick }: { channel: Channel | null; onClose: () => void; onPick: (contact: Contact, channel: Channel) => void }) {
  const { t, lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang);
  const { contacts, followUps, history } = usePeople();
  const favorites = useFavorites();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    if (!channel) return [];
    const reachable = contacts.filter((c) => canReach(c, channel));
    return orderForPicking(reachable, { followUps, history, favorites, now: new Date() });
  }, [contacts, followUps, history, favorites, channel]);
  const people = rows.map((r) => r.contact);
  const shown = rows.filter((r) => matchContact(r.contact, query));
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
              {shown.map(({ contact: c, status }) => {
                const said = line(status, copy);
                const owed = status.kind === 'owed';
                const pill = owed ? (status.due ? copy.pick.overdue : copy.pick.waiting) : null;
                return (
                  <Pressable
                    key={c.id}
                    testID={`pick-${c.id}`}
                    onPress={() => {
                      setQuery('');
                      onPick(c, channel);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name} — ${said.text}`}
                    style={({ pressed }) => ({
                      flexDirection: dir.row,
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 9,
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
                      <Text token="micro" color={owed ? ink.s2 : ink.s4} numberOfLines={1}>
                        {said.text}
                      </Text>
                    </View>
                    {said.when || pill ? (
                      <View style={{ alignItems: dir.isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
                        {said.when ? (
                          <Text token="micro" color={owed && status.due ? statusColour.overdueFg : ink.s5}>
                            {said.when}
                          </Text>
                        ) : null}
                        {pill ? (
                          <View
                            testID={`pick-pill-${c.id}`}
                            style={{
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 999,
                              backgroundColor: status.kind === 'owed' && status.due ? statusColour.dangerBg : statusColour.warnBg,
                            }}
                          >
                            <Text token="micro" weight="600" color={status.kind === 'owed' && status.due ? statusColour.overdueFg : statusColour.warnFg}>
                              {pill}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </>
      ) : null}
    </Sheet>
  );
}

/**
 * "Who?" for Call, Email and WhatsApp on Home: a sheet over the screen instead
 * of a trip to People and back. Only people who can be reached that way are
 * listed, and one tap starts it.
 *
 * The list is ordered by what is owed rather than by who was added first,
 * and each row says what last happened instead of repeating a phone number
 * nobody opened the sheet to read. Why that order, and not a chat app's:
 * `./pick-order.ts`.
 *
 * Over that order sit the same two things People has — a search field and a
 * row of chips — because the order answers "who needs me?" and somebody
 * tapping Call often knows exactly who they want. Recent is a chip rather
 * than the order, so wanting the person you spoke to yesterday costs one
 * tap and does not push the person who has been waiting since Tuesday down
 * the list for everybody else.
 *
 * The search used to appear only once there were more than six people,
 * which is backwards: on a phone with a handful of contacts the field is
 * cheap, and on a new account its absence reads as "this sheet cannot
 * search" — which is what it was taken for.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import { canReach } from '@/features/people/channel';
import { FilterChips } from '@/features/people/FilterChips';
import { filterCounts, filterPeople, PICK_CHIPS, type PeopleFilter } from '@/features/people/filters';
import { matchContact } from '@/features/people/search';
import { orderForPicking, type PickStatus } from '@/features/today/pick-order';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
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
  const [filter, setFilter] = useState<PeopleFilter>('all');

  /** Only people this channel can actually reach: a Call sheet needs a number. */
  const reachable = useMemo(() => (channel ? contacts.filter((c) => canReach(c, channel)) : []), [contacts, channel]);
  const rows = useMemo(
    () => orderForPicking(reachable, { followUps, history, favorites, now: new Date() }),
    [reachable, followUps, history, favorites]
  );
  const people = rows.map((r) => r.contact);
  const due = useMemo(() => filterCounts(reachable, { followUps, favorites, now: new Date() }).due, [reachable, followUps, favorites]);

  const shown = useMemo(() => {
    const chosen = filterPeople(filter, reachable, { followUps, favorites, now: new Date() });
    const ids = new Set(chosen.map((c) => c.id));
    // Recent is the one chip with an order of its own — newest first is the
    // whole point of asking for it. Every other chip keeps the sheet's.
    const inFilter =
      filter === 'recent'
        ? chosen.map((c) => rows.find((r) => r.contact.id === c.id)).filter((r): r is (typeof rows)[number] => r !== undefined)
        : rows.filter((r) => ids.has(r.contact.id));
    return inFilter.filter((r) => matchContact(r.contact, query));
  }, [filter, reachable, rows, followUps, favorites, query]);

  /** Why the list is empty, in the words People uses for the same emptiness. */
  const nothingHere =
    query.trim() !== ''
      ? t.pp_none.replace('{q}', query.trim())
      : filter === 'recent'
        ? copy.filters.recentNone
        : filter === 'waiting'
          ? copy.filters.waitingNone
          : filter === 'favorites'
            ? copy.filters.favHint
            : '';

  const close = () => {
    setQuery('');
    setFilter('all');
    onClose();
  };
  const colour = channel ? typeColour[channel] : null;

  return (
    <Sheet open={channel !== null} onClose={close} testID="pick-sheet" padding={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: 26 }} gap={10}>
      {channel && colour ? (
        <>
          <Text token="title">{copy.pickWho[channel]}</Text>
          {people.length > 0 ? (
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
          {people.length > 0 ? (
            <FilterChips testID="pick-filters" options={PICK_CHIPS} value={filter} onChange={setFilter} dueCount={due} labels={copy.filters} />
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
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {shown.length === 0 ? (
                <View testID="pick-none" style={{ paddingVertical: 24, paddingHorizontal: 8 }}>
                  <Text token="bodyS" color={ink.s4} align="center">
                    {nothingHere}
                  </Text>
                </View>
              ) : null}
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
                      setFilter('all');
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
                      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 5 }}>
                        <Text token="body" weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {c.name}
                        </Text>
                        {/* A star no longer floats anybody to the top, so it has to be
                            visible here, or the sheet stops showing who your regulars are. */}
                        {favorites.has(c.id) ? (
                          <View testID={`pick-star-${c.id}`} style={{ flexShrink: 0 }}>
                            <Icon name="star" size={12} color={typeColour.visit.fg} filled />
                          </View>
                        ) : null}
                      </View>
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

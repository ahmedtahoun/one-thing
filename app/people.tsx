/**
 * 10 · People — the people the user messages, calls and follows up with.
 * SCREENS.md § 10.
 *
 * Laid out like a chat list, because people already know how to read one: a
 * big title with a few round buttons, one search bar, chips (All · Favorites ·
 * Recent · Follow-ups), and rows of avatar, name, a quiet line of what is
 * going on, and the time on the right. Tapping a row opens a menu of ways to
 * reach them; nothing is sent from here.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';

import { added } from '@/content/additions';
import { FollowUpsPanel } from '@/features/followups/FollowUpsPanel';
import { AddMenu, type AddChoice } from '@/features/people/AddMenu';
import { lastChannelFor } from '@/features/people/channel';
import { ContactMenu } from '@/features/people/ContactMenu';
import { FilterChips } from '@/features/people/FilterChips';
import {
  filterCounts,
  filterPeople,
  floatFavorites,
  followUpStates,
  isLabelFilter,
  isSmartFilter,
  labelFilter,
  labelsIn,
  PEOPLE_CHIPS,
  smartFilter,
  type PeopleFilter,
} from '@/features/people/filters';
import { isMomentLabel } from '@/features/people/moment-label';
import { identityLine, lineWidth } from '@/features/people/quiet-line';
import { matchContact } from '@/features/people/search';
import { useStartTask } from '@/features/people/start-task';
import { chatTime } from '@/features/people/time';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { TabBar } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { type IconName } from '@/design/icon-paths';
import { fontFamily, ink, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { toggleFavorite, useFavorites } from '@/lib/favorites';
import { type Channel, type Contact } from '@/lib/model-types';
import { usePeople } from '@/lib/people';
import { useSmartLists } from '@/lib/smart-lists';
import { canPickFromPhone, importDraft, pickFromPhone } from '@/lib/phone-contacts';
import { canListPhoneContacts } from '@/lib/phone-contacts/all';

/** Bottom padding under the tab bar, as on Tasks. */
const BOTTOM_INSET = 120;

export default function People() {
  const { t, a11y, lang } = useLanguage();
  const dir = useDirection();
  const { contacts, followUps, history, ready } = usePeople();
  const favorites = useFavorites();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const tab = useLocalSearchParams<{ tab?: string }>().tab;
  const [filter, setFilter] = useState<PeopleFilter>(tab === 'followups' ? 'followups' : 'all');
  // A notification or link can arrive while People is already open.
  useEffect(() => {
    if (tab === 'followups') setFilter('followups');
  }, [tab]);
  const [menuFor, setMenuFor] = useState<Contact | null>(null);
  const [adding, setAdding] = useState(false);
  const [more, setMore] = useState(false);
  const [now] = useState(() => new Date());
  const filters = added(lang).filters;
  const copy = added(lang).peopleScreen;

  const start = useStartTask();

  // Today's Call / Email / WhatsApp tiles arrive here with ?pick=<channel>:
  // choosing a person starts that task and opens Compose on it.
  const params = useLocalSearchParams<{ pick?: string }>();
  const pick: Channel | null =
    params.pick === 'whatsapp' || params.pick === 'email' || params.pick === 'call' ? params.pick : null;

  const smartLists = useSmartLists();
  // History rides along because "Not contacted" asks what has been logged
  // against each person, not only what was sent to them.
  const searching = query.trim().length > 0;
  const context = useMemo(
    () => ({
      followUps,
      favorites,
      now,
      smartLists,
      history,
      // Not while picking somebody to message, and not while searching: a
      // name typed into the box must find whoever has it, imported or not,
      // or two hundred contacts would be unreachable (BUILD-REVIEW §2.102).
      hideUntouched: !pick && !searching,
    }),
    [followUps, favorites, now, smartLists, history, pick, searching],
  );
  const counts = useMemo(() => filterCounts(contacts, context), [contacts, context]);
  // The labels people have put on each other are chips beside the built-in
  // ones, and so are their smart lists — a saved rule read fresh each tap.
  const chips = useMemo<PeopleFilter[]>(
    () => [...PEOPLE_CHIPS, ...labelsIn(contacts).map(labelFilter), ...smartLists.map((list) => smartFilter(list.id))],
    [contacts, smartLists],
  );
  const smartNames = useMemo(() => new Map(smartLists.map((list) => [list.id, list.name])), [smartLists]);
  // A label nobody has any more is not a place to stay.
  useEffect(() => {
    if ((isLabelFilter(filter) || isSmartFilter(filter)) && !chips.includes(filter)) setFilter('all');
  }, [chips, filter]);
  const states = useMemo(() => followUpStates(contacts, followUps, now), [contacts, followUps, now]);
  // How each person was last reached, for the small icon on their picture.
  const lastChannels = useMemo(() => {
    const map = new Map<string, Channel>();
    for (const c of contacts) {
      const channel = lastChannelFor(c.id, history, followUps);
      if (channel) map.set(c.id, channel);
    }
    return map;
  }, [contacts, history, followUps]);
  const list = useMemo(() => {
    // Picking someone to message: the people you reach for most come first.
    const base = pick && filter === 'all' ? floatFavorites(contacts, favorites) : filterPeople(filter, contacts, context);
    return base.filter((c) => matchContact(c, query));
  }, [contacts, favorites, context, filter, query, pick]);

  const star = async (contact: Contact) => {
    const on = await toggleFavorite(contact.id);
    const first = contact.name.split(' ')[0] ?? contact.name;
    toast.show((on ? filters.favAdded : filters.favRemoved).replace('{n}', first), { undo: false });
  };

  // "Import" (BUILD-REVIEW.md §2.46): the phone's own picker, then the New
  // contact form filled in, to check and save. Phones only.
  const importFromPhone = async () => {
    const draft = await pickFromPhone();
    if (!draft) return;
    importDraft.set(draft);
    router.push('/contact-edit');
  };

  const placeholder = filter === 'favorites' ? copy.searchFavorites : filter === 'recent' ? copy.searchRecent : copy.searchAll;
  const noneYet = ready && contacts.length === 0 && !searching && filter === 'all';

  const round = (testID: string, icon: IconName, label: string, onPress: () => void, solid = false) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: solid ? ink.solid : surface.fill,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Icon name={icon} size={solid ? 20 : 19} color={solid ? surface.white : ink.base} strokeWidth={solid ? 2.2 : 1.8} />
    </Pressable>
  );

  return (
    <>
      <Screen scroll paddingTop={8} paddingBottom={BOTTOM_INSET} style={{ gap: 14 }}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
          {round('people-more', 'menu', copy.more, () => setMore(true))}
          <View style={{ flexDirection: dir.row, gap: 10 }}>
            {round('people-scan-many', 'cards', added(lang).addPeople.scanMany, () => router.push('/scan-many'))}
            {round('people-scan', 'camera', added(lang).addPeople.scan, () => router.push('/scan-card'))}
            {round('people-add', 'plus', added(lang).addPeople.title, () => setAdding(true), true)}
          </View>
        </View>

        <Text token="h1" size={34} weight="700" testID="people-title">
          {t.pp_t}
        </Text>

        {filter !== 'followups' ? (
          <View
            style={{
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 10,
              height: 46,
              borderRadius: 23,
              backgroundColor: surface.fill,
              paddingHorizontal: 16,
            }}
          >
            <Icon name="search" size={18} color={ink.s4} strokeWidth={1.7} />
            <TextInput
              testID="people-search"
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={ink.s4}
              autoCorrect={false}
              autoCapitalize="none"
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: `${fontFamily}_400Regular`,
                fontSize: 16,
                color: ink.base,
                textAlign: dir.textAlign,
                paddingVertical: 0,
              }}
            />
            {query ? (
              <Pressable
                testID="people-clear"
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel={a11y.clearSearch}
                hitSlop={8}
                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: surface.clearButton, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="x" size={13} strokeWidth={1.8} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {pick ? (
          <View
            testID="people-pick"
            style={{
              flexDirection: dir.row,
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: 14,
              borderRadius: 14,
              backgroundColor: typeColour[pick].bg,
            }}
          >
            <Text token="body" weight="600" color={typeColour[pick].fg} style={{ flex: 1 }}>
              {added(lang).pickWho[pick]}
            </Text>
            <Pressable
              testID="people-pick-cancel"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/today'))}
              accessibilityRole="button"
              style={{ paddingVertical: 6, paddingHorizontal: 4 }}
            >
              <Text token="bodyS" weight="600" color={typeColour[pick].fg}>
                {added(lang).pickCancel}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <FilterChips options={chips} value={filter} onChange={setFilter} dueCount={counts.due} untouchedCount={counts.untouched} labels={filters} smartNames={smartNames} />

        {filter === 'followups' ? (
          <FollowUpsPanel />
        ) : (
          <>
            <View testID="people-list">
              {list.map((contact) => (
                <PersonRow
                  key={contact.id}
                  contact={contact}
                  now={now}
                  lang={lang}
                  favorite={favorites.has(contact.id)}
                  followUp={states.get(contact.id)}
                  lastChannel={lastChannels.get(contact.id) ?? null}
                  // A tap opens the person's page (their thread); press and hold is the quick way to reach them.
                  onOpen={() => (pick ? start(contact, pick) : router.push(`/contact?id=${contact.id}`))}
                  onHold={() => {
                    // Press and hold: call / message / email without opening the page.
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    setMenuFor(contact);
                  }}
                />
              ))}
            </View>

            {list.length === 0 && noneYet ? (
              <Empty
                testID="people-empty"
                icon="users"
                title={copy.noneTitle}
                body={copy.noneBody}
                link={copy.noneLink}
                onLink={() => setAdding(true)}
              />
            ) : list.length === 0 && !searching && filter === 'all' && contacts.length > 0 ? (
              // Everybody added is still under "Not contacted". Saying so,
              // with the way through, beats an empty list that reads as a
              // bug right after an import (BUILD-REVIEW §2.102).
              <Empty
                testID="people-all-hidden"
                icon="users"
                title={filters.allHiddenT}
                body={filters.allHidden.replace('{n}', String(counts.untouched))}
                link={filters.untouched}
                onLink={() => setFilter('untouched')}
              />
            ) : list.length === 0 && !searching && filter === 'favorites' ? (
              <Empty testID="people-none" icon="star" title={copy.favTitle} body={copy.favBody} link={copy.favLink} onLink={() => setFilter('all')} />
            ) : list.length === 0 && ready ? (
              <View testID="people-none" style={{ paddingVertical: 30, paddingHorizontal: 10 }}>
                <Text token="bodyS" color={ink.s4} align="center">
                  {searching || filter === 'all'
                    ? t.pp_none.replace('{q}', query)
                    : filter === 'untouched'
                      ? filters.untouchedNone
                      : filters.recentNone}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </Screen>

      <TabBar
        active="people"
        onSelect={(key) => router.push(`/${key}`)}
        onCapture={() => router.push('/capture')}
        onBrainDump={() => router.push('/brain-dump')}
      />

      <Sheet open={more} onClose={() => setMore(false)} testID="people-more-sheet" padding={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: 30 }} gap={4}>
        {(
          [
            { key: 'bulk', icon: 'send', label: added(lang).bulk.entry, sub: added(lang).bulk.waNote.split('.')[0] ?? '', go: () => router.push('/bulk') },
            { key: 'file', icon: 'list', label: added(lang).addPeople.file, sub: added(lang).addPeople.fileSub, go: () => router.push('/import') },
            { key: 'smart', icon: 'target', label: added(lang).smart.entry, sub: added(lang).smart.entrySub, go: () => router.push('/smart-lists') },
          ] as { key: string; icon: IconName; label: string; sub: string; go: () => void }[]
        ).map((row) => (
          <Pressable
            key={row.key}
            testID={`more-${row.key}`}
            onPress={() => {
              setMore(false);
              row.go();
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: dir.row, alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16, backgroundColor: pressed ? surface.fill : 'transparent' })}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: surface.fill, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={row.icon} size={20} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text token="body" weight="600" numberOfLines={1}>
                {row.label}
              </Text>
              {row.key === 'file' ? (
                <Text token="micro" color={ink.s4} numberOfLines={1}>
                  {row.sub}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </Sheet>

      <AddMenu
        open={adding}
        copy={added(lang).addPeople}
        canPickFromPhone={canPickFromPhone}
        onClose={() => setAdding(false)}
        onChoose={(choice: AddChoice) => {
          setAdding(false);
          if (choice === 'new') router.push('/contact-edit');
          else if (choice === 'scan') router.push('/scan-card');
          else if (choice === 'many') router.push('/scan-many');
          else if (choice === 'file') router.push('/import');
          // The phone's whole address book, searchable, rather than the
          // system picker's one at a time — app/phone-book.tsx.
          else if (canListPhoneContacts) router.push('/phone-book');
          else void importFromPhone();
        }}
      />
      <ContactMenu
        contact={menuFor}
        favorite={menuFor ? favorites.has(menuFor.id) : false}
        copy={added(lang).menu}
        onClose={() => setMenuFor(null)}
        onStart={(contact, channel) => {
          setMenuFor(null);
          start(contact, channel);
        }}
        onMeeting={(contact) => {
          setMenuFor(null);
          router.push(`/new?type=meeting&contact=${contact.id}`);
        }}
        onProfile={(contact) => {
          setMenuFor(null);
          router.push(`/contact?id=${contact.id}`);
        }}
        onFavorite={(contact) => {
          setMenuFor(null);
          void star(contact);
        }}
      />
      <Toast />
    </>
  );
}

/** An icon, a title, a line of help and one link: what a chat list shows when it has nothing yet. */
function Empty({
  testID,
  icon,
  title,
  body,
  link,
  onLink,
}: {
  testID: string;
  icon: IconName;
  title: string;
  body: string;
  link: string;
  onLink: () => void;
}) {
  return (
    <View testID={testID} style={{ alignItems: 'center', gap: 12, paddingTop: 48, paddingHorizontal: 24 }}>
      <View style={{ width: 84, height: 84, borderRadius: 28, backgroundColor: typeColour.visit.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={36} color={typeColour.visit.fg} strokeWidth={1.7} />
      </View>
      <Text token="h2" align="center" weight="700">
        {title}
      </Text>
      <Text token="body" color={ink.s3} align="center">
        {body}
      </Text>
      <Pressable testID={`${testID}-link`} onPress={onLink} accessibilityRole="button" hitSlop={10} style={{ paddingVertical: 6 }}>
        <Text token="body" weight="600" color={typeColour.whatsapp.fg}>
          {link}
        </Text>
      </Pressable>
    </View>
  );
}

function PersonRow({
  contact,
  now,
  lang,
  favorite,
  followUp,
  lastChannel,
  onOpen,
  onHold,
}: {
  contact: Contact;
  now: Date;
  lang: 'en' | 'ar';
  favorite: boolean;
  followUp?: 'due' | 'waiting';
  /** How they were last reached, shown as a small icon on the picture. */
  lastChannel: Channel | null;
  onOpen: () => void;
  /** Press and hold: the quick-options menu. */
  onHold: () => void;
}) {
  const { t } = useLanguage();
  const dir = useDirection();
  const { width: windowWidth } = useWindowDimensions();
  const reach = contact.phone ? `${contact.dial ?? ''} ${contact.phone}`.trim() : contact.email ?? '';

  // The quiet line: what is going on with them, else when you last spoke, else who they are.
  const line = followUp
    ? { text: followUp === 'due' ? t.st.due : t.st.waiting, colour: followUp === 'due' ? status.invalid : ink.s3, weight: '600' as const }
    : contact.lastLabel && !isMomentLabel(contact.lastLabel)
      ? { text: contact.lastLabel, colour: ink.s4, weight: '400' as const }
      : // Who they are, and how to reach them when both still fit on the
        // row's one line. A long role used to leave the number cut to "+2…",
        // two characters of a phone number, which is noise rather than
        // information (seen on the owner's own list); the reach is dropped
        // instead, and the profile a tap away carries it in full.
        // src/features/people/quiet-line.ts
        { text: identityLine(contact.role, reach, lineWidth(windowWidth)), colour: ink.s4, weight: '400' as const };

  return (
    <Pressable
      testID={`person-${contact.id}`}
      onPress={onOpen}
      onLongPress={onHold}
      delayLongPress={350}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 14,
        paddingStart: 0,
        backgroundColor: pressed ? surface.fill : 'transparent',
      })}
    >
      <Avatar name={contact.name} contactId={contact.id} size={56} channel={lastChannel} />
      <View
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: dir.row,
          alignItems: 'center',
          gap: 10,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: surface.avatar,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text token="body" size={17} weight="600" numberOfLines={1}>
            {contact.name}
          </Text>
          <Text token="bodyS" color={line.colour} weight={line.weight} numberOfLines={1}>
            {line.text}
          </Text>
        </View>
        <View style={{ alignItems: dir.isRTL ? 'flex-start' : 'flex-end', gap: 6, minWidth: 54 }}>
          <Text token="micro" color={followUp === 'due' ? status.invalid : ink.s4} numberOfLines={1}>
            {chatTime(contact.touchedAt ?? contact.createdAt, now, lang)}
          </Text>
          {followUp === 'due' ? (
            <View testID={`person-${contact.id}-due`} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: status.invalid }} />
          ) : favorite ? (
            <Icon name="star" size={15} color={typeColour.visit.fg} filled />
          ) : (
            <View style={{ height: 15 }} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

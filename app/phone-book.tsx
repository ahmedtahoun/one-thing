/**
 * The phone's own address book, inside the app.
 *
 * Asked for by the owner, with WhatsApp's "+" as the reference: tap it and
 * see everyone you know, search, pick one. Before this, People's "From the
 * phone" opened the system picker — one person at a time, no search of
 * your own, and no sense of what you already had.
 *
 * **What it does not do is the point.** The list is read while this screen
 * is open and nothing else: only the person tapped is written into People,
 * and nobody is uploaded. That is what keeps the list in the app worth
 * reading — the people being dealt with, not nine hundred numbers off a
 * phone — and it is the promise `app.json`'s purpose string makes.
 *
 * Somebody already in People is marked and opens rather than doubling.
 * `src/features/people/phone-book.ts` decides all of that and is tested;
 * `src/lib/phone-contacts/all.ts` does the reading.
 *
 * **When iOS has handed over only part of the book** the screen says so and
 * offers Apple's picker, because otherwise it is indistinguishable from a
 * phone with two contacts on it — which is exactly how it was read on a real
 * device (BUILD-REVIEW §2.97).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import { addable, toggle } from '@/features/people/bulk-add';
import { alreadySaved, byName, dedupe, matchesQuery } from '@/features/people/phone-book';
import { Avatar } from '@/ui/Avatar';
import { BackButton } from '@/ui/BackButton';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { fontFamily, ink, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { ltr } from '@/lib/bidi';
import { usePeople } from '@/lib/people';
import { canWidenPhoneContacts, listPhoneContacts, widenPhoneContacts, type Access, type PhoneBook } from '@/lib/phone-contacts/all';
import type { ContactDraft } from '@/lib/phone-contacts/draft';

type Stage =
  | { kind: 'reading' }
  | { kind: 'ready'; people: ContactDraft[]; access: Access }
  | { kind: 'denied' }
  | { kind: 'failed' };

export default function PhoneBookScreen() {
  const { lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).phoneBook;
  const { contacts, addContact, addContacts } = usePeople();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>({ kind: 'reading' });
  const [query, setQuery] = useState('');
  /** Who is ticked, by their row's key. Empty means "tap one to open it". */
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());

  /** Reading the book. Run again after the system picker widens the grant. */
  const read = useCallback(
    async (alive: () => boolean = () => true) => {
      const result: PhoneBook = await listPhoneContacts();
      if (!alive()) return;
      if (!result.ok) return setStage({ kind: result.why === 'denied' ? 'denied' : 'failed' });
      setStage({ kind: 'ready', people: byName(dedupe(result.people), lang), access: result.access });
    },
    [lang],
  );

  useEffect(() => {
    let gone = false;
    void read(() => !gone);
    return () => {
      gone = true;
    };
  }, [read]);

  const people = stage.kind === 'ready' ? stage.people : [];
  /** iOS 18 gave us a few named people rather than the book. */
  const limited = stage.kind === 'ready' && stage.access === 'limited';

  /** Apple's picker, then read whatever it handed over. */
  const chooseMore = async () => {
    if (!(await widenPhoneContacts())) return;
    setChosen(new Set());
    await read();
  };
  const shown = useMemo(() => people.filter((person) => matchesQuery(person, query)), [people, query]);
  /** The key of a row: its number where it has one, else its name. */
  const keyOf = (person: ContactDraft) => `${person.phone || person.email || ''}|${person.name}`;
  /** Only people who are not here yet can be ticked; the rest say "Added". */
  const choosable = useMemo(() => addable(shown, contacts), [shown, contacts]);
  const picked = useMemo(() => people.filter((person) => chosen.has(keyOf(person))), [people, chosen]);

  /**
   * Adding everybody ticked, in one write. One person lands on their own
   * page, as a single tap always has; a crowd goes back to People, where
   * they now are.
   */
  const addChosen = () => {
    const rows = addable(picked, contacts);
    if (rows.length === 0) return;
    const saved = addContacts(
      rows.map((person) => ({
        name: person.name.trim(),
        role: person.role.trim() || undefined,
        dial: person.dial ?? undefined,
        phone: person.phone.trim() || undefined,
        email: person.email.trim() || undefined,
      }))
    );
    setChosen(new Set());
    if (saved.length === 1 && saved[0]) {
      toast.show(copy.saved.replace('{n}', saved[0].name), { undo: false });
      return router.replace(`/contact?id=${saved[0].id}`);
    }
    toast.show(copy.addedN.replace('{n}', String(saved.length)), { undo: false });
    router.replace('/people');
  };

  /** Tapping somebody: into People if they are new, then straight to them. */
  const pick = (person: ContactDraft) => {
    const had = alreadySaved(person, contacts);
    if (had) return router.replace(`/contact?id=${had}`);
    const saved = addContact({
      name: person.name.trim(),
      role: person.role.trim() || undefined,
      dial: person.dial ?? undefined,
      phone: person.phone.trim() || undefined,
      email: person.email.trim() || undefined,
    });
    toast.show(copy.saved.replace('{n}', person.name.trim()), { undo: false });
    router.replace(`/contact?id=${saved.id}`);
  };

  const row = (person: ContactDraft, at: number) => {
    const had = alreadySaved(person, contacts);
    const key = keyOf(person);
    const ticked = chosen.has(key);
    return (
      <Pressable
        testID={`phone-book-${at}`}
        // With nothing ticked a tap opens somebody, which is what a tap
        // means everywhere else. Once anything is ticked the list is a
        // selection, and a tap belongs to it.
        onPress={() => (had ? pick(person) : chosen.size > 0 ? setChosen(toggle(chosen, key)) : pick(person))}
        onLongPress={() => (had ? undefined : setChosen(toggle(chosen, key)))}
        accessibilityRole="button"
        accessibilityLabel={person.name}
        style={({ pressed }) => ({
          flexDirection: dir.row,
          alignItems: 'center',
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 4,
          borderRadius: 14,
          backgroundColor: pressed ? surface.fill : 'transparent',
        })}
      >
        <Avatar name={person.name} contactId={`phone-${at}`} size={42} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text token="body" weight="600" numberOfLines={1}>
            {person.name}
          </Text>
          <Text token="micro" color={ink.s4} numberOfLines={1}>
            {person.phone.trim() ? ltr(`${person.dial ?? ''} ${person.phone}`.trim()) : person.email}
          </Text>
        </View>
        {had ? (
          <Text token="micro" color={ink.s5}>
            {copy.added}
          </Text>
        ) : (
          <Pressable
            testID={`phone-book-tick-${at}`}
            onPress={() => setChosen(toggle(chosen, key))}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ticked }}
            hitSlop={10}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: ticked ? ink.solid : surface.line,
              backgroundColor: ticked ? ink.solid : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {ticked ? <Icon name="check" size={14} color={surface.white} strokeWidth={2.4} /> : null}
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <>
      <Screen paddingX={18} paddingTop={6} paddingBottom={20} style={{ gap: 12 }}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 10 }}>
          <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/people'))} />
          <Text token="h3">{copy.title}</Text>
        </View>

        {stage.kind === 'ready' ? (
          <>
            <Text token="micro" lh={17} color={ink.s4}>
              {copy.sub}
            </Text>

            {limited ? (
              <View testID="phone-book-limited" style={{ gap: 6, padding: 12, borderRadius: 14, backgroundColor: surface.fill }}>
                <Text token="bodyS" weight="600">
                  {copy.limited}
                </Text>
                <Text token="micro" lh={17} color={ink.s4}>
                  {copy.limitedHow}
                </Text>
                {canWidenPhoneContacts ? (
                  <View style={{ paddingTop: 6 }}>
                    <Button testID="phone-book-choose-more" variant="outline" label={copy.chooseMore} onPress={chooseMore} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {stage.kind === 'ready' && people.length > 0 ? (
          <>
            <TextInput
              testID="phone-book-search"
              value={query}
              onChangeText={setQuery}
              placeholder={copy.search}
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
            <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                testID="phone-book-select-all"
                onPress={() => setChosen(new Set(choosable.map(keyOf)))}
                accessibilityRole="button"
                hitSlop={8}
                disabled={choosable.length === 0}
              >
                <Text token="caption" weight="600" color={choosable.length === 0 ? ink.s5 : ink.base}>
                  {copy.selectAll}
                </Text>
              </Pressable>
              {chosen.size > 0 ? (
                <Pressable testID="phone-book-clear" onPress={() => setChosen(new Set())} accessibilityRole="button" hitSlop={8}>
                  <Text token="caption" color={ink.s4}>
                    {copy.clear}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <FlatList
              testID="phone-book-list"
              data={shown}
              keyExtractor={(person, at) => `${at}-${person.name}`}
              renderItem={({ item, index }) => row(item, index)}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              initialNumToRender={20}
              ListEmptyComponent={
                <Text testID="phone-book-none" token="bodyS" color={ink.s4} align="center" style={{ paddingVertical: 28 }}>
                  {copy.noMatch.replace('{q}', query.trim())}
                </Text>
              }
            />
            {chosen.size > 0 ? (
              <View style={{ paddingTop: 2 }}>
                <Button
                  testID="phone-book-add"
                  label={copy.add.replace('{n}', String(addable(picked, contacts).length))}
                  onPress={addChosen}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {stage.kind === 'ready' && people.length === 0 ? (
          <Text testID="phone-book-empty" token="bodyS" color={ink.s4} style={{ paddingVertical: 20 }}>
            {limited ? copy.noneLimited : copy.none}
          </Text>
        ) : null}

        {stage.kind === 'denied' || stage.kind === 'failed' ? (
          <View testID="phone-book-blocked" style={{ gap: 8, paddingVertical: 16 }}>
            <Text token="body" weight="600">
              {stage.kind === 'denied' ? copy.denied : copy.failed}
            </Text>
            {stage.kind === 'denied' ? (
              <Text token="bodyS" lh={21} color={ink.s3}>
                {copy.deniedHow}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Screen>
      <Toast />
    </>
  );
}

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
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import { alreadySaved, byName, dedupe, matchesQuery } from '@/features/people/phone-book';
import { Avatar } from '@/ui/Avatar';
import { BackButton } from '@/ui/BackButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { fontFamily, ink, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { ltr } from '@/lib/bidi';
import { usePeople } from '@/lib/people';
import { listPhoneContacts, type PhoneBook } from '@/lib/phone-contacts/all';
import type { ContactDraft } from '@/lib/phone-contacts/draft';

type Stage = { kind: 'reading' } | { kind: 'ready'; people: ContactDraft[] } | { kind: 'denied' } | { kind: 'failed' };

export default function PhoneBookScreen() {
  const { lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).phoneBook;
  const { contacts, addContact } = usePeople();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>({ kind: 'reading' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    let gone = false;
    void listPhoneContacts().then((result: PhoneBook) => {
      if (gone) return;
      if (!result.ok) return setStage({ kind: result.why === 'denied' ? 'denied' : 'failed' });
      setStage({ kind: 'ready', people: byName(dedupe(result.people), lang) });
    });
    return () => {
      gone = true;
    };
  }, [lang]);

  const people = stage.kind === 'ready' ? stage.people : [];
  const shown = useMemo(() => people.filter((person) => matchesQuery(person, query)), [people, query]);

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
    return (
      <Pressable
        testID={`phone-book-${at}`}
        onPress={() => pick(person)}
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
        ) : null}
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

        {stage.kind === 'ready' && people.length > 0 ? (
          <>
            <Text token="micro" lh={17} color={ink.s4}>
              {copy.sub}
            </Text>
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
          </>
        ) : null}

        {stage.kind === 'ready' && people.length === 0 ? (
          <Text testID="phone-book-empty" token="bodyS" color={ink.s4} style={{ paddingVertical: 20 }}>
            {copy.none}
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

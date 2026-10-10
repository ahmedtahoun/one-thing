/**
 * 10 · People — everyone the user has emailed, called or messaged.
 * SCREENS.md § 10.
 *
 * Container is 8 / 20 / 120 with a 16 pt gap, under the tab bar. A row opens
 * the contact profile; its three round buttons start a WhatsApp, email or
 * call task with that person and open Compose — nothing is sent from here.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { matchContact } from '@/features/people/search';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { TabBar } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { Toast } from '@/ui/Toast';
import { type IconName } from '@/design/icon-paths';
import { fontFamily, ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { initials, type Channel, type Contact } from '@/lib/model-types';
import { usePeople } from '@/lib/people';
import { useTasks } from '@/lib/tasks';

/** Bottom padding under the tab bar, as on Tasks. */
const BOTTOM_INSET = 120;

export default function People() {
  const { t, a11y } = useLanguage();
  const dir = useDirection();
  const { contacts } = usePeople();
  const { addTask } = useTasks();
  const [query, setQuery] = useState('');

  const list = useMemo(() => contacts.filter((c) => matchContact(c, query)), [contacts, query]);
  const searching = query.trim().length > 0;

  /**
   * Starts a message or call with this person and opens Compose on it. The
   * prototype stamps these 09:30 — ten minutes after its frozen 09:20 clock
   * — so here they are due now.
   */
  const start = useCallback(
    (contact: Contact, type: Channel) => {
      const first = contact.name.split(' ')[0] ?? contact.name;
      const task = addTask({
        type,
        title: t.newMsg[type].replace('{n}', first),
        who: contact.role ? `${contact.name} · ${contact.role}` : contact.name,
        contactIds: [contact.id],
        dueAt: new Date().toISOString(),
        createdVia: 'quick',
      });
      router.push(`/compose?id=${task.id}`);
    },
    [addTask, t.newMsg]
  );

  return (
    <>
      <Screen scroll paddingTop={8} paddingBottom={BOTTOM_INSET} style={{ gap: 16 }}>
        <View style={{ flexDirection: dir.row, alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text token="h1">{t.pp_t}</Text>
            <Text token="body" color={ink.s3}>
              {t.pp_s}
            </Text>
          </View>
          <Pressable
            testID="people-new"
            onPress={() => router.push('/contact-edit')}
            accessibilityRole="button"
            style={({ pressed }) => ({
              height: 40,
              paddingStart: 10,
              paddingEnd: 14,
              marginTop: 2,
              borderRadius: 999,
              backgroundColor: ink.base,
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 4,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Icon name="plus" size={16} color={surface.white} strokeWidth={2.2} />
            <Text token="bodyS" weight="500" color={surface.white}>
              {t.newC}
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 10,
            height: 48,
            borderRadius: 14,
            backgroundColor: surface.fill,
            paddingHorizontal: 14,
          }}
        >
          <Icon name="search" size={18} color={ink.s4} strokeWidth={1.7} />
          <TextInput
            testID="people-search"
            value={query}
            onChangeText={setQuery}
            placeholder={t.pp_ph}
            placeholderTextColor={ink.s5}
            autoCorrect={false}
            autoCapitalize="none"
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: `${fontFamily}_400Regular`,
              fontSize: 15,
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
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: surface.clearButton,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="x" size={14} strokeWidth={1.7} />
            </Pressable>
          ) : null}
        </View>

        <Text token="micro" color={ink.s4} style={{ letterSpacing: 0.48 }} testID="people-label">
          {searching ? t.pp_res.replace('{n}', String(list.length)) : t.pp_recent}
        </Text>

        <View style={{ gap: 2, marginTop: -8 }}>
          {list.map((contact) => (
            <PersonRow
              key={contact.id}
              contact={contact}
              onOpen={() => router.push(`/contact?id=${contact.id}`)}
              onStart={(type) => start(contact, type)}
            />
          ))}
        </View>

        {list.length === 0 ? (
          <View testID="people-none" style={{ paddingVertical: 30, paddingHorizontal: 10 }}>
            <Text token="bodyS" color={ink.s4} align="center">
              {t.pp_none.replace('{q}', query)}
            </Text>
          </View>
        ) : null}
      </Screen>

      <TabBar
        active="people"
        onSelect={(key) => router.push(`/${key}`)}
        onCapture={() => router.push('/capture')}
        onBrainDump={() => router.push('/brain-dump')}
      />
      <Toast />
    </>
  );
}

const QUICK: { type: Channel; icon: IconName }[] = [
  { type: 'whatsapp', icon: 'msg' },
  { type: 'email', icon: 'mail' },
  { type: 'call', icon: 'phone' },
];

function PersonRow({
  contact,
  onOpen,
  onStart,
}: {
  contact: Contact;
  onOpen: () => void;
  onStart: (type: Channel) => void;
}) {
  const { t } = useLanguage();
  const dir = useDirection();
  // Email first, else the number with its dial code — as the prototype shows.
  const reach = contact.email || (contact.phone ? `${contact.dial ?? ''} ${contact.phone}`.trim() : '');

  return (
    <View
      testID={`person-${contact.id}`}
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: surface.avatar,
      }}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        style={{ flex: 1, minWidth: 0, flexDirection: dir.row, alignItems: 'center', gap: 12 }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: surface.avatarPeople,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text token="bodyS" weight="600" align="center">
            {initials(contact.name)}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Text token="body" weight="600" numberOfLines={1}>
            {contact.name}
          </Text>
          <Text token="micro" color={ink.s4} numberOfLines={1}>
            {contact.role ?? ''}
            {contact.role && reach ? ' · ' : ''}
            {/* An LTR island, so an address or number keeps its order. */}
            {reach ? <Text token="micro" color={ink.s4} style={{ writingDirection: 'ltr' }}>{reach}</Text> : null}
          </Text>
          {contact.lastLabel ? (
            <Text size={11} color={ink.muted} numberOfLines={1}>
              {contact.lastLabel}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View style={{ flexDirection: dir.row, gap: 6 }}>
        {QUICK.map(({ type, icon }) => {
          // The prototype dims a button whose number or address is missing,
          // and leaves it tappable — Compose then asks for one.
          const has = type === 'email' ? Boolean(contact.email) : Boolean(contact.phone);
          return (
            <Pressable
              key={type}
              testID={`person-${contact.id}-${type}`}
              onPress={() => onStart(type)}
              accessibilityRole="button"
              accessibilityLabel={t.types[type]}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: typeColour[type].bg,
                opacity: has ? 1 : 0.4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={icon} size={16} color={typeColour[type].fg} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Send to many — one message, a list of people, and a queue.
 *
 * The app never sends anything for the person. WhatsApp can only open one
 * chat at a time, so a bulk send is a queue: the next person's chat opens
 * with the message already written, the person presses send there, and comes
 * back for the next. Email is one message with the recipients hidden (BCC),
 * unless it uses {name}, which makes it one email each.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';

import { added } from '@/content/additions';
import {
  bccMailto,
  chunk,
  MAILTO_CHUNK,
  MAX_RECIPIENTS,
  personalise,
  reachable,
  recipientsOf,
  usesName,
  whatsAppLink,
  type BulkChannel,
} from '@/features/bulk/plan';
import { mailtoUrl } from '@/features/compose/recipient';
import { FilterChips } from '@/features/people/FilterChips';
import { BULK_CHIPS, filterCounts, filterPeople, type PeopleFilter } from '@/features/people/filters';
import { matchContact } from '@/features/people/search';
import { Button } from '@/ui/Button';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { fontFamily, ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { type Contact } from '@/lib/model-types';
import { useFavorites } from '@/lib/favorites';
import { usePeople } from '@/lib/people';

type Item = { key: string; title: string; preview: string; run: () => Promise<void> };

export default function Bulk() {
  const { t, lang, a11y } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).bulk;
  const { contacts, followUps } = usePeople();
  const favorites = useFavorites();
  const toast = useToast();
  const params = useLocalSearchParams<{ channel?: string }>();

  const [channel, setChannel] = useState<BulkChannel>(params.channel === 'email' ? 'email' : 'whatsapp');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [queue, setQueue] = useState<Item[] | null>(null);
  const [index, setIndex] = useState(0);
  const [opened, setOpened] = useState(false);
  const bodyRef = useRef<TextInput>(null);
  const [mailAvailable, setMailAvailable] = useState(false);
  useEffect(() => {
    MailComposer.isAvailableAsync().then(setMailAvailable).catch(() => setMailAvailable(false));
  }, []);

  const [filter, setFilter] = useState<PeopleFilter>('all');
  const [now] = useState(() => new Date());
  const context = useMemo(() => ({ followUps, favorites, now }), [followUps, favorites, now]);
  const counts = useMemo(() => filterCounts(contacts, context), [contacts, context]);
  const list = useMemo(() => filterPeople(filter, contacts, context).filter((c) => matchContact(c, query)), [contacts, context, filter, query]);
  const people = list.filter((c) => reachable(channel, c));
  const chosen = recipientsOf(channel, contacts, selected);
  const personal = channel === 'email' && usesName(body);
  const colour = typeColour[channel];

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = people.length > 0 && people.every((c) => selected.has(c.id));
  const selectAll = () => setSelected(allSelected ? new Set() : new Set(people.slice(0, MAX_RECIPIENTS).map((c) => c.id)));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/people'));

  /** What each step of the run does when its button is pressed. */
  const buildQueue = (): Item[] => {
    if (channel === 'whatsapp') {
      return chosen.map((c) => ({
        key: c.id,
        title: c.name,
        preview: personalise(body, c),
        run: async () => void (await Linking.openURL(whatsAppLink(c, body)).catch(() => {})),
      }));
    }
    const mailOne = (c: Contact): Item => ({
      key: c.id,
      title: c.name,
      preview: personalise(body, c),
      run: async () => {
        const text = personalise(body, c);
        if (mailAvailable) await MailComposer.composeAsync({ recipients: [c.email ?? ''], subject, body: text }).catch(() => null);
        else {
          await Clipboard.setStringAsync(text).catch(() => {});
          await Linking.openURL(mailtoUrl(c.email ?? '', subject, text)).catch(() => {});
        }
      },
    });
    if (personal) return chosen.map(mailOne);
    const addresses = chosen.map((c) => (c.email ?? '').trim());
    if (mailAvailable) {
      return [
        {
          key: 'bcc',
          title: copy.openBcc.replace('{n}', String(addresses.length)),
          preview: body,
          run: async () => void (await MailComposer.composeAsync({ bccRecipients: addresses, subject, body }).catch(() => null)),
        },
      ];
    }
    // No mail composer: links, in batches short enough not to be cut off.
    return chunk(addresses, MAILTO_CHUNK).map((group, i) => ({
      key: `bcc-${i}`,
      title: copy.openBcc.replace('{n}', String(group.length)),
      preview: body,
      run: async () => {
        await Clipboard.setStringAsync(body).catch(() => {});
        await Linking.openURL(bccMailto(group, subject, body)).catch(() => {});
      },
    }));
  };

  const start = () => {
    if (!body.trim()) return toast.show(copy.needMessage, { undo: false });
    if (chosen.length === 0) return toast.show(copy.needPeople, { undo: false });
    setQueue(buildQueue());
    setIndex(0);
    setOpened(false);
  };

  const step = queue?.[index];
  const finished = queue !== null && index >= queue.length;
  const press = async () => {
    if (!step) return;
    if (!opened) {
      await step.run();
      setOpened(true);
    } else {
      setIndex((i) => i + 1);
      setOpened(false);
    }
  };

  const pill = (value: BulkChannel, label: string) => {
    const on = channel === value;
    return (
      <Pressable
        key={value}
        testID={`bulk-${value}`}
        onPress={() => {
          setChannel(value);
          setSelected(new Set());
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={{
          flex: 1,
          height: 44,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? typeColour[value].bg : surface.fill,
          borderWidth: on ? 1.5 : 0,
          borderColor: typeColour[value].fg,
        }}
      >
        <Text token="bodyS" weight="600" color={on ? typeColour[value].fg : ink.s3}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const field = (extra: object, value: string, onChange: (v: string) => void, placeholder: string, testID: string, ref?: React.Ref<TextInput>) => (
    <TextInput
      ref={ref}
      testID={testID}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={ink.s5}
      style={{
        borderWidth: 1,
        borderColor: surface.line,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontFamily: `${fontFamily}_400Regular`,
        fontSize: 15,
        color: ink.base,
        textAlign: dir.textAlign,
        writingDirection: dir.isRTL ? 'rtl' : 'ltr',
        ...extra,
      }}
    />
  );

  const header = (
    <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingTop: 6, paddingBottom: 10 }}>
      <Pressable testID="bulk-back" onPress={back} accessibilityRole="button" accessibilityLabel={a11y.back} hitSlop={12}>
        <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
          <Icon name="back" size={24} strokeWidth={2} />
        </View>
      </Pressable>
      <Text token="title">{copy.title}</Text>
    </View>
  );

  // --- the run ----------------------------------------------------------------
  if (queue) {
    return (
      <>
        <Screen paddingBottom={32} style={{ gap: 18 }}>
          {header}
          {finished ? (
            <View testID="bulk-done" style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
              <Text token="h1" align="center">
                {copy.done}
              </Text>
              <Text token="body" color={ink.s3} align="center">
                {copy.doneBody.replace('{n}', String(queue.length))}
              </Text>
              <Button testID="bulk-back-people" label={copy.back} onPress={() => router.replace('/people')} />
            </View>
          ) : (
            <View style={{ flex: 1, gap: 18 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: surface.fill, overflow: 'hidden' }}>
                <View style={{ width: `${(index / queue.length) * 100}%`, height: 6, backgroundColor: colour.fg }} />
              </View>
              <Text token="micro" color={ink.s4} testID="bulk-progress">
                {copy.progress.replace('{i}', String(index + 1)).replace('{n}', String(queue.length))}
              </Text>
              <View style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 18, padding: 18, gap: 10 }}>
                <Text token="title">{step?.title}</Text>
                <Text token="body" color={ink.s3}>
                  {step?.preview}
                </Text>
              </View>
              {opened ? (
                <Text token="caption" color={ink.s3}>
                  {copy.after}
                </Text>
              ) : null}
              <View style={{ gap: 10 }}>
                <Button
                  testID="bulk-press"
                  label={
                    opened
                      ? copy.next
                      : (channel === 'whatsapp' ? copy.openWa : copy.openMail).replace('{n}', step?.title ?? '')
                  }
                  onPress={() => void press()}
                />
                <View style={{ flexDirection: dir.row, gap: 10 }}>
                  {!opened ? (
                    <Button
                      testID="bulk-skip"
                      variant="outline"
                      label={copy.skip}
                      onPress={() => setIndex((i) => i + 1)}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                  <Button testID="bulk-stop" variant="outline" label={copy.stop} onPress={() => setQueue(null)} style={{ flex: 1 }} />
                </View>
              </View>
            </View>
          )}
        </Screen>
        <Toast />
      </>
    );
  }

  // --- the setup ---------------------------------------------------------------
  return (
    <>
      <Screen paddingBottom={0}>
        {header}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: dir.row, gap: 10 }}>
            {pill('whatsapp', copy.whatsapp)}
            {pill('email', copy.email)}
          </View>

          {channel === 'email' ? field({ height: 48 }, subject, setSubject, copy.subject, 'bulk-subject') : null}
          {field({ minHeight: 120, textAlignVertical: 'top' }, body, setBody, copy.messagePh, 'bulk-body', bodyRef)}
          {(body.length === 0 || !usesName(body)) && (
            <Pressable
              testID="bulk-insert-name"
              onPress={() => setBody((b) => `${b}${b && !b.endsWith(' ') ? ' ' : ''}${lang === 'ar' ? '{الاسم}' : '{name}'}`)}
              accessibilityRole="button"
              style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: surface.fill }}
            >
              <Text token="caption" weight="600">
                {copy.insertName}
              </Text>
            </Pressable>
          )}
          <Text token="caption" color={ink.s3} testID="bulk-note">
            {channel === 'whatsapp' ? copy.waNote : personal ? copy.personalNote : copy.bccNote}
          </Text>

          <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <Text token="title">{copy.recipients}</Text>
            <Pressable testID="bulk-select-all" onPress={selectAll} accessibilityRole="button" hitSlop={8}>
              <Text token="bodyS" weight="600" color={colour.fg}>
                {allSelected ? copy.clear : copy.selectAll}
              </Text>
            </Pressable>
          </View>
          <FilterChips options={BULK_CHIPS} value={filter} onChange={setFilter} dueCount={counts.due} labels={added(lang).filters} testID="bulk-filters" />
          {field({ height: 44 }, query, setQuery, t.pp_ph, 'bulk-search')}

          <View>
            {list.map((c) => {
              const can = reachable(channel, c);
              const on = selected.has(c.id);
              return (
                <Pressable
                  key={c.id}
                  testID={`bulk-person-${c.id}`}
                  onPress={() => can && toggle(c.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: !can }}
                  style={{
                    flexDirection: dir.row,
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: surface.avatar,
                    opacity: can ? 1 : 0.45,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: on ? colour.fg : surface.line,
                      backgroundColor: on ? colour.fg : surface.white,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {on ? <Icon name="check" size={14} color={surface.white} strokeWidth={2.4} /> : null}
                  </View>
                  <Avatar name={c.name} contactId={c.id} size={38} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text token="body" weight="600" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text token="micro" color={ink.s4} numberOfLines={1} style={{ writingDirection: 'ltr', textAlign: dir.textAlign }}>
                      {can ? (channel === 'email' ? c.email : `${c.dial ?? ''} ${c.phone}`.trim()) : channel === 'email' ? copy.noEmail : copy.noNumber}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={{ paddingTop: 10, paddingBottom: 28, gap: 8 }}>
          {chosen.length >= MAX_RECIPIENTS ? (
            <Text token="micro" color={ink.s4} align="center">
              {copy.limit.replace('{n}', String(MAX_RECIPIENTS))}
            </Text>
          ) : null}
          <Button
            testID="bulk-start"
            label={chosen.length > 0 ? copy.start.replace('{n}', String(chosen.length)) : copy.title}
            dimmed={chosen.length === 0 || !body.trim()}
            onPress={start}
          />
        </View>
      </Screen>
      <Toast />
    </>
  );
}

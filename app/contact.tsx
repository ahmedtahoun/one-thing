/**
 * 11 · A person's page.
 *
 * Opens on the history, like a chat thread that only holds what you did and
 * wrote: newest at the bottom, grouped by day. Above it what is still open
 * with them; below it the box to write the last comment and the ways to reach
 * them (WhatsApp, email, call, meeting). Everything else about the person —
 * numbers, address, the note to remember, the keep-in-touch rhythm — is under
 * "Details", so the page stays about the conversation.
 */
import { clockOf } from '@/lib/clock-format';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { added } from '@/content/additions';
import { buildTimeline, type TimelineItem } from '@/features/contact/timeline';
import { mapsUrl } from '@/features/people/maps';
import { useStartTask } from '@/features/people/start-task';
import { Avatar } from '@/ui/Avatar';
import { ThreadBackground } from '@/features/contact/ThreadBackground';
import { Icon } from '@/ui/Icon';
import { PhotoSheet } from '@/features/people/PhotoSheet';
import { Screen } from '@/ui/Screen';
import { LTRText, Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { whenText } from '@/features/capture/labels';
import { dayOf, timeOf, titleOf, whenOf } from '@/lib/parse/local';
import { TYPE_ICON, type IconName } from '@/design/icon-paths';
import { fontFamily, ink, noteColour, status, surface, typeColour, type TaskType } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { type Contact } from '@/lib/model-types';
import { toggleFavorite, useFavorites } from '@/lib/favorites';
import { CADENCES, setCadence, useCadence } from '@/lib/cadence';
import { usePhotos } from '@/lib/photos';
import { contactForTask, usePeople } from '@/lib/people';
import { whenLabel } from '@/lib/task-labels';
import { useTasks } from '@/lib/tasks';

function kindColour(kind: string) {
  return kind in typeColour ? typeColour[kind as TaskType] : noteColour;
}

function kindIcon(kind: string): IconName {
  return kind === 'note' ? 'note' : (TYPE_ICON[kind as TaskType] as IconName);
}

export default function ContactProfile() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { contacts, ready } = usePeople();
  const contact = contacts.find((c) => c.id === id);

  if (!ready) return null;
  if (!contact) return <Redirect href="/people" />;
  return <Profile key={contact.id} contact={contact} />;
}

function Profile({ contact }: { contact: Contact }) {
  const { t, pfx, lang, a11y, inline } = useLanguage();
  const dir = useDirection();
  const copy = added(lang);
  const { contacts, history, followUps, updateContact, addHistory, updateFollowUp, restoreFollowUps, restoreHistory } = usePeople();
  const { tasks, toggleDone, addTask, restore } = useTasks();
  const toast = useToast();
  const start = useStartTask();

  const favorite = useFavorites().has(contact.id);
  const rhythmCopy = copy.rhythm;
  // What applies now: their own rhythm, else two weeks for a favourite, else none.
  const rhythm = useCadence().get(contact.id) ?? (favorite ? 14 : 0);
  const [note, setNote] = useState(contact.rememberNote ?? '');
  const [photoOpen, setPhotoOpen] = useState(false);
  const hasPhoto = usePhotos().has(contact.id);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [logText, setLogText] = useState('');
  const [remind, setRemind] = useState(false);
  const [now] = useState(() => new Date());
  const scroller = useRef<ScrollView>(null);

  const hasPhone = Boolean(contact.phone);
  const hasEmail = Boolean(contact.email);
  const tags = [
    hasPhone ? `${contact.dial ?? ''} ${contact.phone}`.trim() : null,
    contact.phone2 ? `${contact.dial2 ?? contact.dial ?? ''} ${contact.phone2}`.trim() : null,
    contact.email || null,
    contact.email2 || null,
  ].filter((tag): tag is string => Boolean(tag));

  // What is still open with this person: tasks and promises, soonest first, and replies they owe.
  const openTasks = useMemo(
    () =>
      tasks
        .filter((task) => (task.status === 'open' || task.status === 'snoozed') && contactForTask(task, contacts)?.id === contact.id)
        .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')),
    [tasks, contacts, contact.id]
  );
  const waiting = useMemo(
    () => followUps.filter((f) => f.status !== 'done' && (f.contactId ? f.contactId === contact.id : false)),
    [followUps, contact.id]
  );

  // The history is read like a chat: oldest first, the newest at the bottom, where the page opens.
  const { groups, count } = useMemo(() => {
    // Where every thread begins, dated when the person was added, so it sits where it belongs among the rest.
    const begun = { id: `created-${contact.id}`, contactId: contact.id, kind: 'note' as const, text: copy.thread.added, at: contact.createdAt };
    const built = buildTimeline({ contact, history: [...history, begun], followUps, now, lang, words: { today: pfx.today, yest: pfx.yest } });
    const ordered = [...built.groups].reverse().map((g) => ({ label: g.label, items: [...g.items].reverse() }));
    return { groups: ordered, count: built.count - 1 };
  }, [contact, history, followUps, now, lang, pfx.today, pfx.yest, copy.thread.added]);

  useEffect(() => {
    const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: false }), 60);
    return () => clearTimeout(id);
  }, [contact.id]);

  const saveNote = (text: string) => {
    setNote(text);
    updateContact(contact.id, { rememberNote: text });
  };

  // A note that names a day or a time can also become a reminder for this person, in one tap.
  const when = useMemo(() => {
    const text = logText.trim();
    if (!text) return null;
    const probe = new Date();
    if (!dayOf(text, probe).said && !timeOf(text)) return null;
    return whenOf(text, probe);
  }, [logText]);

  const log = () => {
    const text = logText.trim();
    if (!text) return;
    addHistory({ contactId: contact.id, kind: 'note', text, at: new Date().toISOString() });
    if (remind && when) {
      addTask({
        type: 'reminder',
        title: titleOf(text) || text,
        who: contact.name,
        contactIds: [contact.id],
        dueAt: when,
        goal: text,
        createdVia: 'quick',
      });
      toast.show(t.toastSaved, { undo: false });
    }
    setLogText('');
    setRemind(false);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);
  };

  const finishTask = (id: string) => {
    const before = tasks;
    toggleDone(id);
    toast.show(t.toastDone, { undo: () => restore(before) });
  };
  const finishWaiting = (id: string) => {
    const before = followUps;
    const historyBefore = history;
    const at = new Date().toISOString();
    updateFollowUp(id, { status: 'done', lastAction: 'closed', lastActionAt: at });
    // They replied: a moment in the thread.
    addHistory({ contactId: contact.id, kind: 'note', text: copy.sent.replied, at });
    toast.show(t.toastDone, {
      undo: () => {
        restoreFollowUps(before);
        restoreHistory(historyBefore);
      },
    });
  };

  const pinned: { key: string; testID: string; title: string; sub: string; icon: IconName; bg: string; fg: string; finish: () => void; label?: string }[] = [
    ...openTasks.map((task) => ({
      key: task.id,
      testID: `contact-next-${task.id}`,
      title: task.title,
      sub: whenLabel(task, t, inline, now) || clockOf(task.dueAt),
      icon: TYPE_ICON[task.type] as IconName,
      bg: typeColour[task.type].bg,
      fg: typeColour[task.type].fg,
      finish: () => finishTask(task.id),
    })),
    ...waiting.map((f) => ({
      key: f.id,
      testID: `contact-waiting-${f.id}`,
      title: f.what,
      sub: copy.thread.waiting,
      icon: 'clock' as IconName,
      bg: typeColour[f.channel].bg,
      fg: typeColour[f.channel].fg,
      finish: () => finishWaiting(f.id),
      label: copy.sent.replied,
    })),
  ];

  const actions: { key: string; label: string; ok: boolean; onPress: () => void }[] = [
    { key: 'whatsapp', label: t.types.whatsapp, ok: hasPhone, onPress: () => start(contact, 'whatsapp', undefined, 'contact') },
    { key: 'email', label: t.types.email, ok: hasEmail, onPress: () => start(contact, 'email', undefined, 'contact') },
    { key: 'call', label: t.types.call, ok: hasPhone, onPress: () => start(contact, 'call', undefined, 'contact') },
    // Pre-fills the attendee on the meeting form.
    { key: 'meeting', label: pfx.l.meet, ok: true, onPress: () => router.push(`/new?type=meeting&contact=${contact.id}`) },
  ];

  const back = () => (router.canGoBack() ? router.back() : router.replace('/people'));

  const roundButton = (testID: string, label: string, onPress: () => void, children: React.ReactNode) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: surface.white, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </Pressable>
  );

  return (
    <>
      <Screen background={surface.thread} paddingTop={4} paddingBottom={0}>
        <ThreadBackground />
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 10, paddingBottom: 8 }}>
          <Pressable testID="contact-back" onPress={back} accessibilityRole="button" accessibilityLabel={a11y.back} hitSlop={10} style={{ paddingVertical: 6 }}>
            <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
              <Icon name="back" size={22} strokeWidth={1.7} />
            </View>
          </Pressable>
          <Pressable testID="contact-photo" onPress={() => setPhotoOpen(true)} accessibilityRole="button" accessibilityLabel={copy.photo.hint}>
            <Avatar name={contact.name} contactId={contact.id} size={40} />
          </Pressable>
          {/* The name stays in view; tapping it opens the details. */}
          <Pressable
            testID="contact-name-bar"
            onPress={() => {
              setDetailsOpen((v) => !v);
              scroller.current?.scrollTo({ y: 0, animated: true });
            }}
            accessibilityRole="button"
            style={{ flex: 1, minWidth: 0 }}
          >
            <Text token="body" weight="600" numberOfLines={1} testID="contact-name">
              {contact.name}
            </Text>
            {contact.role ? (
              <Text token="micro" color={ink.s4} numberOfLines={1}>
                {contact.role}
              </Text>
            ) : null}
          </Pressable>
          {roundButton('contact-favorite', copy.filters.favorite, () => void toggleFavorite(contact.id), (
            <Icon name="star" size={18} color={favorite ? typeColour.visit.fg : ink.s4} filled={favorite} strokeWidth={1.8} />
          ))}
          <Pressable
            testID="contact-edit"
            onPress={() => router.push(`/contact-edit?id=${contact.id}`)}
            accessibilityRole="button"
            style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: surface.white }}
          >
            <Text token="bodyS" weight="500">
              {pfx.l.edit}
            </Text>
          </Pressable>
        </View>

        {/* What is still open with them stays above the thread: two rows, the rest a tap away. */}
        {pinned.length > 0 ? (
          <View testID="contact-open" style={{ backgroundColor: surface.white, borderRadius: 16, overflow: 'hidden', marginBottom: 8 }}>
            {(allOpen ? pinned : pinned.slice(0, 2)).map((row) => (
              <View key={row.key} testID={row.testID} style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: surface.avatar }}>
                <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: row.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={row.icon} size={15} color={row.fg} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <Text token="bodyS" weight="500" numberOfLines={1}>
                    {row.title}
                  </Text>
                  <LTRText token="micro" color={ink.s4} tabular numberOfLines={1}>
                    {row.sub}
                  </LTRText>
                </View>
                <Pressable
                  testID={`${row.testID}-done`}
                  onPress={row.finish}
                  accessibilityRole="button"
                  accessibilityLabel={row.label ?? t.nDone}
                  hitSlop={8}
                  style={{ minWidth: 34, height: 34, borderRadius: 17, paddingHorizontal: row.label ? 12 : 0, backgroundColor: surface.fill, flexDirection: dir.row, alignItems: 'center', justifyContent: 'center', gap: 5 }}
                >
                  <Icon name="check" size={16} color={ink.s2} strokeWidth={2.2} />
                  {row.label ? (
                    <Text token="caption" weight="600" color={ink.s2}>
                      {row.label}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            ))}
            {pinned.length > 2 ? (
              <Pressable testID="contact-open-more" onPress={() => setAllOpen((v) => !v)} accessibilityRole="button" style={{ paddingVertical: 8, alignItems: 'center' }}>
                <Text token="caption" weight="600" color={ink.s3}>
                  {allOpen ? copy.next.less : copy.next.more.replace('{n}', String(pinned.length - 2))}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {contact.labels && contact.labels.length > 0 ? (
            <View testID="contact-labels" style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 6 }}>
              {contact.labels.map((label) => (
                <View key={label} style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: ink.solid }}>
                  <Text token="micro" weight="600" color={surface.white}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Numbers, address, the note, the rhythm: there when wanted, out of the way otherwise. */}
          <Pressable testID="contact-details-toggle" onPress={() => setDetailsOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }} style={{ flexDirection: dir.row, alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 }}>
            <Text token="bodyS" weight="600" color={ink.s3}>
              {copy.thread.details}
            </Text>
            <View style={{ transform: [{ rotate: detailsOpen ? '90deg' : dir.isRTL ? '180deg' : '0deg' }] }}>
              <Icon name="chev" size={14} color={ink.s3} strokeWidth={2} />
            </View>
          </Pressable>
          {detailsOpen ? (
            <View testID="contact-details" style={{ gap: 10 }}>
              {tags.length ? (
                <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 6 }}>
                  {tags.map((tag) => (
                    <View key={tag} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: surface.white }}>
                      <LTRText token="micro" color={ink.s2}>
                        {tag}
                      </LTRText>
                    </View>
                  ))}
                </View>
              ) : null}
              {contact.address ? (
                <Pressable
                  testID="contact-address"
                  onPress={() => void Linking.openURL(mapsUrl(contact.address ?? ''))}
                  accessibilityRole="link"
                  accessibilityLabel={`${copy.contact.openMap}: ${contact.address}`}
                  style={{ flexDirection: dir.row, alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: surface.white }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: typeColour.visit.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="pin" size={18} color={typeColour.visit.fg} strokeWidth={1.9} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text token="bodyS" numberOfLines={2}>
                      {contact.address}
                    </Text>
                    <Text token="micro" color={ink.s4}>
                      {copy.contact.openMap}
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              <View style={{ gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: status.noteBg }}>
                <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 6 }}>
                  <Icon name="bulb" size={14} color={status.noteFg} strokeWidth={2} />
                  <Text token="micro" weight="600" color={status.noteFg}>
                    {pfx.l.remember}
                  </Text>
                </View>
                <TextInput
                  testID="contact-note"
                  value={note}
                  onChangeText={saveNote}
                  placeholder={pfx.l.rememberPh}
                  placeholderTextColor={ink.s5}
                  multiline
                  textAlignVertical="top"
                  style={{
                    minHeight: 45,
                    padding: 0,
                    fontFamily: `${fontFamily}_400Regular`,
                    fontSize: 15,
                    lineHeight: 22.5,
                    color: ink.base,
                    writingDirection: dir.isRTL ? 'rtl' : 'ltr',
                    textAlign: dir.textAlign,
                  }}
                />
              </View>

              <View testID="contact-rhythm" style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: surface.white }}>
                <View style={{ gap: 2 }}>
                  <Text token="body" weight="600">
                    {rhythmCopy.title}
                  </Text>
                  <Text token="caption" color={ink.s4}>
                    {rhythmCopy.hint}
                  </Text>
                </View>
                <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8 }}>
                  {CADENCES.map((days, i) => {
                    const on = rhythm === days;
                    return (
                      <Pressable
                        key={days}
                        testID={`contact-rhythm-${days}`}
                        onPress={() => void setCadence(contact.id, days)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? ink.solid : surface.fill }}
                      >
                        <Text token="bodyS" weight="600" color={on ? surface.white : ink.s2}>
                          {rhythmCopy.options[i]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}

          {/* The history, as a thread: your own entries, oldest first. */}
          <Text token="micro" color={ink.s5} align="center" testID="contact-history-count">
            {pfx.n.replace('{n}', String(count))}
          </Text>
          {count === 0 ? (
            <Text token="bodyS" color={ink.s4} align="center" testID="contact-empty">
              {copy.thread.empty}
            </Text>
          ) : null}
          {groups.map((group) => (
            <View key={group.label} style={{ gap: 8 }}>
              <View style={{ alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: surface.white }}>
                <Text token="micro" weight="600" color={ink.s3}>
                  {group.label}
                </Text>
              </View>
              {group.items.map((item) => (
                <Bubble key={item.key} item={item} />
              ))}
            </View>
          ))}
        </ScrollView>

        {/* The dock: the ways to reach them, and the box for the last comment. */}
        <View style={{ gap: 8, paddingTop: 8, paddingBottom: 24 }}>
          <View style={{ flexDirection: dir.row, gap: 8 }}>
            {actions.map((a) => {
              const colour = typeColour[a.key as TaskType];
              return (
                <Pressable
                  key={a.key}
                  testID={`contact-action-${a.key}`}
                  // Missing a number or address: dimmed and inert.
                  onPress={a.ok ? a.onPress : undefined}
                  disabled={!a.ok}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !a.ok }}
                  style={{ flex: 1, height: 54, borderRadius: 18, backgroundColor: colour.bg, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: a.ok ? 1 : 0.4 }}
                >
                  <Icon name={TYPE_ICON[a.key as TaskType]} size={16} color={colour.fg} strokeWidth={2} />
                  <Text token="micro" weight="600" color={colour.fg} numberOfLines={1}>
                    {a.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {when ? (
            <Pressable
              testID="contact-remind"
              onPress={() => setRemind((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ selected: remind }}
              style={{ alignSelf: 'flex-start', flexDirection: dir.row, alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: remind ? typeColour.reminder.fg : typeColour.reminder.bg }}
            >
              <Icon name="bell" size={14} color={remind ? surface.white : typeColour.reminder.fg} strokeWidth={2} />
              <Text token="caption" weight="600" color={remind ? surface.white : typeColour.reminder.fg}>
                {copy.thread.remindAlso.replace('{w}', whenText(when, t))}
              </Text>
            </Pressable>
          ) : null}
          <View style={{ flexDirection: dir.row, gap: 8, alignItems: 'center' }}>
            <TextInput
              testID="contact-log-text"
              value={logText}
              onChangeText={setLogText}
              onSubmitEditing={log}
              returnKeyType="send"
              placeholder={pfx.l.logPh}
              placeholderTextColor={ink.s5}
              style={{
                flex: 1,
                minWidth: 0,
                height: 46,
                borderRadius: 23,
                backgroundColor: surface.white,
                paddingHorizontal: 18,
                fontFamily: `${fontFamily}_400Regular`,
                fontSize: 15,
                color: ink.base,
                writingDirection: dir.isRTL ? 'rtl' : 'ltr',
                textAlign: dir.textAlign,
              }}
            />
            <Pressable
              testID="contact-log"
              onPress={log}
              accessibilityRole="button"
              accessibilityLabel={pfx.l.add}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: logText.trim() ? ink.solid : ink.disabledBtn, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
                <Icon name="send" size={19} color={surface.white} strokeWidth={2} />
              </View>
            </Pressable>
          </View>
        </View>
      </Screen>
      <PhotoSheet open={photoOpen} contactId={contact.id} hasPhoto={hasPhoto} onClose={() => setPhotoOpen(false)} />
      <Toast />
    </>
  );
}

/** One entry of the thread: a bubble at the end of the line, in the kind's colour, with its time. */
function Bubble({ item }: { item: TimelineItem }) {
  const { t, pfx } = useLanguage();
  const dir = useDirection();
  const colour = kindColour(item.kind);
  const typeName = item.kind in t.types ? t.types[item.kind as TaskType] : '';
  return (
    <View testID={`moment-${item.key}`} style={{ alignSelf: 'flex-end', maxWidth: '86%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderTopEndRadius: 4, backgroundColor: colour.bg, gap: 3 }}>
      {typeName ? (
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 5 }}>
          <Icon name={kindIcon(item.kind)} size={12} color={colour.fg} strokeWidth={2.2} />
          <Text token="micro" weight="600" color={colour.fg}>
            {typeName}
          </Text>
        </View>
      ) : null}
      <Text token="bodyS" lh={19.6}>
        {item.text}
      </Text>
      {item.time ? (
        <LTRText token="micro" color={ink.s4} tabular style={{ alignSelf: 'flex-end' }}>
          {item.time}
        </LTRText>
      ) : null}
    </View>
  );
}

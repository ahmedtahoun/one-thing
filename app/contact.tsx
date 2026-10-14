/**
 * 11 · Contact profile. SCREENS.md § 11.
 *
 * Grouped screen on `fill-2`, 4 / 20 / 120 with a 20 pt gap. Who they are and
 * how to reach them; four action tiles; the "Remember for next time" note,
 * which saves as it is typed; what is coming up with them; and their dated
 * history, with a quick log on top.
 */
import { clockOf } from '@/lib/clock-format';
import { useMemo, useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { added } from '@/content/additions';
import { buildTimeline, type TimelineItem } from '@/features/contact/timeline';
import { mapsUrl } from '@/features/people/maps';
import { useStartTask } from '@/features/people/start-task';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { PhotoSheet } from '@/features/people/PhotoSheet';
import { Screen } from '@/ui/Screen';
import { LTRText, Text } from '@/ui/Text';
import { Toast } from '@/ui/Toast';
import { TYPE_ICON, type IconName } from '@/design/icon-paths';
import { fontFamily, ink, noteColour, status, surface, typeColour, type TaskType } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { type Contact, type HistoryKind } from '@/lib/model-types';
import { toggleFavorite, useFavorites } from '@/lib/favorites';
import { CADENCES, setCadence, useCadence } from '@/lib/cadence';
import { usePhotos } from '@/lib/photos';
import { contactForTask, usePeople } from '@/lib/people';
import { whenLabel } from '@/lib/task-labels';
import { useTasks } from '@/lib/tasks';

/** The quick log's four kinds, in the prototype's order. */
type LogKind = 'note' | 'call' | 'meeting' | 'visit';

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
  const { contacts, history, followUps, updateContact, addHistory } = usePeople();
  const { tasks } = useTasks();
  const start = useStartTask();

  const favorite = useFavorites().has(contact.id);
  const rhythmCopy = added(lang).rhythm;
  // What applies now: their own rhythm, else two weeks for a favourite, else none.
  const rhythm = useCadence().get(contact.id) ?? (favorite ? 14 : 0);
  const [note, setNote] = useState(contact.rememberNote ?? '');
  const [photoOpen, setPhotoOpen] = useState(false);
  const hasPhoto = usePhotos().has(contact.id);
  const [logKind, setLogKind] = useState<LogKind>('note');
  const [logText, setLogText] = useState('');
  const [now] = useState(() => new Date());

  const hasPhone = Boolean(contact.phone);
  const hasEmail = Boolean(contact.email);
  const tags = [
    hasPhone ? `${contact.dial ?? ''} ${contact.phone}`.trim() : null,
    contact.phone2 ? `${contact.dial2 ?? contact.dial ?? ''} ${contact.phone2}`.trim() : null,
    contact.email || null,
    contact.email2 || null,
  ].filter(
    (tag): tag is string => Boolean(tag)
  );

  // Open tasks with this person, soonest first.
  const comingUp = useMemo(
    () =>
      tasks
        .filter((task) => (task.status === 'open' || task.status === 'snoozed') && contactForTask(task, contacts)?.id === contact.id)
        .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')),
    [tasks, contacts, contact.id]
  );

  const { groups, count } = useMemo(
    () => buildTimeline({ contact, history, followUps, now, lang, words: { today: pfx.today, yest: pfx.yest } }),
    [contact, history, followUps, now, lang, pfx.today, pfx.yest]
  );

  const saveNote = (text: string) => {
    setNote(text);
    updateContact(contact.id, { rememberNote: text });
  };

  const log = () => {
    const text = logText.trim();
    if (!text) return;
    addHistory({ contactId: contact.id, kind: logKind as HistoryKind, text, at: new Date().toISOString() });
    setLogText('');
  };

  const actions: { key: string; label: string; ok: boolean; onPress: () => void }[] = [
    { key: 'whatsapp', label: t.types.whatsapp, ok: hasPhone, onPress: () => start(contact, 'whatsapp') },
    { key: 'email', label: t.types.email, ok: hasEmail, onPress: () => start(contact, 'email') },
    { key: 'call', label: t.types.call, ok: hasPhone, onPress: () => start(contact, 'call') },
    // Pre-fills the attendee on the meeting form.
    { key: 'meeting', label: pfx.l.meet, ok: true, onPress: () => router.push(`/new?type=meeting&contact=${contact.id}`) },
  ];

  const back = () => (router.canGoBack() ? router.back() : router.replace('/people'));
  const lastKey = groups.at(-1)?.items.at(-1)?.key;

  return (
    <>
      <Screen scroll background="grouped" paddingTop={4} paddingBottom={120} style={{ gap: 20 }}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            testID="contact-back"
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={a11y.back}
            hitSlop={10}
            // 34 tall: unlike Settings' this button is `display: flex` in the
            // prototype, so the icon is not set in a line box.
            style={{ paddingVertical: 6 }}
          >
            <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
              <Icon name="back" size={22} strokeWidth={1.7} />
            </View>
          </Pressable>
          <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
            <Pressable
              testID="contact-favorite"
              onPress={() => void toggleFavorite(contact.id)}
              accessibilityRole="button"
              accessibilityLabel={added(lang).filters.favorite}
              accessibilityState={{ selected: favorite }}
              hitSlop={6}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: surface.white, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="star" size={18} color={favorite ? typeColour.visit.fg : ink.s4} filled={favorite} strokeWidth={1.8} />
            </Pressable>
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
        </View>

        <View style={{ alignItems: 'center', gap: 10 }}>
          <Pressable
            testID="contact-photo"
            onPress={() => setPhotoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={added(lang).photo.hint}
          >
            <Avatar name={contact.name} contactId={contact.id} size={84} />
            <View
              style={{
                position: 'absolute',
                bottom: -2,
                ...(dir.isRTL ? { left: -2 } : { right: -2 }),
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: surface.fill2,
                backgroundColor: ink.solid,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="camera" size={14} color={surface.white} strokeWidth={2} />
            </View>
          </Pressable>
          <View style={{ gap: 4, alignItems: 'center' }}>
            <Text token="h3" align="center" testID="contact-name">
              {contact.name}
            </Text>
            <Text token="bodyS" color={ink.s4} align="center">
              {contact.role ?? ''}
            </Text>
          </View>
          {contact.labels && contact.labels.length > 0 ? (
            <View testID="contact-labels" style={{ flexDirection: dir.row, flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
              {contact.labels.map((label) => (
                <View key={label} style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: ink.solid }}>
                  <Text token="micro" weight="600" color={surface.white}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {tags.length ? (
            <View style={{ flexDirection: dir.row, flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
              {tags.map((tag) => (
                <View key={tag} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: surface.white }}>
                  <LTRText token="micro" color={ink.s2}>
                    {tag}
                  </LTRText>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {contact.address ? (
          <Pressable
            testID="contact-address"
            onPress={() => void Linking.openURL(mapsUrl(contact.address ?? ''))}
            accessibilityRole="link"
            accessibilityLabel={`${added(lang).contact.openMap}: ${contact.address}`}
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
                {added(lang).contact.openMap}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: dir.row, gap: 8 }}>
          {actions.map((a) => {
            const colour = typeColour[a.key as TaskType];
            return (
              <Pressable
                key={a.key}
                testID={`contact-action-${a.key}`}
                // Missing a number or address: dimmed and inert, as drawn.
                onPress={a.ok ? a.onPress : undefined}
                disabled={!a.ok}
                accessibilityRole="button"
                accessibilityState={{ disabled: !a.ok }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  borderRadius: 16,
                  backgroundColor: surface.white,
                  opacity: a.ok ? 1 : 0.4,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    backgroundColor: colour.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={TYPE_ICON[a.key as TaskType]} size={18} color={colour.fg} strokeWidth={2} />
                </View>
                <Text token="micro" weight="500" align="center" numberOfLines={1}>
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
              // Two rows of 15 pt at 1.5, no padding — a bare textarea.
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
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: on ? ink.solid : surface.fill,
                  }}
                >
                  <Text token="bodyS" weight="600" color={on ? surface.white : ink.s2}>
                    {rhythmCopy.options[i]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {comingUp.length ? (
          <View style={{ gap: 8 }}>
            <Text token="micro" color={ink.s4} style={{ paddingHorizontal: 4 }}>
              {pfx.l.next}
            </Text>
            <View style={{ backgroundColor: surface.white, borderRadius: 16, overflow: 'hidden' }}>
              {comingUp.map((task) => {
                const colour = typeColour[task.type];
                return (
                  // Not tappable in the prototype, so not here either.
                  <View
                    key={task.id}
                    testID={`contact-next-${task.id}`}
                    style={{
                      flexDirection: dir.row,
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: surface.avatar,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: colour.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={TYPE_ICON[task.type]} size={15} color={colour.fg} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                      <Text token="bodyS" weight="500">
                        {task.title}
                      </Text>
                      <Text token="micro" color={ink.s4}>
                        {t.types[task.type]}
                      </Text>
                    </View>
                    <LTRText token="caption" weight="600" tabular>
                      {whenLabel(task, t, inline, now) || clockOf(task.dueAt)}
                    </LTRText>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: dir.row, alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <Text token="micro" color={ink.s4}>
              {pfx.l.history}
            </Text>
            <Text token="micro" color={ink.s5} testID="contact-history-count">
              {pfx.n.replace('{n}', String(count))}
            </Text>
          </View>

          <View style={{ backgroundColor: surface.white, borderRadius: 16, padding: 10, gap: 10 }}>
            <View style={{ flexDirection: dir.row, gap: 6 }}>
              {pfx.kinds.map(([key, label]) => {
                const k = key as LogKind;
                const on = k === logKind;
                return (
                  <Pressable
                    key={k}
                    testID={`contact-log-kind-${k}`}
                    onPress={() => setLogKind(k)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{
                      flex: 1,
                      height: 34,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: on ? ink.solid : surface.cardLine,
                      backgroundColor: on ? surface.fill : surface.white,
                      flexDirection: dir.row,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <Icon name={kindIcon(k)} size={13} color={kindColour(k).fg} strokeWidth={2.2} />
                    <Text token="micro" numberOfLines={1}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: dir.row, gap: 8 }}>
              <TextInput
                testID="contact-log-text"
                value={logText}
                onChangeText={setLogText}
                onSubmitEditing={log}
                returnKeyType="done"
                placeholder={pfx.l.logPh}
                placeholderTextColor={ink.s5}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: surface.fill,
                  paddingHorizontal: 14,
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
                style={{
                  height: 44,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: logText.trim() ? ink.solid : ink.disabledBtn,
                  justifyContent: 'center',
                }}
              >
                <Text token="bodyS" weight="500" color={surface.white}>
                  {pfx.l.add}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 16, paddingTop: 6, paddingHorizontal: 4 }}>
            {groups.map((group) => (
              <View key={group.label}>
                <Text token="caption" weight="600" style={{ paddingBottom: 8 }}>
                  {group.label}
                </Text>
                {group.items.map((item) => (
                  <Moment key={item.key} item={item} connector={item.key !== lastKey} />
                ))}
              </View>
            ))}
          </View>
        </View>
      </Screen>
      <PhotoSheet open={photoOpen} contactId={contact.id} hasPhoto={hasPhoto} onClose={() => setPhotoOpen(false)} />
      <Toast />
    </>
  );
}

/** One moment: a 32 pt circle in the kind's colour, a connector down, the text and its meta. */
function Moment({ item, connector }: { item: TimelineItem; connector: boolean }) {
  const { t, pfx } = useLanguage();
  const dir = useDirection();
  const colour = kindColour(item.kind);
  const typeName = item.kind in t.types ? t.types[item.kind as TaskType] : pfx.kinds[0]?.[1];
  const meta = [typeName, item.time].filter(Boolean).join(' · ');

  return (
    <View testID={`moment-${item.key}`} style={{ flexDirection: dir.row, gap: 12 }}>
      <View style={{ width: 32, alignItems: 'center' }}>
        <View
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colour.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={kindIcon(item.kind)} size={15} color={colour.fg} strokeWidth={2} />
        </View>
        {/* The last moment on the page draws no line below it. */}
        <View style={{ flex: 1, width: 1.5, minHeight: 12, backgroundColor: connector ? surface.line : 'transparent' }} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2, paddingTop: 5, paddingBottom: 14 }}>
        <Text token="bodyS" weight="500" lh={19.6}>
          {item.text}
        </Text>
        <Text token="micro" color={ink.s5}>
          {meta}
        </Text>
      </View>
    </View>
  );
}

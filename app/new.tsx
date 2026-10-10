/**
 * 09 · Event form — Visit / Meeting / Webinar / Course. SCREENS.md § 09.
 *
 * One screen with four shapes. Which fields appear is a table in the spec and
 * a table in `src/features/event/model.ts`; everything here just renders it.
 *
 * An event saves as a task of that type, so it lands in the same list as
 * everything else — that is the whole point of the screen.
 */
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  ChipRow,
  Labelled,
  PersonChips,
  ProgressStepper,
  StudyDays,
  TimeRow,
} from '@/features/event/fields';
import {
  emptyDraft,
  EVENT_REMINDERS,
  EVENT_TIMES,
  isEventType,
  isMultiPerson,
  visibleFields,
  type EventDraft,
} from '@/features/event/model';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, radius, space, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { dateKey } from '@/lib/model-types';
import { usePeople } from '@/lib/people';
import { useTasks } from '@/lib/tasks';

/** The person chips show the first eight contacts, as the prototype does. */
const PEOPLE_SHOWN = 8;

export default function EventForm() {
  const { t, evx } = useLanguage();
  const dir = useDirection();
  const { contacts } = usePeople();
  const { addTask } = useTasks();
  const toast = useToast();

  const params = useLocalSearchParams<{ type?: string; contact?: string }>();
  const type = isEventType(params.type) ? params.type : 'meeting';

  const [draft, setDraft] = useState<EventDraft>(() => {
    const base = emptyDraft(type);
    // A meeting started from a contact profile arrives with that person in it.
    const index = contacts.findIndex((contact) => contact.id === params.contact);
    return index >= 0 ? { ...base, who: [index] } : base;
  });

  const set = useCallback((patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch })), []);

  const show = visibleFields(draft);
  const colour = typeColour[type];
  const platforms = type === 'course' ? evx.cplats : evx.plats;
  const people = useMemo(() => contacts.slice(0, PEOPLE_SHOWN), [contacts]);
  const valid = draft.title.trim().length > 0;

  const toggle = (list: readonly number[], index: number) =>
    list.includes(index) ? list.filter((i) => i !== index) : [...list, index];

  /** The line under the title on the task, which differs by type. */
  const subtitle = useCallback(() => {
    const names = draft.who.map((i) => people[i]?.name).filter(Boolean).join(', ');
    if (type === 'visit') return draft.location || names;
    if (type === 'meeting') return [platforms[draft.platform], names].filter(Boolean).join(' · ');
    if (type === 'webinar') return draft.host || evx.head[type];
    return [platforms[draft.platform], draft.lesson].filter(Boolean).join(' · ');
  }, [draft, people, platforms, type, evx.head]);

  const save = useCallback(() => {
    if (!valid) return;

    // Day is an index: today, tomorrow, or "this week", which the prototype
    // reads as the day after tomorrow.
    const at = new Date();
    const offset = show.day ? draft.day : 0;
    at.setDate(at.getDate() + (offset === 0 ? 0 : offset === 1 ? 1 : 2));
    const [hour = '10', minute = '00'] = draft.time.split(':');
    at.setHours(Number(hour), Number(minute), 0, 0);

    const remind = EVENT_REMINDERS[draft.remind] ?? null;
    const task = {
      type,
      title: draft.title.trim(),
      who: subtitle(),
      contactIds: draft.who.map((i) => people[i]?.id).filter((id): id is string => Boolean(id)),
      dueAt: at.toISOString(),
      remind,
      notes: draft.notes.trim() || undefined,
      link: draft.link.trim() || undefined,
      location: draft.location.trim() || undefined,
      platform: show.platform ? platforms[draft.platform] : undefined,
      durationMin: show.duration ? [15, 30, 45, 60][draft.duration] : undefined,
      host: draft.host.trim() || undefined,
      lesson: draft.lesson.trim() || undefined,
      studyDays: show.studyDays ? draft.studyDays : undefined,
      progress: show.progress ? draft.progress : undefined,
      createdVia: 'event_form' as const,
    };
    // The store works out the reminder's instant from the task's own time.
    addTask(task);

    const label = evx.rems[draft.remind] ?? '';
    toast.show(
      remind === null
        ? evx.toastNoR.replace('{x}', evx.head[type].split(' ').pop() ?? '')
        : evx.toast.replace('{x}', t.types[type]).replace('{r}', label.toLowerCase()),
      { undo: false }
    );
    router.back();
  }, [valid, draft, show, type, subtitle, people, addTask, toast, evx, t.types]);

  return (
    <>
      <View
        style={{
          flex: 1,
          backgroundColor: surface.white,
          direction: dir.isRTL ? 'rtl' : 'ltr',
        }}
      >
        <View style={{ height: space.statusBar }} />
        <View
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 4,
            paddingHorizontal: space.screenX,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: surface.lineSoft,
          }}
        >
          <Pressable testID="event-cancel" onPress={() => router.back()} accessibilityRole="button" style={{ paddingVertical: 8 }}>
            <Text token="body" color={ink.s4}>
              {evx.l.cancel}
            </Text>
          </Pressable>

          <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                backgroundColor: colour.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={TYPE_ICON[type]} size={16} color={colour.fg} strokeWidth={2} />
            </View>
            <Text token="bodyL" weight="600" testID="event-head">
              {evx.head[type]}
            </Text>
          </View>

          <Pressable testID="event-save-header" onPress={save} accessibilityRole="button" disabled={!valid} style={{ paddingVertical: 8 }}>
            <Text token="body" weight="600" color={valid ? ink.base : ink.disabledBtn}>
              {evx.l.save}
            </Text>
          </Pressable>
        </View>

        {/* Not <Screen>: the header above already sits under the status-bar
            spacer, and Screen would add a second one. */}
        <ScrollView
          contentContainerStyle={{
            paddingTop: 20,
            paddingHorizontal: space.screenX,
            paddingBottom: 44,
            gap: 20,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Labelled label={evx.titleL[type]}>
            <Field
              testID="event-title"
              size="hero"
              value={draft.title}
              onChangeText={(title) => set({ title })}
              placeholder={evx.titlePh[type]}
            />
          </Labelled>

          {show.platform ? (
            <Labelled label={evx.l.plat}>
              <ChipRow options={platforms} selected={draft.platform} onSelect={(platform) => set({ platform })} testID="event-platform" />
            </Labelled>
          ) : null}

          {show.link ? (
            <Labelled label={evx.l.link}>
              <Field
                testID="event-link"
                value={draft.link}
                onChangeText={(link) => set({ link })}
                placeholder={evx.linkPh[type as keyof typeof evx.linkPh] ?? ''}
                keyboardType="url"
                forceLTR
              />
            </Labelled>
          ) : null}

          {show.host ? (
            <Labelled label={evx.l.host}>
              <Field testID="event-host" value={draft.host} onChangeText={(host) => set({ host })} placeholder={evx.l.hostPh} />
            </Labelled>
          ) : null}

          {show.location ? (
            <Labelled label={evx.l.loc}>
              <View
                style={{
                  flexDirection: dir.row,
                  alignItems: 'center',
                  gap: 10,
                  height: 52,
                  borderWidth: 1.5,
                  borderColor: surface.line,
                  borderRadius: radius.input,
                  paddingStart: 14,
                  paddingEnd: 6,
                }}
              >
                <Icon name="pin" size={18} color={ink.s5} strokeWidth={1.9} />
                <Field
                  testID="event-location"
                  value={draft.location}
                  onChangeText={(location) => set({ location })}
                  placeholder={evx.l.locPh}
                  style={{ flex: 1, minWidth: 0, borderWidth: 0, height: '100%', paddingHorizontal: 0 }}
                />
                <Pressable
                  testID="event-maps"
                  onPress={() =>
                    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(draft.location)}`).catch(() => {})
                  }
                  accessibilityRole="button"
                  style={{
                    height: 38,
                    paddingHorizontal: 12,
                    borderRadius: radius.tile,
                    backgroundColor: surface.fill,
                    justifyContent: 'center',
                  }}
                >
                  <Text token="caption" weight="500">
                    {evx.l.maps}
                  </Text>
                </Pressable>
              </View>
            </Labelled>
          ) : null}

          {show.who ? (
            <Labelled
              label={evx.l.whoL}
              trailing={
                <Text token="micro" color={ink.s5}>
                  {evx.whoHint[type as keyof typeof evx.whoHint] ?? ''}
                </Text>
              }
            >
              <PersonChips
                contacts={people}
                selected={draft.who}
                onToggle={(index) =>
                  set({ who: isMultiPerson(type) ? toggle(draft.who, index) : draft.who.includes(index) ? [] : [index] })
                }
              />
            </Labelled>
          ) : null}

          {show.lesson ? (
            <Labelled label={evx.l.lesson}>
              <Field testID="event-lesson" value={draft.lesson} onChangeText={(lesson) => set({ lesson })} placeholder={evx.l.lessonPh} />
            </Labelled>
          ) : null}

          {show.studyDays ? (
            <Labelled label={evx.l.days}>
              <StudyDays labels={evx.wk} selected={draft.studyDays} onToggle={(i) => set({ studyDays: toggle(draft.studyDays, i) })} />
            </Labelled>
          ) : null}

          {show.day ? (
            <Labelled label={evx.l.date}>
              <ChipRow options={evx.dates} selected={draft.day} onSelect={(day) => set({ day })} testID="event-date" />
            </Labelled>
          ) : null}

          <Labelled label={evx.l.time}>
            <TimeRow times={EVENT_TIMES} selected={draft.time} onSelect={(time) => set({ time })} />
          </Labelled>

          {show.duration ? (
            <Labelled label={evx.l.dur}>
              <ChipRow options={evx.durs} selected={draft.duration} onSelect={(duration) => set({ duration })} testID="event-duration" />
            </Labelled>
          ) : null}

          {show.progress ? (
            <Labelled
              label={evx.l.prog}
              trailing={
                <Text token="bodyS" weight="600" tabular testID="event-progress-label">
                  {evx.prog.replace('{a}', String(draft.progress.done)).replace('{b}', String(draft.progress.total))}
                </Text>
              }
            >
              <ProgressStepper
                done={draft.progress.done}
                total={draft.progress.total}
                type={type}
                onChange={(done) => set({ progress: { ...draft.progress, done } })}
              />
            </Labelled>
          ) : null}

          <Labelled label={evx.l.remind}>
            <ChipRow options={evx.rems} selected={draft.remind} onSelect={(remind) => set({ remind })} testID="event-remind" />
          </Labelled>

          <Labelled label={evx.l.notes}>
            <Field
              testID="event-notes"
              value={draft.notes}
              onChangeText={(notes) => set({ notes })}
              placeholder={evx.notesPh[type]}
              multiline
              numberOfLines={3}
            />
          </Labelled>

          <Pressable
            testID="event-save"
            onPress={save}
            accessibilityRole="button"
            disabled={!valid}
            style={{
              height: 56,
              borderRadius: radius.button,
              backgroundColor: valid ? ink.base : ink.disabledBtn,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text token="title" weight="500" color={surface.white}>
              {evx.cta[type]}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
      <Toast />
    </>
  );
}

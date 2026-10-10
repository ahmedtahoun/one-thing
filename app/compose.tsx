/**
 * 13 · Compose & send. SCREENS.md § 13.
 *
 * Container is 4 / 20 / 44 with an 18 pt gap. The header names the type and
 * time; then the title and who, the recipient (a WhatsApp number or an email
 * To / Subject), the brief card with "Last time", the editable draft, and the
 * one primary action at the foot.
 *
 * Nothing is sent from here (README § Global behaviour). WhatsApp, Mail and
 * Phone are opened with the draft and the user sends it there. On return,
 * "Did you send it?" is the only thing that marks the task done, and the
 * answer decides whether a follow-up is set.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';

import { EmailFields, PhoneField } from '@/features/compose/fields';
import {
  emailState,
  emailValid,
  localDigits,
  mailtoUrl,
  phoneState,
  phoneValid,
  telUrl,
  whatsAppUrl,
} from '@/features/compose/recipient';
import { ForwardChevron } from '@/ui/ForwardChevron';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { DEFAULT_DIAL } from '@/content/countries';
import { TYPE_ICON, type IconName } from '@/design/icon-paths';
import { fontFamily, ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { displayName, timeLabel, type Channel, type Contact, type Task } from '@/lib/model-types';
import { contactForTask, usePeople } from '@/lib/people';
import { whenLabel } from '@/lib/task-labels';
import { useTasks } from '@/lib/tasks';


/** How long after handing off before "Did you send it?" appears, as in the prototype. */
const HANDOFF_DELAY = 700;
const CALL_DELAY = 900;

/** Tomorrow / In 2 days / Next week, in days; "No need" sets nothing. */
const FOLLOW_UP_DAYS = [1, 2, 7] as const;

/** 7 rows of 15 pt text at 1.55, plus 14 pt padding and a 1 pt border, each side. */
const DRAFT_HEIGHT = 7 * 15 * 1.55 + 28 + 2;

export default function Compose() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { tasks, ready } = useTasks();
  const people = usePeople();
  const task = tasks.find((candidate) => candidate.id === id);

  if (!ready || !people.ready) return null;
  if (!task) return <Redirect href="/today" />;
  return <ComposeTask key={task.id} task={task} />;
}

function ComposeTask({ task }: { task: Task }) {
  const { t, inline, a11y } = useLanguage();
  const dir = useDirection();
  const { tasks, updateTask, restore } = useTasks();
  const { contacts, history, saveContact, addFollowUp } = usePeople();
  const toast = useToast();

  // Prefilled from the contact, so a number given once is there next time —
  // "Add their number once — I'll remember it."
  const contact = useMemo(() => contactForTask(task, contacts), [task, contacts]);
  const [dial, setDial] = useState(contact?.dial ?? DEFAULT_DIAL);
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [subject, setSubject] = useState(task.draft?.subject ?? task.title);
  const [draft, setDraft] = useState(task.draft?.body ?? '');
  const [tried, setTried] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [afterSend, setAfterSend] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  const askAfter = (delay: number) => timers.current.push(setTimeout(() => setAfterSend(true), delay));

  const type = task.type;
  const colour = typeColour[type];
  const who = task.who ?? '';
  const name = displayName(who);
  const isWa = type === 'whatsapp';
  const isEmail = type === 'email';
  const hasDraft = isWa || isEmail;
  const phoneField = phoneState(phone, tried);
  const emailField = emailState(email, tried);
  const time = whenLabel(task, t, inline) || timeLabel(task.dueAt);

  // The latest dated moment with this person; failing that, their People line.
  const lastTime = useMemo(() => {
    if (!contact) return null;
    const latest = history.find((h) => h.contactId === contact.id);
    const text = latest?.text ?? contact.lastLabel;
    return text ? { text, contactId: contact.id } : null;
  }, [contact, history]);

  const phoneSuggestions = useMemo(() => {
    const digits = localDigits(phone);
    return contacts.filter((c) => c.phone && (!digits || c.phone.replace(/\D/g, '').includes(digits))).slice(0, 3);
  }, [contacts, phone]);
  const emailSuggestions = useMemo(() => {
    const q = email.toLowerCase();
    return contacts
      .filter((c) => c.email && (!q || c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)))
      .slice(0, 3);
  }, [contacts, email]);

  const editDraft = (body: string) => {
    setDraft(body);
    updateTask(task.id, { draft: { ...task.draft, body } });
  };
  const editSubject = (next: string) => {
    setSubject(next);
    updateTask(task.id, { draft: { body: draft, ...task.draft, subject: next } });
  };

  /** Keeps the number or address on the contact, adding one if needed. */
  const remember = useCallback(
    (patch: Partial<Contact>) => {
      const role = who.includes(' · ') ? who.split(' · ').slice(1).join(' · ') : undefined;
      const contactId = saveContact({ id: contact?.id, name: name || task.title, role, lastLabel: t.justNow }, patch);
      if (!task.contactIds.includes(contactId)) updateTask(task.id, { contactIds: [contactId, ...task.contactIds] });
    },
    [who, name, contact, saveContact, task, updateTask, t.justNow]
  );

  const sendWhatsApp = () => {
    if (!phoneValid(phone)) return setTried(true);
    remember({ dial, phone });
    Linking.openURL(whatsAppUrl(dial, phone, draft)).catch(() => {});
    toast.show(t.toastWa.replace('{to}', name), { undo: false });
    askAfter(HANDOFF_DELAY);
  };

  const openMailApp = async () => {
    if (!emailValid(email)) return setTried(true);
    remember({ email });
    // The toast says the draft was copied, so it is: a long body can be cut
    // short in a mailto link.
    await Clipboard.setStringAsync(draft).catch(() => {});
    Linking.openURL(mailtoUrl(email, subject, draft)).catch(() => {});
    toast.show(t.toastHand.replace('{app}', inline.mailAppName), { undo: false });
    askAfter(HANDOFF_DELAY);
  };

  /**
   * "Send email" opens the system's own mail sheet over the app, filled in;
   * the user still taps send there. Where there is none (no mail account, or
   * the web build), it falls back to the Mail app.
   */
  const sendEmail = async () => {
    if (!emailValid(email)) return setTried(true);
    const available = await MailComposer.isAvailableAsync().catch(() => false);
    if (!available) return openMailApp();
    remember({ email });
    const result = await MailComposer.composeAsync({ recipients: [email], subject, body: draft }).catch(() => null);
    if (!result || result.status === MailComposer.MailComposerStatus.CANCELLED) return;
    if (result.status === MailComposer.MailComposerStatus.SENT) {
      toast.show(t.toastSentTo.replace('{to}', email), { undo: false });
    }
    askAfter(HANDOFF_DELAY);
  };

  const callNow = () => {
    toast.show(inline.calling, { undo: false });
    if (contact?.phone && phoneValid(contact.phone)) {
      Linking.openURL(telUrl(contact.dial ?? DEFAULT_DIAL, contact.phone)).catch(() => {});
    }
    askAfter(CALL_DELAY);
  };

  const markReminderDone = () => {
    const before = tasks;
    updateTask(task.id, { status: 'done' });
    toast.show(t.toastDone, { undo: () => restore(before) });
  };

  /** "Did you send it?" — Tomorrow, In 2 days, Next week, or No need. */
  const answer = (index: number, label: string) => {
    const now = new Date();
    updateTask(task.id, { status: 'done', sentConfirmedAt: now.toISOString() });
    const days = FOLLOW_UP_DAYS[index];
    if (days !== undefined) {
      const nextAt = new Date(now);
      nextAt.setDate(nextAt.getDate() + days);
      const channel: Channel = type === 'email' || type === 'whatsapp' ? type : 'call';
      addFollowUp({
        id: `f_${Date.now()}`,
        contactId: contact?.id ?? task.contactIds[0] ?? null,
        taskId: task.id,
        channel,
        who: who || task.title,
        what: task.title,
        status: 'waiting',
        since: inline.sentFollowUp.replace('{w}', label.toLowerCase()),
        nextAt: nextAt.toISOString(),
        lastAction: null,
      });
      toast.show(t.toastFu.replace('{w}', label), { undo: false });
    } else {
      toast.show(t.toastDone, { undo: false });
    }
    router.dismissTo('/today');
  };

  const notSent = () => {
    setAfterSend(false);
    toast.show(inline.draftSavedToast, { undo: false });
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  return (
    <>
      <Screen scroll paddingTop={4} paddingBottom={44} style={{ gap: 18 }}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
          <Pressable
            testID="compose-back"
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={a11y.back}
            hitSlop={10}
            // 40 tall, as on Settings: the icon sits in a 28 pt line box.
            style={{ paddingTop: 6, paddingBottom: 12 }}
          >
            <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
              <Icon name="back" size={22} strokeWidth={1.7} />
            </View>
          </Pressable>
          <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 6 }}>
            <Text token="caption" weight="600" color={colour.fg}>
              {t.types[type]}
            </Text>
            <Text token="caption" color={ink.s4} tabular>
              · {time}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable
            testID="compose-reschedule"
            onPress={() => router.push(`/reschedule?id=${task.id}`)}
            accessibilityRole="button"
            style={{
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: surface.line,
              backgroundColor: surface.white,
            }}
          >
            <Icon name="clock" size={15} strokeWidth={1.7} />
            <Text token="caption">{t.resched}</Text>
          </Pressable>
        </View>

        <View style={{ gap: 6 }}>
          <Text token="h2" lh={31.2} testID="compose-title">
            {task.title}
          </Text>
          <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
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
              <Icon name={TYPE_ICON[type]} size={18} color={colour.fg} strokeWidth={1.9} />
            </View>
            <Text token="body" color={ink.s3} style={{ flexShrink: 1 }}>
              {who}
            </Text>
          </View>
        </View>

        {isWa ? (
          <PhoneField
            dial={dial}
            phone={phone}
            state={phoneField}
            pickerOpen={pickerOpen}
            suggestions={phoneSuggestions}
            onTogglePicker={() => setPickerOpen((open) => !open)}
            onPickCountry={(c) => {
              setDial(c.dial);
              setPickerOpen(false);
            }}
            onChangePhone={setPhone}
            onPickContact={(c) => {
              setDial(c.dial ?? DEFAULT_DIAL);
              setPhone(c.phone ?? '');
            }}
          />
        ) : null}

        {isEmail ? (
          <EmailFields
            email={email}
            subject={subject}
            state={emailField}
            suggestions={emailSuggestions}
            onChangeEmail={setEmail}
            onChangeSubject={editSubject}
            onPickContact={(c) => setEmail(c.email ?? '')}
          />
        ) : null}

        <View style={{ gap: 12, padding: 16, backgroundColor: surface.brief, borderRadius: 18 }}>
          <View style={{ gap: 4 }}>
            <Text token="micro" color={ink.s4}>
              {t.c_goal}
            </Text>
            <Text token="body" weight="500" lh={21.75}>
              {task.goal ?? ''}
            </Text>
          </View>
          {task.points.length ? (
            <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 6 }}>
              {task.points.map((point) => (
                <View
                  key={point}
                  style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: surface.white }}
                >
                  <Text token="caption" color={ink.s2}>
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {lastTime ? (
            <Pressable
              testID="compose-last-time"
              onPress={() => router.push(`/contact?id=${lastTime.contactId}`)}
              accessibilityRole="button"
              style={{
                flexDirection: dir.row,
                alignItems: 'center',
                gap: 8,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: surface.briefRule,
              }}
            >
              <Text token="micro" color={ink.s4}>
                {inline.lastTime}
              </Text>
              <Text token="caption" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
                {lastTime.text}
              </Text>
              <ForwardChevron />
            </Pressable>
          ) : null}
        </View>

        {hasDraft ? (
          <View style={{ gap: 8 }}>
            <Text token="micro" color={ink.s4}>
              {t.c_draft}
            </Text>
            <TextInput
              testID="compose-draft"
              value={draft}
              onChangeText={editDraft}
              multiline
              textAlignVertical="top"
              style={{
                height: DRAFT_HEIGHT,
                borderWidth: 1,
                borderColor: surface.line,
                borderRadius: 14,
                padding: 14,
                fontFamily: `${fontFamily}_400Regular`,
                fontSize: 15,
                lineHeight: 15 * 1.55,
                color: ink.base,
                writingDirection: dir.isRTL ? 'rtl' : 'ltr',
                textAlign: dir.textAlign,
              }}
            />
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        {afterSend ? (
          <View testID="compose-after" style={{ gap: 10, padding: 16, borderWidth: 1.5, borderColor: ink.base, borderRadius: 18 }}>
            <Text token="body" weight="600">
              {t.afterQ}
            </Text>
            <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8 }}>
              {t.fuOpts.map((label, i) => (
                <Pressable
                  key={label}
                  testID={`compose-after-${i}`}
                  onPress={() => answer(i, label)}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    paddingVertical: 9,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: ink.base,
                    backgroundColor: pressed ? ink.base : surface.white,
                  })}
                >
                  {({ pressed }) => (
                    <Text token="bodyS" color={pressed ? surface.white : ink.base}>
                      {label}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
            <Pressable
              testID="compose-not-sent"
              onPress={notSent}
              accessibilityRole="button"
              style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
            >
              <Text token="caption" color={ink.s4} style={{ textDecorationLine: 'underline' }}>
                {inline.notSentYet}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isWa ? (
          <PrimaryButton
            testID="compose-send-wa"
            icon="msg"
            label={t.sendWa}
            colour={phoneValid(phone) ? typeColour.whatsapp.fg : ink.s7}
            onPress={sendWhatsApp}
          />
        ) : null}
        {isEmail ? (
          <View style={{ gap: 8 }}>
            <PrimaryButton
              testID="compose-send-email"
              icon="send"
              label={t.sendEmail}
              colour={emailValid(email) ? typeColour.email.fg : ink.s7}
              onPress={sendEmail}
            />
            <Pressable
              testID="compose-open-mail"
              onPress={openMailApp}
              accessibilityRole="button"
              style={{
                height: 46,
                borderRadius: 23,
                borderWidth: 1,
                borderColor: surface.line,
                backgroundColor: surface.white,
                flexDirection: dir.row,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Icon name="mail" size={16} strokeWidth={1.7} />
              <Text token="bodyS">{t.openMailApp}</Text>
            </Pressable>
          </View>
        ) : null}
        {type === 'call' ? (
          <PrimaryButton testID="compose-call" icon="phone" label={t.callNow} colour={ink.base} onPress={callNow} />
        ) : null}
        {type === 'reminder' ? (
          <PrimaryButton testID="compose-done" label={t.nDone} colour={ink.base} onPress={markReminderDone} />
        ) : null}
      </Screen>
      <Toast />
    </>
  );
}

/**
 * The 56 pt action at the foot. The prototype's own renders squeeze it to 26
 * — its flex column overflows and nothing stops the button shrinking — so it
 * is drawn at the README's 56 (BUILD-REVIEW.md §2.21).
 */
function PrimaryButton({
  testID,
  icon,
  label,
  colour,
  onPress,
}: {
  testID: string;
  icon?: IconName;
  label: string;
  colour: string;
  onPress: () => void;
}) {
  const dir = useDirection();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 56,
        borderRadius: 28,
        backgroundColor: colour,
        flexDirection: dir.row,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {icon ? <Icon name={icon} size={18} color={surface.white} strokeWidth={1.7} /> : null}
      <Text token="bodyL" weight="500" color={surface.white}>
        {label}
      </Text>
    </Pressable>
  );
}

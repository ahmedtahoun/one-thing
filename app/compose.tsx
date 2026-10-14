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
import { clockOf } from '@/lib/clock-format';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';

import { track } from '@/lib/analytics/track';
import { EmailFields, LockedRecipient, PhoneField, SubjectField } from '@/features/compose/fields';
import { added } from '@/content/additions';
import { DRAFT_KINDS, writeDraft, type DraftKind } from '@/features/compose/drafts';
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
import { Avatar } from '@/ui/Avatar';
import { ForwardChevron } from '@/ui/ForwardChevron';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { DEFAULT_DIAL } from '@/content/countries';
import { type IconName } from '@/design/icon-paths';
import { fontFamily, ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { displayName, type Channel, type Contact, type Task } from '@/lib/model-types';
import { contactForTask, usePeople } from '@/lib/people';
import { pickFromPhone } from '@/lib/phone-contacts';
import { whenLabel } from '@/lib/task-labels';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';


/** How long after handing off before "Did you send it?" appears, as in the prototype. */
const HANDOFF_DELAY = 700;
const CALL_DELAY = 900;

/** Tomorrow / In 2 days / Next week, in days; "No need" sets nothing. */
const FOLLOW_UP_DAYS = [1, 2, 7] as const;
/** The follow-up the one-tap button sets: index into the options, "In 2 days". */
const DEFAULT_FOLLOW_UP = 1;

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
  const { t, inline, a11y, lang } = useLanguage();
  const lockCopy = added(lang).lock;
  const loopCopy = added(lang).loop;
  const draftCopy = added(lang).drafts;
  const dir = useDirection();
  const { tasks, updateTask, restore } = useTasks();
  const { contacts, history, saveContact, addFollowUp, addHistory } = usePeople();
  const { session } = useSession();
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
  // A number or address already on file is shown, not asked for again.
  const [changing, setChanging] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  const askAfter = (delay: number) => timers.current.push(setTimeout(() => setAfterSend(true), delay));

  const type = task.type;

  // The screen is keyed on the task, so a mount is an opening. The channel is
  // the task's type narrowed to the three DATA_MODEL names a message can go
  // out on; a reminder opened here counts as 'call', as it does below.
  useEffect(() => {
    track({ name: 'compose_opened', channel: type === 'email' || type === 'whatsapp' ? type : 'call' });
  }, [type]);
  const colour = typeColour[type];
  const who = task.who ?? '';
  const name = displayName(who);
  const isWa = type === 'whatsapp';
  const isEmail = type === 'email';
  const hasDraft = isWa || isEmail;
  const phoneField = phoneState(phone, tried);
  const emailField = emailState(email, tried);
  const time = whenLabel(task, t, inline) || clockOf(task.dueAt);
  const savedPhone = contact?.phone && phoneValid(contact.phone) ? `${contact.dial ?? DEFAULT_DIAL} ${contact.phone}`.trim() : '';
  const savedEmail = contact?.email && emailValid(contact.email) ? contact.email : '';
  // What the locked row shows: the way this task reaches them, if it is known.
  const lockedValue = isEmail ? savedEmail : savedPhone;
  const locked = Boolean(contact && lockedValue && !changing && (isWa || isEmail || type === 'call'));
  const showWho = !locked;
  const hasBrief = Boolean(task.goal) || task.points.length > 0;

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
  /** A ready-made draft (and, for an email, its subject); what was there comes back with Undo. */
  const startFrom = (kind: DraftKind) => {
    const before = { body: draft, subject };
    const next = writeDraft(isEmail ? 'email' : 'whatsapp', kind, {
      name: contact?.name ?? name,
      sender: session?.name,
      lang,
    });
    editDraft(next.body);
    if (isEmail && next.subject) editSubject(next.subject);
    if (before.body.trim() && before.body !== next.body) {
      toast.show(draftCopy.replaced, {
        undo: () => {
          editDraft(before.body);
          if (isEmail) editSubject(before.subject);
        },
      });
    }
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
    track({ name: 'send_confirmed' });
    const channel: Channel = type === 'email' || type === 'whatsapp' ? type : 'call';
    const reached = contact?.id ?? task.contactIds[0];
    // A dated moment with them, so People can show how you last got in touch.
    if (reached) addHistory({ contactId: reached, kind: channel, text: task.title, at: now.toISOString() });
    const days = FOLLOW_UP_DAYS[index];
    if (days !== undefined) {
      const nextAt = new Date(now);
      nextAt.setDate(nextAt.getDate() + days);
      addFollowUp({
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
          {showWho ? (
            <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
              <Avatar name={name || task.title} contactId={contact?.id} size={36} channel={type === 'reminder' ? null : (type as Channel)} />
              <Text token="body" color={ink.s3} style={{ flexShrink: 1 }}>
                {who}
              </Text>
            </View>
          ) : null}
        </View>

        {locked && contact ? (
          <LockedRecipient
            contact={contact}
            value={lockedValue}
            channel={isEmail ? 'email' : isWa ? 'whatsapp' : 'call'}
            changeLabel={lockCopy.change}
            onChange={isWa || isEmail ? () => setChanging(true) : undefined}
          />
        ) : null}

        {isEmail && locked ? <SubjectField subject={subject} onChange={editSubject} /> : null}

        {isWa && !locked ? (
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
            onPickFromPhone={() =>
              void pickFromPhone().then((draft) => {
                if (!draft?.phone) return;
                if (draft.dial) setDial(draft.dial);
                setPhone(draft.phone);
              })
            }
          />
        ) : null}

        {isEmail && !locked ? (
          <EmailFields
            email={email}
            subject={subject}
            state={emailField}
            suggestions={emailSuggestions}
            onChangeEmail={setEmail}
            onChangeSubject={editSubject}
            onPickContact={(c) => setEmail(c.email ?? '')}
            onPickFromPhone={() =>
              void pickFromPhone().then((draft) => {
                if (draft?.email) setEmail(draft.email);
              })
            }
          />
        ) : null}

        {hasBrief ? (
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
        ) : lastTime ? (
          <Pressable
            testID="compose-last-time"
            onPress={() => router.push(`/contact?id=${lastTime.contactId}`)}
            accessibilityRole="button"
            style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}
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

        {hasDraft ? (
          <View style={{ gap: 8 }}>
            <Text token="micro" color={ink.s4}>
              {t.c_draft}
            </Text>
            <View style={{ flexDirection: dir.row, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Text token="caption" color={ink.s5}>
                {draftCopy.label}
              </Text>
              {DRAFT_KINDS.map((kind) => (
                <Pressable
                  key={kind}
                  testID={`compose-draft-${kind}`}
                  onPress={() => startFrom(kind)}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: pressed ? surface.line : surface.fill,
                  })}
                >
                  <Text token="caption" weight="600" color={ink.s2}>
                    {draftCopy[kind]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="compose-draft"
              value={draft}
              onChangeText={editDraft}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: isEmail ? 250 : 110,
                maxHeight: isEmail ? DRAFT_HEIGHT * 2 : DRAFT_HEIGHT,
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
            {/* One tap does the usual thing: it was sent, and check on it in two days. */}
            <Pressable
              testID="compose-after-1"
              onPress={() => answer(DEFAULT_FOLLOW_UP, t.fuOpts[DEFAULT_FOLLOW_UP] ?? '')}
              accessibilityRole="button"
              style={({ pressed }) => ({
                height: 48,
                borderRadius: 24,
                backgroundColor: ink.solid,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text token="body" weight="600" color={surface.white}>
                {loopCopy.sentYes.replace('{w}', (t.fuOpts[DEFAULT_FOLLOW_UP] ?? '').toLowerCase())}
              </Text>
            </Pressable>
            <View style={{ flexDirection: dir.row, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Text token="caption" color={ink.s4}>
                {loopCopy.sentOther}
              </Text>
              {t.fuOpts.map((label, i) =>
                i === DEFAULT_FOLLOW_UP ? null : (
                  <Pressable
                    key={label}
                    testID={`compose-after-${i}`}
                    onPress={() => answer(i, label)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: surface.line,
                      backgroundColor: pressed ? surface.fill : surface.white,
                    })}
                  >
                    <Text token="bodyS" color={ink.base}>
                      {label}
                    </Text>
                  </Pressable>
                )
              )}
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

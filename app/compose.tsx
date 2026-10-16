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
import { AppState, Linking, Platform, Pressable, Share, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';

import { track } from '@/lib/analytics/track';
import { EmailFields, LockedRecipient, PhoneField, SubjectField } from '@/features/compose/fields';
import { added } from '@/content/additions';
import { DRAFT_KINDS, writeDraft, type DraftKind } from '@/features/compose/drafts';
import { AttachRow, type PickedFile } from '@/features/compose/AttachRow';
import { sharePlan, type SharePlatform } from '@/features/compose/share-plan';
import {
  emailState,
  emailValid,
  localDigits,
  mailHtml,
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
import { Sheet } from '@/ui/Sheet';
import { fillSaved, toSaved, type Saved } from '@/features/compose/saved';
import { addSaved, useSaved } from '@/lib/templates';
import { CHASE_CHOICES, chaseDays, inDays, useChase } from '@/lib/chase';
import { whenText } from '@/features/capture/labels';
import { DEFAULT_DIAL } from '@/content/countries';
import { type IconName } from '@/design/icon-paths';
import { fontFamily, ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { displayName, type Channel, type Contact, type FollowUp, type HistoryEntry, type Task } from '@/lib/model-types';
import { contactForTask, usePeople } from '@/lib/people';
import { pickFromPhone } from '@/lib/phone-contacts';
import { whenLabel } from '@/lib/task-labels';
import { useSession } from '@/lib/session';
import { canAutoChase } from '@/policy/entitlements';
import { useTasks } from '@/lib/tasks';


/** What a send did, kept so it can be changed or taken back. */
type Sent = { days: number; before: { tasks: Task[]; followUps: FollowUp[]; history: HistoryEntry[] } };

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
  const sentCopy = added(lang).sent;
  const mySaved = useSaved();
  const draftCopy = added(lang).drafts;
  const dir = useDirection();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { tasks, updateTask, restore } = useTasks();
  const { contacts, history, followUps, saveContact, addFollowUp, addHistory, updateFollowUp, restoreFollowUps, restoreHistory } = usePeople();
  const chase = useChase();
  const { session } = useSession();
  const plan = session?.plan ?? 'free';
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
  // After a message goes out, the page asks nothing: it marks it sent, sets the chase if there is one, and leaves.
  const [sent, setSent] = useState<Sent | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [pending, setPending] = useState(false);
  // A number or address already on file is shown, not asked for again.
  const [changing, setChanging] = useState(false);

  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (leaveTimer.current && clearTimeout(leaveTimer.current)), []);

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
  /** One of the person's own saved messages: their wording, with this person's name in it. */
  const startFromSaved = (item: Saved) => {
    const before = { body: draft, subject };
    const next = fillSaved(item, contact?.name ?? name, lang);
    editDraft(next.body);
    if (isEmail) editSubject(next.subject ?? item.title);
    if (before.body.trim() && before.body !== next.body) {
      toast.show(draftCopy.replaced, {
        undo: () => {
          editDraft(before.body);
          if (isEmail) editSubject(before.subject);
        },
      });
    }
  };
  const [savingOpen, setSavingOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const saveAsMessage = async () => {
    const title = saveTitle.trim();
    if (!title || !draft.trim()) return;
    await addSaved({
      title,
      body: toSaved(draft, contact?.name ?? name, lang),
      ...(isEmail ? { subject: toSaved(subject, contact?.name ?? name, lang) } : {}),
    });
    setSavingOpen(false);
    setSaveTitle('');
    toast.show(added(lang).saved.saved, { undo: false });
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
    armSent();
  };

  // Files to go with the email. The system composer takes them; a mail link cannot.
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [appsOpen, setAppsOpen] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  useEffect(() => {
    try {
      setClients(MailComposer.getClients().map((c) => c.label));
    } catch {
      setClients([]);
    }
  }, []);
  /** Gmail and Outlook have their own compose links; every other app is reached through the default mail link. */
  const openInApp = async (app: 'Gmail' | 'Outlook' | 'default') => {
    setAppsOpen(false);
    if (!emailValid(email)) return setTried(true);
    remember({ email });
    await Clipboard.setStringAsync(draft).catch(() => {});
    const q = `to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;
    if (app === 'Gmail') Linking.openURL(`googlegmail:///co?${q}`).catch(() => {});
    else if (app === 'Outlook') Linking.openURL(`ms-outlook://compose?${q}`).catch(() => {});
    else Linking.openURL(mailtoUrl(email, subject, draft)).catch(() => {});
    if (files.length > 0) toast.show(added(lang).attach.onlyComposer, { undo: false });
    else toast.show(t.toastHand.replace('{app}', app === 'default' ? inline.mailAppName : app), { undo: false });
    armSent();
  };

  /**
   * Zoho, Spark and others open a `mailto:` link empty when they start cold,
   * and no link carries files. Their share extensions do take text and a
   * file, so this hands the draft over through the share sheet, with the
   * subject as the share's subject. A share cannot name the recipient, so the
   * address is left on the clipboard to paste into "To".
   *
   * Only one file goes, and on Android none does: React Native's `url` is
   * iOS-only, so an Android share carries the text alone. Saying so is the
   * point — the row used to promise "the subject, the message and a file" on
   * both platforms, and an attachment that silently does not arrive is worse
   * than one the person was told to send another way.
   */
  const shareToApp = async () => {
    setAppsOpen(false);
    if (!emailValid(email)) return setTried(true);
    remember({ email });
    await Clipboard.setStringAsync(draft).catch(() => {});

    const plan = sharePlan(Platform.OS as SharePlatform, files.length, await Sharing.isAvailableAsync().catch(() => false));
    const copy = added(lang).attach;

    if (plan.kind === 'file') {
      // `shareAsync` carries the file and no text, so the draft stays on the
      // clipboard and the toast reads the address out instead.
      const file = files[0];
      if (!file) return;
      const shared = await Sharing.shareAsync(file.uri, { dialogTitle: subject })
        .then(() => true)
        .catch(() => false);
      if (!shared) return;
      const said = plan.left > 0 ? copy.sharedFileMore.replace('{n}', String(plan.left)) : copy.sharedFile;
      toast.show(said.replace('{to}', email), { undo: false });
      return armSent();
    }

    const result = await Share.share(
      { message: draft, title: subject, ...(plan.kind === 'textAndFile' && files[0] ? { url: files[0].uri } : {}) },
      { subject, dialogTitle: subject }
    ).catch(() => null);
    if (!result || result.action === Share.dismissedAction) return;
    await Clipboard.setStringAsync(email).catch(() => {});
    toast.show((plan.left > 0 ? copy.sharedNoFiles : copy.shared).replace('{to}', email), { undo: false });
    armSent();
  };

  const openMailApp = async () => {
    if (!emailValid(email)) return setTried(true);
    remember({ email });
    // The toast says the draft was copied, so it is: a long body can be cut
    // short in a mailto link.
    await Clipboard.setStringAsync(draft).catch(() => {});
    Linking.openURL(mailtoUrl(email, subject, draft)).catch(() => {});
    toast.show(t.toastHand.replace('{app}', inline.mailAppName), { undo: false });
    armSent();
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
    // A copy on the clipboard, in case a mail sheet ever opens without the body.
    await Clipboard.setStringAsync(draft).catch(() => {});
    const result = await MailComposer.composeAsync({
      recipients: [email],
      subject,
      body: mailHtml(draft),
      isHtml: true,
      ...(files.length > 0 ? { attachments: files.map((f) => f.uri) } : {}),
    }).catch(() => null);
    if (!result || result.status === MailComposer.MailComposerStatus.CANCELLED) return;
    if (result.status === MailComposer.MailComposerStatus.SENT) {
      toast.show(t.toastSentTo.replace('{to}', email), { undo: false });
      return confirmSent();
    }
    // The mail sheet cannot always say; a saved draft is not a send.
    if (result.status !== MailComposer.MailComposerStatus.SAVED) armSent();
  };

  /**
   * "Send later". WhatsApp has no way to schedule, and the mail sheet's own is
   * out of this app's hands, so the app does the part it can: it keeps the
   * draft, reminds at the chosen time, and the reminder opens this screen, one
   * tap from send. Nothing is ever sent for the person.
   */
  const [laterOpen, setLaterOpen] = useState(false);
  const sendLater = (at: Date) => {
    const iso = at.toISOString();
    updateTask(task.id, {
      dueAt: iso,
      remind: 'at',
      remindAt: iso,
      status: 'open',
      snoozedUntil: null,
      draft: { subject: isEmail ? subject : task.draft?.subject, body: draft },
    });
    setLaterOpen(false);
    toast.show(added(lang).later.toast.replace('{w}', whenText(iso, t)), { undo: false });
    const reached = contact?.id ?? task.contactIds[0];
    setTimeout(() => router.dismissTo(from === 'contact' && reached ? `/contact?id=${reached}` : '/today'), 700);
  };
  const laterOptions = (() => {
    const now = new Date();
    const hour = new Date(now.getTime() + 3600000);
    const evening = new Date(now);
    evening.setHours(18, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const copy = added(lang).later;
    return [
      { key: 'hour', label: copy.hour, at: hour },
      ...(evening.getTime() - now.getTime() > 2 * 3600000 ? [{ key: 'evening', label: copy.evening, at: evening }] : []),
      { key: 'tomorrow', label: copy.tomorrow, at: tomorrow },
    ];
  })();

  const callNow = () => {
    toast.show(inline.calling, { undo: false });
    if (contact?.phone && phoneValid(contact.phone)) {
      Linking.openURL(telUrl(contact.dial ?? DEFAULT_DIAL, contact.phone)).catch(() => {});
    }
    armSent();
  };

  const markReminderDone = () => {
    const before = tasks;
    updateTask(task.id, { status: 'done' });
    toast.show(t.toastDone, { undo: () => restore(before) });
  };

  const channelOfTask: Channel = type === 'email' || type === 'whatsapp' ? type : 'call';
  const reachedId = contact?.id ?? task.contactIds[0];
  const leave = () => router.dismissTo(from === 'contact' && reachedId ? `/contact?id=${reachedId}` : '/today');
  const leaveSoon = (ms: number) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(leave, ms);
  };
  const stopLeaving = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  };

  /** A waiting item that comes back on its date: "if there is no reply, remind me". */
  const startChase = (days: number, from: Date): void => {
    const nextAt = new Date(from);
    nextAt.setDate(nextAt.getDate() + days);
    addFollowUp({
      contactId: reachedId ?? null,
      taskId: task.id,
      channel: channelOfTask,
      who: who || task.title,
      what: task.title,
      status: 'waiting',
      since: inline.sentFollowUp.replace('{w}', inDays(days, lang)),
      nextAt: nextAt.toISOString(),
      lastAction: null,
    });
  };

  // The newest of these, for the places that run later than the render that made them (the app coming back to the front).
  const latest = useRef({ tasks, followUps, history });
  latest.current = { tasks, followUps, history };
  const sentOnce = useRef(false);

  /** It went. Mark it, log it, set the chase the person's setting asks for, and leave in a moment. */
  const confirmSent = () => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    setPending(false);
    const now = new Date();
    const before = { tasks: latest.current.tasks, followUps: latest.current.followUps, history: latest.current.history };
    updateTask(task.id, { status: 'done', sentConfirmedAt: now.toISOString() });
    track({ name: 'send_confirmed' });
    // What the moment says: the email's subject, the first line of the WhatsApp message, else the task's own title.
    const gist =
      channelOfTask === 'email' ? subject.trim() : channelOfTask === 'whatsapp' ? draft.trim().replace(/\s+/g, ' ').slice(0, 90) : '';
    if (reachedId) addHistory({ contactId: reachedId, kind: channelOfTask, text: gist || task.title, at: now.toISOString() });
    // "Auto follow-ups" is what the card sells, and the word doing the work
    // is Auto: a Free account can still chase anyone, through Change below,
    // but it has to ask. Pro is the chase starting on its own.
    const days = canAutoChase(plan) ? chaseDays(chase, channelOfTask) : 0;
    if (days > 0) startChase(days, now);
    setSent({ days, before });
    leaveSoon(5500);
  };
  const confirmRef = useRef(confirmSent);
  confirmRef.current = confirmSent;

  /** A WhatsApp chat, the Mail app or the dialler took over: when the person is back, it was sent. */
  const armSent = () => setPending(true);
  const pendingRef = useRef(false);
  pendingRef.current = pending;
  useEffect(() => {
    let left = false;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') left = true;
      if (state === 'active' && left && pendingRef.current) {
        left = false;
        confirmRef.current();
      }
    });
    return () => subscription.remove();
  }, []);

  /** Another time for the chase, or none. The follow-up is rewritten, not stacked. */
  const changeChase = (days: number) => {
    if (!sent) return;
    restoreFollowUps(sent.before.followUps);
    if (days > 0) startChase(days, new Date());
    setSent({ ...sent, days });
    setChangeOpen(false);
    leaveSoon(2200);
  };

  /** Not sent after all: everything the send did is put back, and the draft is still here. */
  const undoSent = () => {
    if (!sent) return;
    stopLeaving();
    restore(sent.before.tasks);
    restoreFollowUps(sent.before.followUps);
    restoreHistory(sent.before.history);
    sentOnce.current = false;
    setSent(null);
    setChangeOpen(false);
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
              {mySaved.map((item) => (
                <Pressable
                  key={item.id}
                  testID={`compose-saved-${item.id}`}
                  onPress={() => startFromSaved(item)}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: pressed ? surface.line : surface.fill,
                    borderWidth: 1,
                    borderColor: surface.line,
                  })}
                >
                  <Text token="caption" weight="600" color={ink.s2}>
                    {item.title}
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
            {isEmail ? (
              <View style={{ gap: 8 }}>
                <AttachRow files={files} onChange={setFiles} testID="compose" />
              </View>
            ) : null}
            {draft.trim().length > 8 ? (
              <Pressable testID="compose-save-template" onPress={() => setSavingOpen(true)} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                <Text token="caption" weight="600" color={ink.s3}>
                  + {added(lang).saved.saveAs}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        {pending && !sent ? (
          <View testID="compose-pending" style={{ flexDirection: dir.row, alignItems: 'center', gap: 10 }}>
            <Text token="caption" color={ink.s4} style={{ flex: 1 }}>
              {sentCopy.pending}
            </Text>
            <Pressable testID="compose-i-sent" onPress={confirmSent} accessibilityRole="button" hitSlop={8}>
              <Text token="caption" weight="600" color={ink.solid}>
                {sentCopy.iSent}
              </Text>
            </Pressable>
            <Pressable testID="compose-not-sent" onPress={() => setPending(false)} accessibilityRole="button" hitSlop={8}>
              <Text token="caption" color={ink.s4}>
                {sentCopy.cancel}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {sent ? (
          <View testID="compose-sent" style={{ gap: 10, padding: 14, borderRadius: 16, backgroundColor: surface.fill }}>
            <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 10 }}>
              <Icon name="check" size={18} color={typeColour.whatsapp.fg} strokeWidth={2.4} />
              <Text token="bodyS" weight="500" style={{ flex: 1 }}>
                {sent.days > 0
                  ? sentCopy.withChase.replace('{w}', inDays(sent.days, lang))
                  : canAutoChase(plan)
                    ? sentCopy.plain
                    : sentCopy.plainFree}
              </Text>
              <Pressable
                testID="compose-sent-change"
                onPress={() => {
                  stopLeaving();
                  setChangeOpen((v) => !v);
                }}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text token="bodyS" weight="600" color={ink.solid}>
                  {sentCopy.change}
                </Text>
              </Pressable>
              <Pressable testID="compose-sent-undo" onPress={undoSent} accessibilityRole="button" hitSlop={8}>
                <Text token="bodyS" color={ink.s3}>
                  {sentCopy.undo}
                </Text>
              </Pressable>
            </View>
            {changeOpen ? (
              <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8 }}>
                {CHASE_CHOICES.map((days) => (
                  <Pressable
                    key={days}
                    testID={`compose-sent-days-${days}`}
                    onPress={() => changeChase(days)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sent.days === days }}
                    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: sent.days === days ? ink.solid : surface.white }}
                  >
                    <Text token="bodyS" weight="600" color={sent.days === days ? surface.white : ink.s2}>
                      {days === 0 ? sentCopy.none : inDays(days, lang)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {isWa && !sent ? (
          <View style={{ gap: 8 }}>
            <PrimaryButton
              testID="compose-send-wa"
              icon="msg"
              label={t.sendWa}
              colour={phoneValid(phone) ? typeColour.whatsapp.fg : ink.s7}
              onPress={sendWhatsApp}
            />
            <SendLaterButton onPress={() => setLaterOpen(true)} />
          </View>
        ) : null}
        {isEmail && !sent ? (
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
              onPress={() => setAppsOpen(true)}
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
              <Text token="bodyS">{added(lang).attach.chooseApp}</Text>
            </Pressable>
            <SendLaterButton onPress={() => setLaterOpen(true)} />
          </View>
        ) : null}
        {type === 'call' && !sent ? (
          <PrimaryButton testID="compose-call" icon="phone" label={t.callNow} colour={ink.base} onPress={callNow} />
        ) : null}
        {type === 'reminder' ? (
          <PrimaryButton testID="compose-done" label={t.nDone} colour={ink.base} onPress={markReminderDone} />
        ) : null}
      </Screen>
      <Sheet open={savingOpen} onClose={() => setSavingOpen(false)} testID="save-template-sheet" padding={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 30 }} gap={12}>
        <Text token="title">{added(lang).saved.nameIt}</Text>
        <TextInput
          testID="save-template-title"
          value={saveTitle}
          onChangeText={setSaveTitle}
          onSubmitEditing={() => void saveAsMessage()}
          placeholder={added(lang).saved.titlePh}
          placeholderTextColor={ink.s5}
          autoFocus
          returnKeyType="done"
          style={{ height: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: surface.fill, fontFamily: `${fontFamily}_400Regular`, fontSize: 15, color: ink.base, textAlign: dir.textAlign, writingDirection: dir.isRTL ? 'rtl' : 'ltr' }}
        />
        <Pressable
          testID="save-template-save"
          onPress={() => void saveAsMessage()}
          accessibilityRole="button"
          style={{ height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: saveTitle.trim() ? ink.solid : ink.disabledBtn }}
        >
          <Text token="body" weight="600" color={surface.white}>
            {added(lang).saved.save}
          </Text>
        </Pressable>
      </Sheet>
      <Sheet open={appsOpen} onClose={() => setAppsOpen(false)} testID="mail-apps-sheet" padding={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 30 }} gap={10}>
        <Text token="title">{added(lang).attach.chooseApp}</Text>
        {(['Gmail', 'Outlook'] as const)
          .filter((app) => clients.includes(app))
          .map((app) => (
            <Pressable key={app} testID={`mail-app-${app}`} onPress={() => void openInApp(app)} accessibilityRole="button" style={({ pressed }) => ({ height: 52, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: pressed ? surface.line : surface.fill })}>
              <Text token="body" weight="500">
                {app}
              </Text>
            </Pressable>
          ))}
        <Pressable testID="mail-app-default" onPress={() => void openInApp('default')} accessibilityRole="button" style={({ pressed }) => ({ height: 52, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: pressed ? surface.line : surface.fill })}>
          <Text token="body" weight="500">
            {added(lang).attach.defaultApp}
          </Text>
        </Pressable>
        <Pressable testID="mail-app-share" onPress={() => void shareToApp()} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center', backgroundColor: pressed ? surface.line : surface.fill })}>
          <Text token="body" weight="500">
            {added(lang).attach.share}
          </Text>
          <Text token="micro" color={ink.s4}>
            {/* The row used to promise "the subject, the message and a file"
                everywhere, and on Android the file was quietly dropped. It
                now says what this platform will really do with what is
                attached right now. */}
            {Platform.OS === 'ios'
              ? added(lang).attach.shareSub
              : files.length > 0
                ? added(lang).attach.shareSubFile
                : added(lang).attach.shareSubNoFile}
          </Text>
        </Pressable>
        <Text token="caption" color={ink.s4}>
          {added(lang).attach.note}
        </Text>
      </Sheet>
      <Sheet open={laterOpen} onClose={() => setLaterOpen(false)} testID="later-sheet" padding={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 30 }} gap={10}>
        <Text token="title">{added(lang).later.title}</Text>
        {laterOptions.map((o) => (
          <Pressable
            key={o.key}
            testID={`later-${o.key}`}
            onPress={() => sendLater(o.at)}
            accessibilityRole="button"
            style={({ pressed }) => ({ height: 52, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: pressed ? surface.line : surface.fill })}
          >
            <Text token="body" weight="500">
              {o.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          testID="later-pick"
          onPress={() => {
            setLaterOpen(false);
            updateTask(task.id, { draft: { subject: isEmail ? subject : task.draft?.subject, body: draft } });
            router.push(`/reschedule?id=${task.id}`);
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({ height: 52, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: pressed ? surface.line : surface.fill })}
        >
          <Text token="body" weight="500">
            {added(lang).later.pick}
          </Text>
        </Pressable>
      </Sheet>
      <Toast />
    </>
  );
}

/** The quiet button under Send: keep the draft and be reminded at a time. */
function SendLaterButton({ onPress }: { onPress: () => void }) {
  const { lang } = useLanguage();
  const dir = useDirection();
  return (
    <Pressable
      testID="compose-send-later"
      onPress={onPress}
      accessibilityRole="button"
      style={{ height: 46, borderRadius: 23, borderWidth: 1, borderColor: surface.line, backgroundColor: surface.white, flexDirection: dir.row, alignItems: 'center', justifyContent: 'center', gap: 8 }}
    >
      <Icon name="clock" size={16} strokeWidth={1.8} />
      <Text token="bodyS">{added(lang).later.button}</Text>
    </Pressable>
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

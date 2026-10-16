/**
 * 19 · Assistant chat. SCREENS.md § 19.
 *
 * A header (back, the spark, "Assistant" over today's One Thing), the
 * conversation, the suggestion chips and the message bar. It greets by name
 * and does three things, as the prototype does: catch a task (shown as a card
 * that waits for "Looks right"), lay out the day, and say who is still owed a
 * reply. Its scope stops there — tasks, contacts, reminders and follow-ups —
 * because ParsedTask / AssistantIntent have no room for anything else
 * (src/lib/parse/types.ts).
 *
 * Each message sent spends one of the Free plan's 10 a day. The eleventh opens
 * the paywall instead of sending — BUILD-REVIEW.md §2.34.
 */
import { clockOf } from '@/lib/clock-format';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { added } from '@/content/additions';
import { ClipSheet } from '@/features/assistant/ClipSheet';
import { DataCard } from '@/features/assistant/DataCard';
import { answerLine, fileLine } from '@/features/assistant/answer-line';
import { AskChips } from '@/features/capture/AskChips';
import { PersonSearchSheet } from '@/features/capture/PersonSearchSheet';
import { ContactCard, type ContactEdit } from '@/features/capture/ContactCard';
import { emailInvalid, findDuplicate, nameValid, phoneInvalid } from '@/features/contact/form-rules';
import { optionsFor, questionFor, type AskAction, type AskOption } from '@/features/capture/ask';
import { NOBODY, whenText } from '@/features/capture/labels';
import { SendRow } from '@/features/capture/SendRow';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useAssistantMeter } from '@/lib/assistant-meter';
import { dateKey, followUpStatus, isOnDay, type Task } from '@/lib/model-types';
import { AssistLimitError, textParser, type AssistantIntent, type ParsedTask } from '@/lib/parse';
import {
  answerFromText,
  clarify,
  readWho,
  suggestWho,
  withWhen,
  withWho,
  type Gap,
  type QuickWhen,
  type Settled,
  type World,
} from '@/lib/parse/clarify';
import {
  answerKind,
  applyEdit,
  dialFor,
  hasFields,
  isContactCommand,
  looksLikeTask,
  mergeFields,
  missingOf,
  readContact,
  type ContactFields,
} from '@/lib/parse/contact';
import { parseCard } from '@/features/card/parse';
import { defaultSelection, type Candidate } from '@/features/people-import/columns';
import { readDraft } from '@/features/people-import/read-draft';
import { candidatesFromFile } from '@/features/people-import/read-file';
import { canReadCards, readCard } from '@/lib/card-reader';
import { askData, type DataAnswer, type DataWorld } from '@/lib/parse/ask-data';
import { attachCommand, type Attach } from '@/lib/parse/attach';
import { smallTalk } from '@/lib/parse/small';
import { followUpFromParsed, taskFromParsed } from '@/lib/parse/to-task';
import { LoopTag } from '@/features/capture/LoopTag';
import { promiseDraft } from '@/features/compose/drafts';
import { telUrl, whatsAppUrl } from '@/features/compose/recipient';
import { useCadence } from '@/lib/cadence';
import { useFavorites } from '@/lib/favorites';
import { usePeople } from '@/lib/people';
import { useSession } from '@/lib/session';
import { deviceRegion, startListening } from '@/lib/speech';
import { useTasks } from '@/lib/tasks';

/** How long the prototype takes to answer. */
const REPLY_DELAY = 650;

/**
 * A question the Assistant is waiting on. `text` is what the person originally
 * wrote, so each answer can be checked against it again; `settled` is what
 * they have already waved away, so nothing is asked twice.
 */
type Ask = {
  id: string;
  from: 'bot';
  kind: 'ask';
  gap: Gap;
  draft: ParsedTask;
  text: string;
  settled: Settled;
  answered?: boolean;
};

/**
 * A person being saved: what has been heard so far. `open` is the card waiting
 * for the next thing they say; `replaced` is an earlier version of it.
 */
type ContactMsg = {
  id: string;
  from: 'bot';
  kind: 'contact';
  fields: ContactFields;
  status: 'open' | 'replaced' | 'saved' | 'dropped';
  /** An existing contact these details match, once Save found one. */
  duplicate?: { id: string; name: string };
  error?: string;
};

type Message =
  | { id: string; from: 'me'; text: string }
  | ContactMsg
  | { id: string; from: 'bot'; kind: 'greet' }
  | { id: string; from: 'bot'; kind: 'saved'; time: string }
  | { id: string; from: 'bot'; kind: 'note'; text: string }
  /** An answer read off the device: no request spent, nothing sent anywhere. */
  | { id: string; from: 'bot'; kind: 'data'; answer: DataAnswer }
  /** A file of people, read on the phone: the counts, then Add all or Review. */
  | { id: string; from: 'bot'; kind: 'file'; candidates: Candidate[]; skipped: number; added?: number }
  | Ask
  | { id: string; from: 'bot'; intent: AssistantIntent; confirmed?: boolean };

const newId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/** The One Thing goes first in the plan, at the prototype's 09:00 — "while your head is fresh". */
const ONE_THING_SLOT = '09:00';

export default function Assistant() {
  const { t, fux, a11y, lang, inline } = useLanguage();
  const dir = useDirection();
  const { session } = useSession();
  const { tasks, oneThing, addTask } = useTasks();
  const { contacts, followUps, history, addContact, addContacts, updateContact, addFollowUp, updateFollowUp } = usePeople();
  const favorites = useFavorites();
  const cadence = useCadence();
  const meter = useAssistantMeter();
  const toast = useToast();
  // Quick capture hands over a sentence that is really "save this person".
  const { say } = useLocalSearchParams<{ say?: string }>();

  const [messages, setMessages] = useState<Message[]>([{ id: 'greet', from: 'bot', kind: 'greet' }]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const handedOver = useRef(false);
  // A card is taller than a bubble and settles after the first size change: look again once it has.
  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 160);
    return () => clearTimeout(id);
  }, [messages.length]);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      stopListeningRef.current?.();
    };
  }, []);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const copy = added(lang);
  const quick = t.rQuick as unknown as readonly QuickWhen[];
  const world = (): World => ({ contacts, tasks, followUps, now: new Date() });
  /** Everything a question can be answered from, all of it already here. */
  const dataWorld = (): DataWorld => ({ contacts, tasks, followUps, history, favorites, cadence, now: new Date() });

  /** The last question still waiting for an answer, if the chat is mid-question. */
  const pending = [...messages].reverse().find((m): m is Ask => 'kind' in m && m.kind === 'ask' && !m.answered) ?? null;

  /** Asks the next question, or — when nothing is left to ask — shows the card. */
  const proceed = (draft: ParsedTask, text: string, settled: Settled) => {
    const gap = clarify(text, draft, world(), settled);
    setMessages((list) => [
      ...list,
      gap
        ? { id: newId(), from: 'bot', kind: 'ask', gap, draft, text, settled }
        : { id: newId(), from: 'bot', intent: { kind: 'task', task: draft } },
    ]);
  };

  /** Closes a question, shows the answer as the person's own bubble, then carries on. */
  const answer = (ask: Ask, label: string, draft: ParsedTask, settled: Settled, note?: string) => {
    setMessages((list) => [
      ...list.map((m) => (m.id === ask.id ? { ...m, answered: true } : m)),
      { id: newId(), from: 'me', text: label },
      ...(note ? [{ id: newId(), from: 'bot' as const, kind: 'note' as const, text: note }] : []),
    ]);
    timers.current.push(setTimeout(() => proceed(draft, ask.text, settled), 350));
  };

  /** Closes a question and asks a different one in its place, for the same sentence. */
  const reask = (ask: Ask, label: string, gap: Gap) => {
    setMessages((list) => [
      ...list.map((m) => (m.id === ask.id ? { ...m, answered: true } : m)),
      { id: newId(), from: 'me', text: label },
      { id: newId(), from: 'bot', kind: 'ask', gap, draft: ask.draft, text: ask.text, settled: ask.settled },
    ]);
  };

  const [clipOpen, setClipOpen] = useState(false);
  const [searchFor, setSearchFor] = useState<Ask | null>(null);
  const choose = (ask: Ask, option: AskOption) => {
    const action: AskAction = option.action;
    if (action.kind === 'who') {
      answer(ask, option.label, withWho(ask.draft, action.contact), { ...ask.settled, who: true });
    } else if (action.kind === 'add') {
      // A name and nothing else: Compose asks for the number when they are first messaged.
      const person = addContact({ name: action.name });
      answer(ask, option.label, withWho(ask.draft, person), { ...ask.settled, who: true }, copy.ask.added.replace('{n}', action.name));
    } else if (action.kind === 'elsewhere') {
      reask(ask, option.label, { kind: 'who-missing', suggestions: suggestWho(ask.draft.type, world()) });
    } else if (action.kind === 'search') {
      setSearchFor(ask);
    } else {
      answer(ask, option.label, withWhen(ask.draft, action.iso), { ...ask.settled, when: true });
    }
  };

  /** A typed reply to the open question: no Assistant request is spent on it. */
  const reply = (ask: Ask, text: string) => {
    const found = answerFromText(ask.gap, text, world());
    if (found.kind === 'who') {
      answer(ask, text, withWho(ask.draft, found.contact), { ...ask.settled, who: true });
    } else if (found.kind === 'when') {
      answer(ask, text, withWhen(ask.draft, found.iso), { ...ask.settled, when: true });
    } else if (found.kind === 'who-several') {
      reask(ask, text, { kind: 'who-ambiguous', name: found.name, options: found.options });
    } else if (found.kind === 'who-new') {
      reask(ask, text, { kind: 'who-unknown', name: found.name });
    } else {
      setMessages((list) => [
        ...list,
        { id: newId(), from: 'me', text },
        { id: newId(), from: 'bot', kind: 'note', text: copy.ask.unreadable },
      ]);
    }
  };

  // --- saving a person ---------------------------------------------------

  const region = deviceRegion();
  const openContact = [...messages].reverse().find((m): m is ContactMsg => 'kind' in m && m.kind === 'contact' && m.status === 'open') ?? null;

  const patchContact = (id: string, patch: Partial<ContactMsg>) =>
    setMessages((list) => list.map((m) => (m.id === id && 'kind' in m && m.kind === 'contact' ? { ...m, ...patch } : m)));

  /** The next version of the card, after something was said: the old one stays as history. */
  const nextContact = (from: ContactMsg | null, fields: ContactFields, said: string) => {
    setMessages((list) => [
      ...list.map((m) => (from && m.id === from.id && 'kind' in m && m.kind === 'contact' ? { ...m, status: 'replaced' as const } : m)),
      { id: newId(), from: 'me', text: said },
      { id: newId(), from: 'bot', kind: 'contact', fields, status: 'open' },
    ]);
  };

  /** Writes the person, or — if People already has them — asks first. */
  const saveContact = (msg: ContactMsg, how: 'ask' | 'new' | 'update' = 'ask', nameOnly = false) => {
    const f: ContactFields = nameOnly ? { name: msg.fields.name, role: msg.fields.role } : msg.fields;
    if (!f.name || !nameValid(f.name)) return patchContact(msg.id, { error: copy.contact.needName });
    if (phoneInvalid(f.phone ?? '')) return patchContact(msg.id, { error: copy.contact.badPhone });
    if (emailInvalid(f.email ?? '')) return patchContact(msg.id, { error: copy.contact.badEmail });

    // The same person if the number or email matches — or if only a first name was said and one person has it.
    const firstName = f.name.trim().split(/\s+/);
    const byFirstName =
      firstName.length === 1 ? contacts.filter((c) => c.name.trim().split(/\s+/)[0]?.toLowerCase() === f.name?.trim().toLowerCase()) : [];
    const same =
      how === 'ask'
        ? findDuplicate({ name: f.name, phone: f.phone ?? '', email: f.email ?? '' }, contacts) ?? (byFirstName.length === 1 ? byFirstName[0] : undefined)
        : undefined;
    if (same) return patchContact(msg.id, { duplicate: { id: same.id, name: same.name }, error: undefined });

    let saved: string;
    if (how === 'update' && msg.duplicate) {
      const target = contacts.find((c) => c.id === msg.duplicate?.id);
      updateContact(msg.duplicate.id, {
        ...(f.phone ? { phone: f.phone, dial: dialFor(f, region) } : {}),
        ...(f.email ? { email: f.email } : {}),
        ...(f.role ? { role: f.role } : {}),
      });
      saved = copy.contact.updated.replace('{n}', target?.name ?? msg.duplicate.name);
    } else {
      const person = addContact({
        name: f.name.trim(),
        role: f.role,
        dial: dialFor(f, region),
        phone: f.phone,
        email: f.email,
        preferredChannel: f.phone || !f.email ? 'whatsapp' : 'email',
        lastLabel: inline.addedToday,
      });
      saved = copy.contact.saved.replace('{n}', person.name);
    }
    setMessages((list) => [
      ...list.map((m) => (m.id === msg.id && 'kind' in m && m.kind === 'contact' ? { ...m, status: 'saved' as const, error: undefined } : m)),
      { id: newId(), from: 'bot', kind: 'note', text: saved },
    ]);
  };

  const dropContact = (msg: ContactMsg) =>
    setMessages((list) => [
      ...list.map((m) => (m.id === msg.id && 'kind' in m && m.kind === 'contact' ? { ...m, status: 'dropped' as const } : m)),
      { id: newId(), from: 'bot', kind: 'note', text: copy.contact.dropped },
    ]);

  /** Typing into the card itself. */
  const editContact = (msg: ContactMsg, edit: ContactEdit) =>
    patchContact(msg.id, { fields: applyEdit(msg.fields, edit, region), duplicate: undefined, error: undefined });

  /**
   * The next message while a card is open: an answer, a correction, "yes" or
   * "cancel". False when it is some other errand, which then goes its own way.
   */
  const continueContact = (msg: ContactMsg, text: string): boolean => {
    const answer = answerKind(text);
    const missing = missingOf(msg.fields);
    if (answer === 'no') {
      setMessages((list) => [...list, { id: newId(), from: 'me', text }]);
      dropContact(msg);
      return true;
    }
    if (answer === 'yes') {
      setMessages((list) => [...list, { id: newId(), from: 'me', text }]);
      saveContact(msg, 'ask', missing === 'detail');
      return true;
    }
    if (missing === 'name' && looksLikeTask(text)) return false;
    const found = readContact(text, { expect: missing, region });
    if (!hasFields(found)) {
      if (missing === null && looksLikeTask(text)) return false;
      setMessages((list) => [...list, { id: newId(), from: 'me', text }, { id: newId(), from: 'bot', kind: 'note', text: copy.ask.unreadable }]);
      return true;
    }
    nextContact(msg, mergeFields(msg.fields, found), text);
    return true;
  };

  const startContact = (text: string) => {
    if (pending) setMessages((list) => list.map((m) => ('kind' in m && m.kind === 'ask' ? { ...m, answered: true } : m)));
    nextContact(null, readContact(text, { command: true, region }), text);
  };

  /** What the Assistant says over a card: the next thing it needs, or that it is ready. */
  const contactLine = (m: ContactMsg): string => {
    if (m.duplicate) return copy.contact.duplicate.replace('{n}', m.duplicate.name);
    const missing = missingOf(m.fields);
    if (missing === 'name') return copy.contact.askName;
    if (missing === 'detail') return copy.contact.askDetail.replace('{n}', m.fields.name?.split(' ')[0] ?? '');
    return copy.contact.ready;
  };

  /** Hellos, thanks, "what can you do?" and "what's Sara's number?": answered here, for free. */
  const answerSmall = (said: string, small: NonNullable<ReturnType<typeof smallTalk>>) => {
    const first = session?.firstName ? ` ${session.firstName}` : '';
    let reply: string;
    if (small.kind === 'hello') reply = copy.small.hello.replace('{n}', first);
    else if (small.kind === 'thanks') reply = copy.small.thanks;
    else if (small.kind === 'help') reply = copy.small.help;
    else {
      const found = readWho(said, contacts);
      const people = !found ? [] : found.kind === 'one' ? [found.contact] : found.options.slice(0, 5);
      reply =
        people.length === 0
          ? copy.small.notFound
          : people
              .map((c) => {
                const value = small.what === 'email' ? c.email : c.phone ? `${c.dial ?? ''} ${c.phone}`.trim() : '';
                return value ? `${c.name}: ${value}` : (small.what === 'email' ? copy.small.noEmail : copy.small.noPhone).replace('{n}', c.name);
              })
              .join('\n');
    }
    setMessages((list) => [...list, { id: newId(), from: 'me', text: said }, { id: newId(), from: 'bot', kind: 'note', text: reply }]);
  };

  /**
   * A question answered from People, the list, the follow-ups or the history.
   *
   * It never reaches `meter.spend()` or the `assist` function: the answer was
   * already on the phone, so it costs nothing, works offline, and the words
   * are not sent anywhere. A question the data cannot answer comes back as
   * `unknown`, and says so with examples instead of being saved as a task.
   */
  const showData = (said: string, answer: DataAnswer) => {
    setMessages((list) => [...list, { id: newId(), from: 'me', text: said }, { id: newId(), from: 'bot', kind: 'data', answer }]);
  };

  const open = (url: string) => void Linking.openURL(url).catch(() => toast.show(copy.qa.cantOpen, { undo: false }));

  const dataActions = {
    onContact: (contact: { id: string }) => router.push(`/contact?id=${contact.id}`),
    onCall: (contact: { dial?: string; phone?: string }) => open(telUrl(contact.dial ?? '', contact.phone ?? '')),
    onWhatsApp: (contact: { dial?: string; phone?: string }) => open(whatsAppUrl(contact.dial ?? '', contact.phone ?? '', '')),
    onEmail: (contact: { email?: string }) => open(`mailto:${contact.email ?? ''}`),
    onTask: (task: Task) => router.push(`/compose?id=${task.id}`),
    onFollowUps: () => router.push('/followups'),
    onReplied: (followUp: { id: string }) => {
      updateFollowUp(followUp.id, { status: 'done', lastAction: 'closed', lastActionAt: new Date().toISOString() });
      toast.show(fux.toastClose, { undo: false });
    },
  };

  // --- a card or a file ---------------------------------------------------

  /**
   * A business card, through the camera or from the photo library.
   *
   * Read by the phone's own text reader (src/lib/card-reader.ts) and shown as
   * the contact card the chat already has, so it is corrected and saved the
   * same way a spoken contact is. The photo is not uploaded and not kept.
   */
  const readOneCard = async (from: 'scan' | 'photo') => {
    if (!canReadCards()) return toast.show(copy.many.unsupported, { undo: false });
    let picked: ImagePicker.ImagePickerResult | null;
    if (from === 'scan') {
      const permission = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
      if (!permission?.granted) return toast.show(copy.many.cameraOff, { undo: false });
      picked = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 }).catch(() => null);
    } else {
      picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 }).catch(() => null);
    }
    const uri = picked && !picked.canceled ? picked.assets[0]?.uri : undefined;
    if (!uri) return;
    const lines = await readCard(uri).catch(() => []);
    if (lines.length === 0) return toast.show(copy.scan.nothing, { undo: false });
    nextContact(null, parseCard(lines, { region, prefer: lang }), copy.clip.scan);
  };

  /**
   * A file of people — Excel with every sheet, CSV, PDF or vCard — read by the
   * same pipeline the Import screen uses, and reported as counts in the chat.
   * Nothing is saved until "Add all", and nothing is uploaded at any point.
   */
  const readPeopleFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false }).catch(() => null);
    const asset = picked && !picked.canceled ? picked.assets[0] : undefined;
    if (!asset) return;
    const reading = newId();
    setMessages((list) => [...list, { id: reading, from: 'bot', kind: 'note', text: copy.clip.reading }]);
    try {
      const result = await candidatesFromFile(
        {
          name: asset.name,
          mime: asset.mimeType,
          text: async () => (await fetch(asset.uri)).text(),
          bytes: async () => new Uint8Array(await (await fetch(asset.uri)).arrayBuffer()),
        },
        contacts,
        region
      );
      setMessages((list) =>
        list.map((m) =>
          m.id === reading
            ? 'error' in result
              ? { id: m.id, from: 'bot' as const, kind: 'note' as const, text: copy.importer[result.error] }
              : { id: m.id, from: 'bot' as const, kind: 'file' as const, candidates: result.candidates, skipped: result.skipped }
            : m
        )
      );
    } catch {
      setMessages((list) => list.map((m) => (m.id === reading ? { id: m.id, from: 'bot' as const, kind: 'note' as const, text: copy.importer.failed } : m)));
    }
  };

  const chooseClip = (choice: Attach) => {
    if (choice === 'file') return void readPeopleFile();
    void readOneCard(choice);
  };

  /** "Add all": everyone the Import screen would have ticked by default. */
  const addFromFile = (msg: Extract<Message, { kind: 'file' }>) => {
    const keep = defaultSelection(msg.candidates);
    const chosen = msg.candidates.filter((c) => keep.has(c.key));
    if (chosen.length === 0) return;
    const saved = addContacts(
      chosen.map((c) => ({
        name: c.name,
        role: c.role,
        dial: c.dial,
        phone: c.phone,
        email: c.email,
        address: c.address,
        dial2: c.dial2,
        phone2: c.phone2,
        email2: c.email2,
        labels: c.labels,
        rememberNote: c.note,
        preferredChannel: c.phone ? ('whatsapp' as const) : c.email ? ('email' as const) : undefined,
        lastLabel: inline.addedToday,
      }))
    );
    setMessages((list) => [
      ...list.map((m) => (m.id === msg.id && 'kind' in m && m.kind === 'file' ? { ...m, added: saved.length } : m)),
      { id: newId(), from: 'bot', kind: 'note', text: copy.clip.addedN.replace('{n}', String(saved.length)) },
    ]);
  };

  /** "Review": the Import screen, with the file already read. */
  const reviewFile = (msg: Extract<Message, { kind: 'file' }>) => {
    readDraft.set({ name: '', candidates: msg.candidates, skipped: msg.skipped });
    router.push('/import');
  };

  // --- the microphone -----------------------------------------------------

  /** Tap to talk in the app's language; long-press to talk in the other one. */
  const talk = (otherLanguage = false) => {
    if (listening) return stopListeningRef.current?.();
    const speak = otherLanguage ? (lang === 'ar' ? 'en' : 'ar') : lang;
    const stop = startListening(
      speak,
      (heard) => {
        stopListeningRef.current = null;
        setListening(false);
        setInput('');
        if (heard.trim()) void send(heard.trim(), true);
      },
      (why) => toast.show(why === 'denied' ? copy.micOff : copy.micFailed, { undo: false }),
      { names: contacts.map((c) => c.name), autoStopMs: 2600, onPartial: setInput }
    );
    if (!stop) return toast.show(copy.micFailed, { undo: false });
    stopListeningRef.current = stop;
    setListening(true);
  };

  const send = async (raw?: string, typed = raw === undefined) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    const clear = () => raw === undefined && setInput('');
    // Saving a person takes no Assistant request: it is read on the device.
    if (typed && openContact && continueContact(openContact, text)) return clear();
    if (isContactCommand(text)) {
      clear();
      return startContact(text);
    }
    // "Import my excel", "صور كرت": the paperclip's choices, asked for in
    // words. Read on the phone, so no request is spent on these either.
    const attach = attachCommand(text);
    if (attach) {
      clear();
      setMessages((list) => [...list, { id: newId(), from: 'me', text }]);
      return chooseClip(attach);
    }
    // Hello, thanks and "what can you do?" are answered as they always were.
    // A question about someone's details goes to askData instead, which finds
    // the same person and can also offer the buttons to reach them.
    const small = smallTalk(text);
    if (small && small.kind !== 'lookup') {
      clear();
      return answerSmall(text, small);
    }
    // Mid-question, typing answers it. The suggestion chips are always a new message.
    if (pending && typed) {
      setInput('');
      reply(pending, text);
      return;
    }
    // Everything the app already knows, answered here: before the meter,
    // before the network, and whether or not either is there.
    const found = askData(text, dataWorld());
    if (found) {
      clear();
      return showData(text, found);
    }
    if (small) {
      clear();
      return answerSmall(text, small);
    }
    if (!meter.ready) return;
    if (pending) setMessages((list) => list.map((m) => ('kind' in m && m.kind === 'ask' ? { ...m, answered: true } : m)));
    if (!meter.canAsk) {
      router.push('/paywall');
      return;
    }
    meter.spend();
    const sent = newId();
    setMessages((list) => [...list, { id: sent, from: 'me', text }]);
    clear();
    let intent: AssistantIntent;
    try {
      intent = await textParser.interpret(text, { lang, now: new Date(), contacts });
    } catch (error) {
      if (!(error instanceof AssistLimitError)) throw error;
      // The server's count says today's are used up — another device spent
      // them. As at the eleventh request here: no message, the paywall.
      setMessages((list) => list.filter((m) => m.id !== sent));
      if (raw === undefined) setInput(text);
      router.push('/paywall');
      return;
    }
    timers.current.push(
      setTimeout(() => {
        // A task is checked for what is missing before it is shown for "Looks right".
        if (intent.kind === 'task') proceed(intent.task, text, {});
        else setMessages((list) => [...list, { id: newId(), from: 'bot', intent }]);
      }, REPLY_DELAY)
    );
  };

  useEffect(() => {
    if (!say || handedOver.current || !meter.ready) return;
    handedOver.current = true;
    void send(say, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [say, meter.ready]);

  const confirm = (id: string, task: ParsedTask) => {
    if (task.kind === 'waiting') {
      const when = whenText(task.when, t);
      addFollowUp(followUpFromParsed(task, copy.loop.waitSince.replace('{w}', when)));
      setMessages((list) => [
        ...list.map((m) => (m.id === id ? { ...m, confirmed: true } : m)),
        { id: newId(), from: 'bot', kind: 'note', text: copy.loop.savedWait.replace('{n}', task.who ?? '').replace('{w}', when) },
      ]);
      return;
    }
    addTask(taskFromParsed(task, 'assistant', promiseDraft(task, lang, session?.name)));
    setMessages((list) => [
      ...list.map((m) => (m.id === id ? { ...m, confirmed: true } : m)),
      { id: newId(), from: 'bot', kind: 'saved', time: clockOf(task.when) },
    ]);
  };

  // The greeting names the person where the prototype names its demo user.
  const demoFirst = t.set_name.split(' ')[0] ?? '';
  const greeting = session?.firstName ? t.bot0.replace(demoFirst, session.firstName) : t.bot0;

  const today = dateKey();
  const todaysOpen = tasks
    .filter((task) => task.status === 'open' && isOnDay(task, today))
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));

  const now = new Date();
  const nudge = followUps.filter((f) => followUpStatus(f, now) === 'due').length;
  const waiting = followUps.filter((f) => followUpStatus(f, now) === 'waiting').length;
  // botFu is the prototype's demo sentence ("Three threads are open. Noura
  // is the oldest — 3 days."); the Follow-ups summary says the same thing
  // from real counts — BUILD-REVIEW.md §2.34.
  const followUpLine = nudge + waiting === 0 ? fux.sum0 : fux.sum.replace('{a}', String(nudge)).replace('{b}', String(waiting));

  return (
    <>
      <Screen paddingX={0} paddingBottom={0}>
        <View
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 10,
            paddingTop: 4,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: surface.lineSoft,
          }}
        >
          <Pressable
            testID="assistant-back"
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={a11y.back}
            hitSlop={10}
            // 40 tall: the icon sits in the button's 28 pt line box.
            style={{ paddingTop: 6, paddingBottom: 12 }}
          >
            <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
              <Icon name="back" size={22} strokeWidth={1.7} />
            </View>
          </Pressable>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: ink.solid, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="spark" size={15} color={surface.white} strokeWidth={1.7} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text token="body" weight="600">
              {t.asst}
            </Text>
            <Text token="micro" color={ink.s4} numberOfLines={1}>
              {oneThing?.title ?? ''}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) =>
            'kind' in m && m.kind === 'contact' && (m.status === 'saved' || m.status === 'dropped') ? null : m.from === 'me' ? (
              <View
                key={m.id}
                testID="assistant-mine"
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '78%',
                  backgroundColor: ink.solid,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                }}
              >
                <Text token="body" lh={21.75} color={surface.white}>
                  {m.text}
                </Text>
              </View>
            ) : (
              <View key={m.id} testID="assistant-reply" style={{ alignSelf: 'flex-start', maxWidth: '88%', gap: 8 }}>
                <Bubble>
                  {'kind' in m
                    ? m.kind === 'greet'
                      ? greeting
                      : m.kind === 'saved'
                        ? t.botSaved.replace('{t}', m.time)
                        : m.kind === 'note'
                          ? m.text
                          : m.kind === 'contact'
                            ? contactLine(m)
                            : m.kind === 'data'
                              ? answerLine(m.answer, copy.qa)
                              : m.kind === 'file'
                                ? fileLine(m, copy.clip)
                                : questionFor(m.gap, m.draft, copy)
                    : m.intent.kind === 'task'
                      ? t.botTask
                      : m.intent.kind === 'plan'
                        ? t.botPlan
                        : followUpLine}
                </Bubble>
                {'kind' in m && m.kind === 'ask' && !m.answered ? (
                  <AskChips
                    testID="assistant-ask"
                    options={optionsFor(m.gap, m.draft, copy, quick, new Date())}
                    onPick={(option) => choose(m, option)}
                  />
                ) : null}
                {'kind' in m && m.kind === 'data' ? (
                  <DataCard
                    answer={m.answer}
                    copy={copy.qa}
                    whenLabel={(iso) => (iso ? whenText(iso, t) : '')}
                    {...dataActions}
                  />
                ) : null}
                {'kind' in m && m.kind === 'data' && m.answer.kind === 'unknown' ? (
                  <View testID="assistant-hint" style={{ flexDirection: dir.row, gap: 8, flexWrap: 'wrap' }}>
                    {[copy.qa.egTask, copy.qa.egLate, copy.qa.egImport].map((label, i) => (
                      <Pressable
                        key={label}
                        testID={`assistant-hint-${i}`}
                        onPress={() => void send(label)}
                        accessibilityRole="button"
                        style={({ pressed }) => ({
                          paddingVertical: 9,
                          paddingHorizontal: 14,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: surface.line,
                          backgroundColor: pressed ? surface.fill : surface.white,
                        })}
                      >
                        <Text token="caption" numberOfLines={1}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {'kind' in m && m.kind === 'file' && m.candidates.length > 0 && m.added === undefined ? (
                  <View style={{ flexDirection: dir.row, gap: 8, flexWrap: 'wrap' }}>
                    <Pressable
                      testID="assistant-file-add"
                      onPress={() => addFromFile(m)}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 999,
                        backgroundColor: pressed ? ink.base : ink.solid,
                      })}
                    >
                      <Text token="bodyS" weight="600" color={surface.white}>
                        {copy.clip.addAll}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID="assistant-file-review"
                      onPress={() => reviewFile(m)}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: surface.line,
                        backgroundColor: pressed ? surface.fill : surface.white,
                      })}
                    >
                      <Text token="bodyS" weight="600">
                        {copy.clip.review}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                {'kind' in m && m.kind === 'contact' && m.status === 'open' ? (
                  <ContactCard
                    fields={m.fields}
                    dial={dialFor(m.fields, region)}
                    copy={copy.contact}
                    duplicate={m.duplicate}
                    error={m.error}
                    canSave={Boolean(m.fields.name)}
                    canSaveNameOnly={missingOf(m.fields) === 'detail'}
                    onEdit={(edit) => editContact(m, edit)}
                    onSave={() => saveContact(m)}
                    onSaveNameOnly={() => saveContact(m, 'ask', true)}
                    onUpdate={() => saveContact(m, 'update')}
                    onSaveNew={() => saveContact(m, 'new')}
                    onCancel={() => dropContact(m)}
                  />
                ) : null}
                {'intent' in m && m.intent.kind === 'task' ? (
                  <TaskCard task={m.intent.task} confirmed={Boolean(m.confirmed)} onConfirm={() => confirm(m.id, (m.intent as { task: ParsedTask }).task)} />
                ) : null}
                {'intent' in m && m.intent.kind === 'plan' ? (
                  <Plan oneThing={oneThing ? { title: oneThing.title, meta: t.focusMeta.replace('{n}', String(oneThing.focusMinutes)) } : null} tasks={todaysOpen} />
                ) : null}
                {'intent' in m && m.intent.kind === 'followups' ? (
                  <Pressable
                    testID="assistant-open-followups"
                    onPress={() => router.push('/followups')}
                    accessibilityRole="button"
                    style={{
                      alignSelf: 'flex-start',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: ink.base,
                      backgroundColor: surface.white,
                    }}
                  >
                    <Text token="bodyS">{t.openFu}</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          )}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}
        >
          {[copy.contact.chip, ...t.chips, copy.loop.chipPromise, copy.loop.chipWait].map((chip, i) => (
            <Pressable
              key={chip}
              testID={`assistant-chip-${i}`}
              onPress={() => send(chip)}
              accessibilityRole="button"
              style={{
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: surface.line,
                backgroundColor: surface.white,
              }}
            >
              <Text token="caption" numberOfLines={1}>
                {chip}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          <SendRow
            testID="assistant"
            value={input}
            onChange={setInput}
            onSend={() => send()}
            placeholder={listening ? copy.listening : t.chatPh}
            sendLabel={a11y.send}
            clip={{ onPress: () => setClipOpen(true), label: copy.clip.open }}
            mic={{
              onPress: () => talk(),
              onLongPress: () => talk(true),
              listening,
              label: listening ? copy.micStop : copy.micStart,
            }}
          />
        </View>
      </Screen>
      <ClipSheet open={clipOpen} copy={copy.clip} onClose={() => setClipOpen(false)} onChoose={chooseClip} />
      <PersonSearchSheet
        open={searchFor !== null}
        title={searchFor ? questionFor(searchFor.gap, searchFor.draft, copy) : ''}
        onClose={() => setSearchFor(null)}
        onPick={(contact) => {
          const ask = searchFor;
          setSearchFor(null);
          if (ask) choose(ask, { key: `who-${contact.id}`, label: contact.name, action: { kind: 'who', contact } });
        }}
      />
      <Toast />
    </>
  );
}

function Bubble({ children }: { children: string }) {
  return (
    <View style={{ backgroundColor: surface.langTrack, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 18 }}>
      <Text token="body" lh={22.5}>
        {children}
      </Text>
    </View>
  );
}

function TaskCard({ task, confirmed, onConfirm }: { task: ParsedTask; confirmed: boolean; onConfirm: () => void }) {
  const { t, lang } = useLanguage();
  const dir = useDirection();
  const colour = typeColour[task.type];
  return (
    <View testID="assistant-card" style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, padding: 14, gap: 10, backgroundColor: surface.white }}>
      {task.kind ? <LoopTag kind={task.kind} copy={added(lang).loop} /> : null}
      <View style={{ flexDirection: dir.row, gap: 10, alignItems: 'center' }}>
        <Icon name={TYPE_ICON[task.type]} size={18} color={colour.fg} strokeWidth={1.9} />
        <Text token="body" weight="600" style={{ flex: 1 }}>
          {task.title}
        </Text>
      </View>
      <Text token="caption" color={ink.s3}>
        <Text token="caption" weight="600" color={colour.fg}>
          {t.types[task.type]}
        </Text>
        {` · ${task.who ?? NOBODY} · ${task.kind === 'waiting' ? `${added(lang).loop.checkIn} ` : ''}${whenText(task.when, t)}`}
      </Text>
      {confirmed ? (
        <View testID="assistant-kept" style={{ flexDirection: dir.row, gap: 6, alignItems: 'center' }}>
          <Icon name="check" size={16} strokeWidth={1.7} />
          <Text token="caption" color={ink.s3}>
            {t.kept}
          </Text>
        </View>
      ) : (
        <Pressable
          testID="assistant-confirm"
          onPress={onConfirm}
          accessibilityRole="button"
          style={{ height: 40, borderRadius: 20, backgroundColor: ink.solid, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text token="bodyS" color={surface.white} align="center">
            {t.ok}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function Plan({ oneThing, tasks }: { oneThing: { title: string; meta: string } | null; tasks: Task[] }) {
  const { t } = useLanguage();
  const dir = useDirection();
  const rows = [
    ...(oneThing ? [{ key: 'one', time: ONE_THING_SLOT, title: oneThing.title, sub: oneThing.meta, icon: <Icon name="target" size={16} strokeWidth={1.7} /> }] : []),
    ...tasks.map((task) => ({
      key: task.id,
      time: clockOf(task.dueAt),
      title: task.title,
      sub: [t.types[task.type], task.who].filter(Boolean).join(' · '),
      icon: <Icon name={TYPE_ICON[task.type]} size={16} color={typeColour[task.type].fg} strokeWidth={1.9} />,
    })),
  ];
  return (
    <View testID="assistant-plan" style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, overflow: 'hidden', backgroundColor: surface.white }}>
      {rows.map((row) => (
        <View
          key={row.key}
          style={{
            flexDirection: dir.row,
            gap: 12,
            paddingVertical: 11,
            paddingHorizontal: 14,
            borderBottomWidth: 1,
            borderBottomColor: surface.lineSoft,
            alignItems: 'center',
          }}
        >
          <Text token="micro" color={ink.s4} tabular style={{ width: 40 }}>
            {row.time}
          </Text>
          {row.icon}
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text token="bodyS" weight="500">
              {row.title}
            </Text>
            <Text token="micro" color={ink.s4}>
              {row.sub}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

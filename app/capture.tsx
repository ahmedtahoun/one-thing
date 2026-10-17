/**
 * 17 · Quick capture. SCREENS.md § 17.
 *
 * 8 / 24 / 44 with a 20 pt gap. Three states, as in the prototype: idle (the
 * mic, or "or type it"), listening, and done — what was heard, editable, with
 * the parsed What · Who · When · Via underneath. Nothing is saved until
 * "Save & back to focus"; closing throws it away.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { AskChips } from '@/features/capture/AskChips';
import { PersonSearchSheet } from '@/features/capture/PersonSearchSheet';
import { optionsFor, questionFor, type AskOption } from '@/features/capture/ask';
import { NOBODY, whenText } from '@/features/capture/labels';
import { Bars, Pulse } from '@/features/capture/Listening';
import { LoopTag } from '@/features/capture/LoopTag';
import { promiseDraft } from '@/features/compose/drafts';
import { MicNotice, useMicGate } from '@/features/mic/MicNotice';
import { SendRow } from '@/features/capture/SendRow';
import { Icon } from '@/ui/Icon';
import { added } from '@/content/additions';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { fontFamily, ink, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { textParser, type ParsedTask } from '@/lib/parse';
import { isContactCommand } from '@/lib/parse/contact';
import { clarify, suggestWho, withWhen, withWho, type Gap, type QuickWhen, type Settled } from '@/lib/parse/clarify';
import type { Contact } from '@/lib/model-types';
import { followUpFromParsed, taskFromParsed } from '@/lib/parse/to-task';
import { usePeople } from '@/lib/people';
import { startListening } from '@/lib/speech';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';

type Stage = 'idle' | 'listening' | 'done';

export default function Capture() {
  const { t, a11y, lang } = useLanguage();
  const dir = useDirection();
  const { contacts, followUps, addContact, addFollowUp } = usePeople();
  const { tasks, addTask } = useTasks();
  const { session } = useSession();
  const toast = useToast();
  const mic = useMicGate();

  const [stage, setStage] = useState<Stage>('idle');
  const [text, setText] = useState('');
  const [base, setBase] = useState<ParsedTask | null>(null);
  // What the person answered under the card. It sits on top of the parse, so
  // the card still follows the words, and is cleared when the words change.
  const [edits, setEdits] = useState<{ who?: Contact | null; when?: string; elsewhere?: boolean; settled: Settled }>({
    settled: {},
  });
  const stopRef = useRef<(() => void) | null>(null);
  const typeRef = useRef<TextInput>(null);

  // The card follows the words: edit "tomorrow" to "today" and When changes.
  useEffect(() => {
    if (stage !== 'done' || !text.trim()) {
      setBase(null);
      return;
    }
    let live = true;
    textParser.parse(text, { lang, now: new Date(), contacts }).then((p) => live && setBase(p));
    return () => {
      live = false;
    };
  }, [stage, text, lang, contacts]);

  useEffect(() => () => stopRef.current?.(), []);
  useEffect(() => setEdits({ settled: {} }), [text]);

  const parsed = useMemo(() => {
    if (!base) return null;
    let next = base;
    if (edits.who !== undefined) next = withWho(next, edits.who);
    if (edits.when) next = withWhen(next, edits.when);
    return next;
  }, [base, edits]);

  const copy = added(lang);
  const quick = t.rQuick as unknown as readonly QuickWhen[];
  // What is still worth asking. Saving is never blocked on it: leaving the
  // question is the same as "good enough".
  const gap: Gap | null = useMemo(() => {
    if (!parsed) return null;
    const now = new Date();
    if (edits.elsewhere && !edits.settled.who) {
      return { kind: 'who-missing', suggestions: suggestWho(parsed.type, { contacts, tasks, followUps, now }) };
    }
    return clarify(text, parsed, { contacts, tasks, followUps, now }, edits.settled);
  }, [parsed, text, contacts, tasks, followUps, edits]);

  const [searching, setSearching] = useState(false);
  const choose = (option: AskOption) => {
    const action = option.action;
    if (action.kind === 'who') {
      setEdits((e) => ({ ...e, who: action.contact, settled: { ...e.settled, who: true } }));
    } else if (action.kind === 'add') {
      const person = addContact({ name: action.name });
      setEdits((e) => ({ ...e, who: person, settled: { ...e.settled, who: true } }));
    } else if (action.kind === 'elsewhere') {
      setEdits((e) => ({ ...e, elsewhere: true }));
    } else if (action.kind === 'search') {
      setSearching(true);
    } else {
      setEdits((e) => ({ ...e, when: action.iso, settled: { ...e.settled, when: true } }));
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  /** "Save this number…" is not a task: it goes to the Assistant, which saves people. */
  const toAssistant = (value: string): boolean => {
    if (!isContactCommand(value)) return false;
    router.replace({ pathname: '/assistant', params: { say: value } });
    return true;
  };

  /**
   * Tapping the mic explains the microphone the first time
   * (`src/features/mic/`), and records only after that is agreed to. "Not
   * now" puts the cursor in the box, which is the other way in.
   */
  const micTap = () => {
    if (stage === 'listening') {
      stopRef.current?.();
      return;
    }
    mic.ask(listen);
  };

  const listen = () => {
    const stop = startListening(
      lang,
      (heard) => {
        stopRef.current = null;
        if (heard && toAssistant(heard)) return;
        if (heard) {
          setText(heard);
          setStage('done');
        } else {
          setStage('idle');
        }
      },
      (why) => {
        toast.show(why === 'denied' ? added(lang).micOff : added(lang).micFailed, { undo: false });
        typeRef.current?.focus();
      },
      { names: contacts.map((c) => c.name), autoStopMs: 2600 }
    );
    // No recogniser on this device yet: typing is the other way in.
    if (!stop) return typeRef.current?.focus();
    stopRef.current = stop;
    setStage('listening');
  };

  const submitTyped = () => {
    if (text.trim() && toAssistant(text)) return;
    if (text.trim()) setStage('done');
  };

  const save = () => {
    if (!parsed) return;
    if (parsed.kind === 'waiting') {
      // Someone owes a reply: it comes back as a follow-up when it is time to check.
      const when = whenText(parsed.when, t);
      addFollowUp(followUpFromParsed(parsed, copy.loop.waitSince.replace('{w}', when)));
      close();
      toast.show(copy.loop.savedWait.replace('{n}', parsed.who ?? '').replace('{w}', when), { undo: false });
      return;
    }
    addTask(taskFromParsed(parsed, 'capture', promiseDraft(parsed, lang, session?.name)));
    close();
    toast.show(t.toastSaved, { undo: false });
  };

  const rows = parsed
    ? [
        [t.what, parsed.title],
        [t.who, parsed.who ?? NOBODY],
        [parsed.kind === 'waiting' ? copy.loop.checkIn : t.when, whenText(parsed.when, t)],
        [t.via, t.types[parsed.type]],
      ]
    : [];

  return (
    <>
      <Screen scroll paddingX={24} paddingTop={8} paddingBottom={44} style={{ gap: 20 }}>
        <View style={{ flexDirection: dir.row, justifyContent: 'flex-end' }}>
          <Pressable
            testID="capture-close"
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={a11y.close}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: surface.langTrack,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x" size={20} strokeWidth={1.7} />
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          <Text token="h1" size={30}>
            {t.cap_t}
          </Text>
          <Text token="body" color={ink.s3}>
            {t.cap_s}
          </Text>
        </View>

        {stage === 'done' ? (
          <>
            <View style={{ gap: 14 }}>
              <Text token="caption" color={ink.s4}>
                {t.heard}
              </Text>
              <TextInput
                testID="capture-heard"
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
                style={{
                  // Three rows of 16 pt at 1.5, inside 14 pt padding.
                  height: 3 * 24 + 28,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: surface.brief,
                  fontFamily: `${fontFamily}_400Regular`,
                  fontSize: 16,
                  lineHeight: 24,
                  color: ink.base,
                  writingDirection: dir.isRTL ? 'rtl' : 'ltr',
                  textAlign: dir.textAlign,
                }}
              />
              {parsed?.kind ? <LoopTag kind={parsed.kind} copy={copy.loop} /> : null}
              {rows.length ? (
                <View testID="capture-card" style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, overflow: 'hidden' }}>
                  {rows.map(([k, v]) => (
                    <View
                      key={k}
                      style={{
                        flexDirection: dir.row,
                        gap: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: surface.lineSoft,
                      }}
                    >
                      <Text token="bodyS" color={ink.s4} style={{ width: 64 }}>
                        {k}
                      </Text>
                      <Text token="bodyS" weight="500" style={{ flex: 1 }}>
                        {v}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {parsed && gap ? (
                <View testID="capture-ask" style={{ gap: 10 }}>
                  <Text token="bodyS" weight="600">
                    {questionFor(gap, parsed, copy)}
                  </Text>
                  <AskChips options={optionsFor(gap, parsed, copy, quick, new Date())} onPick={choose} />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1 }} />
            <Pressable
              testID="capture-save"
              onPress={save}
              accessibilityRole="button"
              style={{
                height: 56,
                borderRadius: 28,
                backgroundColor: parsed ? ink.solid : ink.disabledBtn,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text token="title" weight="500" color={surface.white} align="center">
                {t.save}
              </Text>
            </Pressable>
          </>
        ) : null}

        {stage === 'idle' ? (
          <>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
              <Pressable
                testID="capture-mic"
                onPress={micTap}
                accessibilityRole="button"
                accessibilityLabel={a11y.speak}
                style={({ pressed }) => ({
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: ink.solid,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Icon name="mic" size={34} color={surface.white} strokeWidth={1.6} />
              </Pressable>
            </View>
            <View style={{ gap: 10 }}>
              <Text testID="capture-hint" token="caption" color={ink.s5} align="center" style={{ paddingHorizontal: 12 }}>
                {copy.loop.hint}
              </Text>
              <Text token="caption" color={ink.s4} align="center">
                {t.orType}
              </Text>
              <SendRow
                ref={typeRef}
                testID="capture-type"
                value={text}
                onChange={setText}
                onSend={submitTyped}
                placeholder={t.chatPh}
                sendLabel={a11y.send}
              />
            </View>
          </>
        ) : null}

        {stage === 'listening' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
            <View style={{ width: 120, height: 120 }}>
              <Pulse />
              <Pressable
                testID="capture-stop"
                onPress={micTap}
                accessibilityRole="button"
                accessibilityLabel={t.tapStop}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 60,
                  backgroundColor: ink.solid,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="mic" size={34} color={surface.white} strokeWidth={1.6} />
              </Pressable>
            </View>
            <Bars />
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text token="title" weight="500" align="center">
                {t.listening}
              </Text>
              <Text token="caption" color={ink.s5} align="center">
                {t.tapStop}
              </Text>
            </View>
          </View>
        ) : null}
      </Screen>
      <MicNotice
        open={mic.asking}
        onAllow={mic.allow}
        onClose={() => {
          mic.dismiss();
          typeRef.current?.focus();
        }}
      />
      <PersonSearchSheet
        open={searching}
        title={gap ? questionFor(gap, parsed ?? ({ type: 'call' } as never), copy) : ''}
        onClose={() => setSearching(false)}
        onPick={(contact) => {
          setSearching(false);
          choose({ key: `who-${contact.id}`, label: contact.name, action: { kind: 'who', contact } });
        }}
      />
      <Toast />
    </>
  );
}

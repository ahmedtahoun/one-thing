/**
 * 17 · Quick capture. SCREENS.md § 17.
 *
 * 8 / 24 / 44 with a 20 pt gap. Three states, as in the prototype: idle (the
 * mic, or "or type it"), listening, and done — what was heard, editable, with
 * the parsed What · Who · When · Via underneath. Nothing is saved until
 * "Save & back to focus"; closing throws it away.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { NOBODY, whenText } from '@/features/capture/labels';
import { Bars, Pulse } from '@/features/capture/Listening';
import { SendRow } from '@/features/capture/SendRow';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { fontFamily, ink, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { textParser, type ParsedTask } from '@/lib/parse';
import { taskFromParsed } from '@/lib/parse/to-task';
import { usePeople } from '@/lib/people';
import { startListening } from '@/lib/speech';
import { useTasks } from '@/lib/tasks';

type Stage = 'idle' | 'listening' | 'done';

export default function Capture() {
  const { t, a11y, lang } = useLanguage();
  const dir = useDirection();
  const { contacts } = usePeople();
  const { addTask } = useTasks();
  const toast = useToast();

  const [stage, setStage] = useState<Stage>('idle');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const typeRef = useRef<TextInput>(null);

  // The card follows the words: edit "tomorrow" to "today" and When changes.
  useEffect(() => {
    if (stage !== 'done' || !text.trim()) {
      setParsed(null);
      return;
    }
    let live = true;
    textParser.parse(text, { lang, now: new Date(), contacts }).then((p) => live && setParsed(p));
    return () => {
      live = false;
    };
  }, [stage, text, lang, contacts]);

  useEffect(() => () => stopRef.current?.(), []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const micTap = () => {
    if (stage === 'listening') {
      stopRef.current?.();
      return;
    }
    const stop = startListening(lang, (heard) => {
      stopRef.current = null;
      if (heard) {
        setText(heard);
        setStage('done');
      } else {
        setStage('idle');
      }
    });
    // No recogniser on this device yet: typing is the other way in.
    if (!stop) return typeRef.current?.focus();
    stopRef.current = stop;
    setStage('listening');
  };

  const submitTyped = () => {
    if (text.trim()) setStage('done');
  };

  const save = () => {
    if (!parsed) return;
    addTask(taskFromParsed(parsed, 'capture'));
    close();
    toast.show(t.toastSaved, { undo: false });
  };

  const rows = parsed
    ? [
        [t.what, parsed.title],
        [t.who, parsed.who ?? NOBODY],
        [t.when, whenText(parsed.when, t)],
        [t.via, t.types[parsed.type]],
      ]
    : [];

  return (
    <>
      <Screen paddingX={24} paddingTop={8} paddingBottom={44} style={{ gap: 20 }}>
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
            </View>
            <View style={{ flex: 1 }} />
            <Pressable
              testID="capture-save"
              onPress={save}
              accessibilityRole="button"
              style={{
                height: 56,
                borderRadius: 28,
                backgroundColor: parsed ? ink.base : ink.disabledBtn,
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
                  backgroundColor: ink.base,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Icon name="mic" size={34} color={surface.white} strokeWidth={1.6} />
              </Pressable>
            </View>
            <View style={{ gap: 10 }}>
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
                  backgroundColor: ink.base,
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
      <Toast />
    </>
  );
}

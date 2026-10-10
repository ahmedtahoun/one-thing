/**
 * 18 · Brain dump. SCREENS.md § 18.
 *
 * 4 / 20 / 44 with an 18 pt gap. Write (or say) everything; "Sort it for me"
 * splits it into separate things, each kept or dropped with a tap; nothing is
 * saved until "Save {n} and clear my head".
 */
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { whenText } from '@/features/capture/labels';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { TYPE_ICON } from '@/design/icon-paths';
import { fontFamily, ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { textParser, type ParsedTask } from '@/lib/parse';
import { taskFromParsed } from '@/lib/parse/to-task';
import { usePeople } from '@/lib/people';
import { startListening } from '@/lib/speech';
import { useTasks } from '@/lib/tasks';

type Item = ParsedTask & { keep: boolean };

/** The textarea's 9 rows of 16 pt at 1.6 inside 16 pt padding and a 1.5 pt border, as Chromium renders it. */
const DUMP_HEIGHT = 264.3;

export default function BrainDump() {
  const { t, a11y, lang } = useLanguage();
  const dir = useDirection();
  const { contacts } = usePeople();
  const { addTasks } = useTasks();
  const toast = useToast();

  const [text, setText] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);
  const [listening, setListening] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<TextInput>(null);

  const kept = items?.filter((i) => i.keep).length ?? 0;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  /**
   * "Talk instead". The prototype fills in its own sample paragraph; here
   * what is heard is added to what is already written. With no recogniser on
   * the device, it puts the cursor in the box instead — BUILD-REVIEW.md §2.28.
   */
  const talk = () => {
    if (listening) return stopRef.current?.();
    const stop = startListening(lang, (heard) => {
      stopRef.current = null;
      setListening(false);
      if (heard) setText((current) => (current.trim() ? `${current.trim()}\n${heard}` : heard));
    });
    if (!stop) return inputRef.current?.focus();
    stopRef.current = stop;
    setListening(true);
  };

  /** The prototype sorts its sample when the box is empty; an empty box sorts nothing. */
  const sort = async () => {
    if (!text.trim()) return;
    const found = await textParser.split(text, { lang, now: new Date(), contacts });
    setItems(found.map((p) => ({ ...p, keep: true })));
  };

  const save = () => {
    if (!items || kept === 0) return;
    addTasks(items.filter((i) => i.keep).map((i) => taskFromParsed(i, 'dump')));
    router.dismissTo('/today');
    toast.show(t.toastDump.replace('{n}', String(kept)), { undo: false });
  };

  return (
    <>
      <Screen scroll paddingTop={4} paddingBottom={44} style={{ gap: 18 }}>
        <Pressable
          testID="dump-back"
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel={a11y.back}
          hitSlop={10}
          // 40 tall: the icon sits in the button's 28 pt line box, as on Settings.
          style={{ alignSelf: 'flex-start', paddingTop: 6, paddingBottom: 12 }}
        >
          <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
            <Icon name="back" size={22} strokeWidth={1.7} />
          </View>
        </Pressable>

        <View style={{ gap: 8 }}>
          {/* An eyebrow by its tracking, but the prototype leaves it at 400. */}
          <Text token="eyebrow" weight="400" color={ink.s4}>
            {t.d_k}
          </Text>
          <Text token="h1">{t.d_t}</Text>
          <Text token="body" lh={22.5} color={ink.s3}>
            {t.d_s}
          </Text>
        </View>

        {items === null ? (
          <>
            <TextInput
              ref={inputRef}
              testID="dump-text"
              value={text}
              onChangeText={setText}
              placeholder={t.d_ph}
              placeholderTextColor={ink.s5}
              multiline
              textAlignVertical="top"
              style={{
                height: DUMP_HEIGHT,
                padding: 16,
                borderWidth: 1.5,
                borderColor: ink.base,
                borderRadius: 16,
                backgroundColor: surface.white,
                fontFamily: `${fontFamily}_400Regular`,
                fontSize: 16,
                lineHeight: 25.6,
                color: ink.base,
                writingDirection: dir.isRTL ? 'rtl' : 'ltr',
                textAlign: dir.textAlign,
              }}
            />
            <Pressable
              testID="dump-talk"
              onPress={talk}
              accessibilityRole="button"
              style={{
                alignSelf: 'flex-start',
                flexDirection: dir.row,
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: listening ? ink.base : surface.line,
                backgroundColor: surface.white,
              }}
            >
              {/* The prototype passes its white mic here, invisible on the
                  white button; drawn in ink — BUILD-REVIEW.md §2.27. */}
              <Icon name="mic" size={22} strokeWidth={1.9} />
              <Text token="bodyS">{listening ? t.tapStop : t.d_fill}</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
              testID="dump-sort"
              onPress={sort}
              accessibilityRole="button"
              style={{ height: 56, borderRadius: 28, backgroundColor: ink.base, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text token="title" weight="500" color={surface.white} align="center">
                {t.d_sort}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text token="body" weight="600" testID="dump-found">
                {t.d_found.replace('{n}', String(items.length))}
              </Text>
              <Pressable testID="dump-edit" onPress={() => setItems(null)} accessibilityRole="button">
                <Text token="caption" color={ink.s4}>
                  {t.d_edit}
                </Text>
              </Pressable>
            </View>
            <Text token="caption" color={ink.s4} style={{ marginTop: -10 }}>
              {t.d_hint}
            </Text>
            <View style={{ gap: 8 }}>
              {items.map((item, i) => (
                <DumpItem
                  key={i}
                  index={i}
                  item={item}
                  onToggle={() => setItems((list) => list && list.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                />
              ))}
            </View>
            <View style={{ flex: 1 }} />
            <Pressable
              testID="dump-save"
              onPress={save}
              accessibilityRole="button"
              style={{ height: 56, borderRadius: 28, backgroundColor: ink.base, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text token="title" weight="500" color={surface.white} align="center">
                {t.d_save.replace('{n}', String(kept))}
              </Text>
            </Pressable>
          </>
        )}
      </Screen>
      <Toast />
    </>
  );
}

function DumpItem({ item, index, onToggle }: { item: Item; index: number; onToggle: () => void }) {
  const { t } = useLanguage();
  const dir = useDirection();
  const colour = typeColour[item.type];
  return (
    <Pressable
      testID={`dump-item-${index}`}
      onPress={onToggle}
      accessibilityRole="checkbox"
      aria-checked={item.keep}
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: surface.line,
        borderRadius: 14,
        backgroundColor: surface.white,
        opacity: item.keep ? 1 : 0.4,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: ink.base,
          backgroundColor: item.keep ? ink.base : surface.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.keep ? <Icon name="check" size={14} color={surface.white} strokeWidth={2.4} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text token="bodyS" weight="500" style={{ textDecorationLine: item.keep ? 'none' : 'line-through' }}>
          {item.title}
        </Text>
        <Text token="micro" color={ink.s4}>
          <Text token="micro" weight="600" color={colour.fg}>
            {t.types[item.type]}
          </Text>
          {` · ${whenText(item.when, t)}`}
        </Text>
      </View>
      <Icon name={TYPE_ICON[item.type]} size={18} color={colour.fg} strokeWidth={1.9} />
    </Pressable>
  );
}

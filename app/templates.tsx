/**
 * Saved messages: the wording the person uses again and again, written once.
 * A list, one tap to edit, and a switch for the one that goes out as the
 * follow-up. Nothing here sends anything; a message only ever fills a draft.
 */
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import type { Saved } from '@/features/compose/saved';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { fontFamily, ink, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { addSaved, removeSaved, updateSaved, useSaved } from '@/lib/templates';

export default function Templates() {
  const { lang, a11y } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).saved;
  const list = useSaved();
  // `null` closed, `{}` a new one, a message to change it.
  const [editing, setEditing] = useState<Partial<Saved> | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [chase, setChase] = useState(false);

  const open = (item: Partial<Saved>) => {
    setEditing(item);
    setTitle(item.title ?? '');
    setSubject(item.subject ?? '');
    setBody(item.body ?? '');
    setChase(Boolean(item.chase));
  };
  const close = () => setEditing(null);
  const ready = title.trim().length > 0 && body.trim().length > 0;

  const save = async () => {
    if (!ready || !editing) return;
    const fields = { title: title.trim(), body: body.trim(), subject: subject.trim() || undefined, chase };
    if (editing.id) await updateSaved(editing.id, fields);
    else await addSaved(fields);
    close();
  };
  const remove = async () => {
    if (editing?.id) await removeSaved(editing.id);
    close();
  };

  const field = (extra: object) => ({
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: surface.fill,
    fontFamily: `${fontFamily}_400Regular`,
    fontSize: 15,
    color: ink.base,
    textAlign: dir.textAlign,
    writingDirection: dir.isRTL ? ('rtl' as const) : ('ltr' as const),
    ...extra,
  });

  return (
    <>
      <Screen background="grouped" paddingTop={4} paddingBottom={0}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingBottom: 10 }}>
          <Pressable testID="templates-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} accessibilityRole="button" accessibilityLabel={a11y.back} hitSlop={12}>
            <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
              <Icon name="back" size={24} strokeWidth={2} />
            </View>
          </Pressable>
          <Text token="title" style={{ flex: 1 }}>
            {copy.title}
          </Text>
          <Pressable testID="templates-add" onPress={() => open({})} accessibilityRole="button" style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: ink.solid }}>
            <Text token="bodyS" weight="600" color={surface.white}>
              + {copy.add}
            </Text>
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text token="caption" color={ink.s4}>
            {copy.hint}
          </Text>
          {list.length === 0 ? (
            <Text testID="templates-empty" token="bodyS" color={ink.s4} style={{ paddingTop: 16 }}>
              {copy.empty}
            </Text>
          ) : null}
          {list.map((item) => (
            <Pressable
              key={item.id}
              testID={`template-${item.id}`}
              onPress={() => open(item)}
              accessibilityRole="button"
              style={{ gap: 4, padding: 14, borderRadius: 16, backgroundColor: surface.white }}
            >
              <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
                <Text token="body" weight="600" style={{ flex: 1 }} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.chase ? (
                  <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: ink.solid }}>
                    <Text size={11} weight="700" color={surface.white}>
                      {copy.chase}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text token="bodyS" color={ink.s4} numberOfLines={2}>
                {item.body}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Screen>

      <Sheet open={editing !== null} onClose={close} testID="template-sheet" padding={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 28 }} gap={10}>
        <TextInput testID="template-title" value={title} onChangeText={setTitle} placeholder={copy.titlePh} placeholderTextColor={ink.s5} style={field({ height: 48 })} />
        <TextInput testID="template-subject" value={subject} onChangeText={setSubject} placeholder={copy.subjectPh} placeholderTextColor={ink.s5} style={field({ height: 48 })} />
        <TextInput
          testID="template-body"
          value={body}
          onChangeText={setBody}
          placeholder={copy.bodyPh}
          placeholderTextColor={ink.s5}
          multiline
          textAlignVertical="top"
          style={field({ minHeight: 130, maxHeight: 220, paddingTop: 12, lineHeight: 22 })}
        />
        <Pressable testID="template-chase" onPress={() => setChase((v) => !v)} accessibilityRole="switch" accessibilityState={{ checked: chase }} style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingVertical: 4 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text token="body">{copy.chase}</Text>
            <Text token="micro" color={ink.s4}>
              {copy.chaseHint}
            </Text>
          </View>
          <Toggle on={chase} />
        </Pressable>
        <Pressable testID="template-save" onPress={() => void save()} accessibilityRole="button" style={{ height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: ready ? ink.solid : ink.disabledBtn }}>
          <Text token="body" weight="600" color={surface.white}>
            {copy.save}
          </Text>
        </Pressable>
        {editing?.id ? (
          <Pressable testID="template-delete" onPress={() => void remove()} accessibilityRole="button" style={{ height: 42, alignItems: 'center', justifyContent: 'center' }}>
            <Text token="bodyS" weight="500" color={status.danger}>
              {copy.remove}
            </Text>
          </Pressable>
        ) : null}
      </Sheet>
    </>
  );
}

/**
 * Setting or changing the day's One Thing, without leaving Today: a sheet with
 * the question, a box, and a few suggestions. It replaces the full-screen
 * "Morning priority" page, which asked every time and stood between the person
 * and the day.
 */
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { ONE_THING_SUGGESTIONS } from '@/content/seed';
import { fontFamily, ink, radius, space, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export function OneThingSheet({
  open,
  initial,
  suggestions,
  onSave,
  onClose,
}: {
  open: boolean;
  /** What is set now, to edit. */
  initial?: string;
  /** The person's own open tasks first, the stock examples when there are none. */
  suggestions?: readonly string[];
  onSave: (title: string) => void;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const dir = useDirection();
  const [draft, setDraft] = useState(initial ?? '');
  const labels = (suggestions && suggestions.length > 0 ? suggestions : ONE_THING_SUGGESTIONS.map((s) => s[lang])).slice(0, 3);
  const text = draft.trim();

  const save = () => {
    if (text) onSave(text);
  };

  return (
    <Sheet open={open} onClose={onClose} testID="onething-sheet" padding={{ paddingTop: 10, paddingHorizontal: space.screenX, paddingBottom: 30 }} gap={14}>
      <Text token="h3" size={21}>
        {t.pr_q}
      </Text>
      <TextInput
        testID="onething-input"
        value={draft}
        onChangeText={setDraft}
        placeholder={t.pr_ph}
        placeholderTextColor={ink.s6}
        returnKeyType="done"
        onSubmitEditing={save}
        autoFocus
        style={{
          height: 54,
          borderWidth: 1.5,
          borderColor: ink.base,
          borderRadius: radius.input,
          paddingHorizontal: 16,
          fontSize: 16,
          fontFamily: `${fontFamily}_400Regular`,
          color: ink.base,
          backgroundColor: surface.white,
          textAlign: dir.textAlign,
        }}
      />
      <View style={{ gap: 8 }}>
        {labels.map((label, i) => (
          <Pressable
            key={label}
            testID={`onething-suggestion-${i}`}
            onPress={() => setDraft(label)}
            accessibilityRole="button"
            style={{
              paddingVertical: 13,
              paddingHorizontal: 16,
              borderRadius: radius.input,
              borderWidth: 1.5,
              borderColor: text === label ? ink.solid : surface.line,
              backgroundColor: text === label ? surface.brief : surface.white,
            }}
          >
            <Text token="body" numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        testID="onething-save"
        onPress={save}
        disabled={!text}
        accessibilityRole="button"
        style={{ height: 54, borderRadius: radius.button, backgroundColor: text ? ink.solid : ink.disabledBtn, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text token="title" weight="500" color={surface.white}>
          {t.pr_cta}
        </Text>
      </Pressable>
    </Sheet>
  );
}

/**
 * 05 · Morning priority. SCREENS.md § 05.
 *
 * Shown on a new day when no One Thing is set — not on a first run, which the
 * card on Today handles instead. Today's "Edit" on the One Thing card lands
 * here too.
 *
 * Focus length is deliberately absent: the spec puts it in Settings.
 */
import { useCallback, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { BalancedText } from '@/ui/BalancedText';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ONE_THING_SUGGESTIONS } from '@/content/seed';
import { fontFamily, ink, radius, space, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';

export default function MorningPriority() {
  const { t, lang, inline } = useLanguage();
  const dir = useDirection();
  const { session } = useSession();
  const { oneThing, setOneThing } = useTasks();

  // Typing wins over a picked suggestion, exactly as the prototype does: a
  // suggestion is only "selected" while the field is empty, and saving an
  // empty field keeps whatever is already chosen. Something is always chosen
  // — a fresh day starts on the first suggestion — so the button is never
  // dead, which is why the prototype gives it no disabled state.
  const [draft, setDraft] = useState('');
  const [choice, setChoice] = useState<{ suggestion: number } | { title: string }>(
    oneThing ? { title: oneThing.title } : { suggestion: 0 }
  );

  // Held as an index rather than a string so a picked suggestion follows a
  // language switch, as it does in the prototype.
  const current =
    'suggestion' in choice ? (ONE_THING_SUGGESTIONS[choice.suggestion]?.[lang] ?? '') : choice.title;
  const chosen = draft.trim() || current;

  const save = useCallback(() => {
    if (!chosen) return;
    setOneThing(chosen);
    router.replace('/today');
  }, [chosen, setOneThing]);

  /**
   * The ported `pr_k` reads "GOOD MORNING, KHALID" — the demo user's name is
   * baked into the string. SCREENS.md § 05 writes it "GOOD MORNING, {NAME}",
   * so it is composed from the greeting and the account instead, which
   * reproduces the handoff's own string for that user. BUILD-REVIEW.md §2.27.
   */
  const eyebrow = `${inline.goodMorning}${session?.firstName ?? ''}`.toUpperCase();

  return (
    <Screen scroll paddingX={space.screenXWide} paddingTop={20} paddingBottom={44} style={{ gap: 24 }}>
      <View style={{ gap: 12 }}>
        {/* 12 px here, not the 11 px eyebrow token — this screen's own size. */}
        <Text token="eyebrow" size={12} color={ink.s4}>
          {eyebrow}
        </Text>
        <BalancedText token="h2" size={27} lh={33.75} testID="priority-question">
          {t.pr_q}
        </BalancedText>
      </View>

      <TextInput
        testID="priority-input"
        value={draft}
        onChangeText={setDraft}
        placeholder={t.pr_ph}
        placeholderTextColor={ink.s6}
        returnKeyType="done"
        onSubmitEditing={save}
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

      <View style={{ gap: 10 }}>
        <Text token="caption" color={ink.s4}>
          {t.pr_sugg}
        </Text>
        {ONE_THING_SUGGESTIONS.map((suggestion, index) => {
          const label = suggestion[lang];
          const selected = !draft.trim() && current === label;
          return (
            <Pressable
              key={suggestion.en}
              testID={`priority-suggestion-${index}`}
              onPress={() => {
                setChoice({ suggestion: index });
                setDraft('');
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={{
                flexDirection: dir.row,
                alignItems: 'center',
                gap: 12,
                paddingVertical: 15,
                paddingHorizontal: 16,
                borderRadius: radius.input,
                borderWidth: 1.5,
                borderColor: selected ? ink.base : surface.line,
                // The same soft fill Compose's brief card uses.
                backgroundColor: selected ? surface.brief : surface.white,
              }}
            >
              <Text token="body" style={{ flex: 1 }}>
                {label}
              </Text>
              {selected ? (
                <View testID={`priority-tick-${index}`}>
                  <Icon name="check" size={16} strokeWidth={1.7} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 12 }}>
        <Pressable
          testID="priority-save"
          onPress={save}
          accessibilityRole="button"
          style={{
            height: 56,
            borderRadius: radius.button,
            backgroundColor: ink.base,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text token="title" weight="500" color={surface.white}>
            {t.pr_cta}
          </Text>
        </Pressable>
        <Text token="caption" color={ink.s4} align="center">
          {t.pr_note}
        </Text>
      </View>
    </Screen>
  );
}

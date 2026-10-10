/**
 * 16 · Overwhelm mode. SCREENS.md § 16.
 *
 * One small step at a time from the One Thing's breakdown, with the rest of
 * the list visible but quiet underneath. "Kept intentionally simple (no
 * editing)" is the spec's own note, and it is the point of the screen: when
 * someone is stuck, the last thing to offer them is more choices.
 */
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { StepBreakdown } from '@/features/overwhelm/StepBreakdown';
import { BalancedText } from '@/ui/BalancedText';
import { BackButton } from '@/ui/BackButton';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ONE_THING_SUGGESTIONS } from '@/content/seed';
import { STEPS } from '@/content/strings';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useTasks } from '@/lib/tasks';

/** SCREENS.md § 16: the sprint is five minutes. */
const SPRINT_MINUTES = 5;

export default function Overwhelm() {
  const { t, lang, a11y } = useLanguage();
  const dir = useDirection();
  const { oneThing } = useTasks();

  // The handoff breaks down the three suggested One Things by name and gives
  // a generic list under "_" for anything else. Its keys are the *English*
  // titles, so an Arabic One Thing has to be matched back to its suggestion
  // first — looking the title up directly would drop every Arabic user onto
  // the generic list.
  const title = oneThing?.title ?? '';
  const key = ONE_THING_SUGGESTIONS.find((s) => s.en === title || s.ar === title)?.en;
  const steps = (STEPS[key ?? title] ?? STEPS['_'])?.[lang] ?? [];

  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  // "Make it tinier" prefixes the same step rather than rewriting it, so the
  // step itself is never lost. It resets each time a step is finished.
  const [tiny, setTiny] = useState(false);

  const currentIndex = steps.findIndex((_, i) => !done.has(i));
  const allDone = currentIndex === -1;

  const next = useCallback(() => {
    setDone((set) => new Set(set).add(currentIndex));
    setTiny(false);
  }, [currentIndex]);

  const reset = useCallback(() => {
    setDone(new Set());
    setTiny(false);
  }, []);

  return (
    <Screen
      scroll
      background="grouped"
      paddingTop={4}
      paddingBottom={44}
      style={{ gap: 18 }}
    >
      <BackButton testID="overwhelm-back" onPress={() => router.back()} />

      <View style={{ gap: 8 }}>
        <Text token="eyebrow" color={ink.s4}>
          {t.s_k}
        </Text>
        <Text token="h1">{t.s_t}</Text>
        <Text token="bodyS" color={ink.s4}>
          {title}
        </Text>
      </View>

      {allDone ? (
        <View
          testID="overwhelm-all-done"
          style={{ backgroundColor: ink.base, borderRadius: 22, padding: 22, gap: 12 }}
        >
          <Text token="h3" size={20} lh={27} weight="600" color={surface.white}>
            {t.s_all}
          </Text>
          <Pressable
            testID="overwhelm-reset"
            onPress={reset}
            accessibilityRole="button"
            accessibilityLabel={t.s_t}
            style={{
              alignSelf: 'flex-start',
              paddingVertical: 9,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: surface.white,
            }}
          >
            <Text token="caption" color={surface.white}>
              ↺
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          testID="overwhelm-step"
          style={{
            backgroundColor: surface.white,
            borderRadius: 22,
            padding: 22,
            gap: 14,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 8 },
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: dir.row, justifyContent: 'space-between' }}>
            <Text token="micro" color={ink.s4}>
              {t.s_step.replace('{a}', String(currentIndex + 1)).replace('{b}', String(steps.length))}
            </Text>
            <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 4 }}>
              <Icon name="clock" size={15} strokeWidth={1.7} color={ink.s4} />
              <Text token="micro" color={ink.s4}>
                {t.s_mins}
              </Text>
            </View>
          </View>

          <BalancedText token="h3" size={24} lh={31.2} testID="overwhelm-step-text">
            {(tiny ? t.s_tinyPre : '') + (steps[currentIndex] ?? '')}
          </BalancedText>

          <Pressable
            testID="overwhelm-sprint"
            onPress={() => router.push(`/focus?minutes=${SPRINT_MINUTES}`)}
            accessibilityRole="button"
            style={{
              height: 52,
              borderRadius: 26,
              backgroundColor: ink.base,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text token="bodyL" weight="500" color={surface.white}>
              {t.s_sprint}
            </Text>
          </Pressable>

          <View style={{ flexDirection: dir.row, gap: 8 }}>
            <SmallButton testID="overwhelm-next" label={t.s_next} onPress={next} strong />
            <SmallButton
              testID="overwhelm-tiny"
              label={tiny ? t.s_bigger : t.s_smaller}
              onPress={() => setTiny((v) => !v)}
            />
          </View>
        </View>
      )}

      <StepBreakdown steps={steps} done={done} currentIndex={currentIndex} />

      <View style={{ flex: 1 }} />

      <Text token="caption" color={ink.s4} align="center">
        {t.s_hold}
      </Text>
    </Screen>
  );
}

/** The two 44 pt buttons under the step: "Done — next step" and the toggle. */
function SmallButton({
  label,
  onPress,
  strong,
  testID,
}: {
  label: string;
  onPress: () => void;
  strong?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flex: 1,
        height: 44,
        borderRadius: 22,
        borderWidth: strong ? 1.5 : 1,
        borderColor: strong ? ink.base : surface.line,
        backgroundColor: surface.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text token="bodyS" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

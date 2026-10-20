/**
 * What a newcomer sees the first time they open Sanad: the things it can do,
 * as sentences they can send with one tap rather than a list of features they
 * have to take on trust.
 *
 * The screen they used to meet was a greeting bubble and 70% empty space, and
 * the only hint of what to type was two chips above the keyboard. Tapping a
 * row here sends that sentence as if they had typed it, so the introduction
 * is also the first thing Sanad does for them, and the sentence stays in the
 * chat as a phrase they now know. BUILD-REVIEW §2.113.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import type { IconName } from '@/design/icon-paths';
import { Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import type { IntroStep } from './intro';

/** One icon per kind of thing Sanad does, so the rows read at a glance. */
const ICONS: Record<string, string> = { remind: 'bell', dump: 'spark', ask: 'clock', card: 'users' };

export function IntroCard({ steps, heading, done, onTry, onDone }: { steps: IntroStep[]; heading: string; done: string; onTry: (say: string) => void; onDone: () => void }) {
  const dir = useDirection();

  return (
    <View
      testID="assistant-intro"
      style={{ backgroundColor: surface.white, borderWidth: 1, borderColor: surface.line, borderRadius: radius.largeCard, padding: 6, gap: 2 }}
    >
      <Text token="eyebrow" color={ink.s5} style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 }}>
        {heading}
      </Text>

      {steps.map((step) => (
        <Pressable
          key={step.key}
          testID={`assistant-intro-${step.key}`}
          onPress={() => onTry(step.say)}
          accessibilityRole="button"
          accessibilityLabel={step.say}
          style={({ pressed }) => ({
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
            paddingHorizontal: 10,
            borderRadius: radius.input,
            backgroundColor: pressed ? surface.fill : 'transparent',
          })}
        >
          <View style={{ width: 32, height: 32, borderRadius: radius.tile, backgroundColor: surface.fill, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={(ICONS[step.key] ?? 'spark') as IconName} size={16} color={ink.s3} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text token="bodyS" weight="600" numberOfLines={1}>
              {step.label}
            </Text>
            {/* The sentence itself, quietly: a tap teaches the phrasing.
                Not when it is the label over again — "Scan a card" twice is
                not a lesson, it is a stutter. */}
            {step.say === step.label ? null : (
              <Text token="caption" color={ink.s5} numberOfLines={1}>
                {step.say}
              </Text>
            )}
          </View>
        </Pressable>
      ))}

      <Pressable
        testID="assistant-intro-done"
        onPress={onDone}
        accessibilityRole="button"
        style={({ pressed }) => ({ paddingVertical: 10, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
      >
        <Text token="bodyS" weight="600" color={ink.s4}>
          {done}
        </Text>
      </Pressable>
    </View>
  );
}

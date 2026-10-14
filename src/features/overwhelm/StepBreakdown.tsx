/**
 * The list of steps under the current one: done, current, and still ahead.
 * SCREENS.md § 16.
 *
 * It is read-only on purpose — the spec says no editing — so it is three
 * states of a dot and three weights of text, nothing more.
 */
import { View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ink, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

export function StepBreakdown({
  steps,
  done,
  currentIndex,
}: {
  steps: readonly string[];
  done: ReadonlySet<number>;
  /** −1 once every step is finished. */
  currentIndex: number;
}) {
  const dir = useDirection();

  return (
    <View style={{ paddingHorizontal: 4 }}>
      {steps.map((step, i) => {
        const isDone = done.has(i);
        const isCurrent = i === currentIndex;
        return (
          <View
            key={step}
            testID={`overwhelm-step-${i}`}
            style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingVertical: 9 }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: isDone || isCurrent ? ink.solid : surface.trackOff,
                backgroundColor: isDone ? ink.solid : surface.white,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDone ? <Icon name="check" size={12} color={surface.white} strokeWidth={2.6} /> : null}
            </View>
            <Text
              token="bodyS"
              weight={isCurrent ? '600' : '400'}
              color={isDone ? ink.muted : isCurrent ? ink.base : ink.s5}
              style={isDone ? { textDecorationLine: 'line-through' } : undefined}
            >
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

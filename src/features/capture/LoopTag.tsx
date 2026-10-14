/**
 * The small label above a card that says it is a promise (something you owe)
 * or a wait (something you are owed), so it is clear why it is saved the way
 * it is.
 */
import { View } from 'react-native';

import type { Added } from '@/content/additions';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { typeColour } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import type { ParsedTask } from '@/lib/parse';

export function LoopTag({ kind, copy }: { kind: NonNullable<ParsedTask['kind']>; copy: Added['loop'] }) {
  const dir = useDirection();
  const waiting = kind === 'waiting';
  const colour = waiting ? typeColour.meeting : typeColour.reminder;
  return (
    <View
      testID={`loop-tag-${kind}`}
      style={{
        alignSelf: 'flex-start',
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 6,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: colour.bg,
      }}
    >
      <Icon name={waiting ? 'clock' : 'bell'} size={13} color={colour.fg} strokeWidth={2.1} />
      <Text token="caption" weight="600" color={colour.fg}>
        {waiting ? copy.waiting : copy.promise}
      </Text>
    </View>
  );
}

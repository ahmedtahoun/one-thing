/**
 * Sanad asking, once, whether it may keep the words.
 *
 * Written the way a consent card is written when it is written well: the
 * benefit in the title, two lines of what and who, equal weight on both
 * answers, and the detail one tap away rather than crammed in. The first
 * draft was a paragraph that read like a disclaimer, which is the surest way
 * to be agreed to without being read.
 *
 * Every account already sends the shape of what it is asked, with names and
 * numbers taken out on the phone. This asks for the other thing: the
 * sentence as written. It is the same question the switch in Settings →
 * Privacy asks, put where somebody will actually see it, after they have
 * used Sanad enough for it to mean something.
 *
 * Both answers are answers. "No thanks" is not a reminder to ask again
 * later — `ask-to-help.ts` keeps a no as firmly as a yes.
 * BUILD-REVIEW §2.118.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

export function HelpCard({
  title,
  body,
  link,
  yes,
  no,
  onYes,
  onNo,
  onLink,
}: {
  title: string;
  body: string;
  link: string;
  yes: string;
  no: string;
  onYes: () => void;
  onNo: () => void;
  onLink: () => void;
}) {
  const dir = useDirection();

  return (
    <View
      testID="assistant-help-ask"
      style={{ backgroundColor: surface.white, borderWidth: 1, borderColor: surface.line, borderRadius: radius.largeCard, padding: 16, gap: 10 }}
    >
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
        <Icon name="spark" size={16} color={ink.s3} strokeWidth={1.9} />
        <Text token="bodyS" weight="600">
          {title}
        </Text>
      </View>

      <Text token="caption" color={ink.s4}>
        {body}
      </Text>

      {/* Short enough to read, with the detail a tap away. A consent that
          fits on a card still has to be specific, and this is where the
          specifics live — the policy's own words. */}
      <Pressable testID="assistant-help-more" onPress={onLink} accessibilityRole="link" hitSlop={8} style={{ alignSelf: dir.isRTL ? 'flex-end' : 'flex-start' }}>
        <Text token="caption" weight="600" color={ink.s3} style={{ textDecorationLine: 'underline' }}>
          {link}
        </Text>
      </Pressable>

      <View style={{ flexDirection: dir.row, gap: 8, marginTop: 2 }}>
        <Pressable
          testID="assistant-help-yes"
          onPress={onYes}
          accessibilityRole="button"
          style={({ pressed }) => ({ height: 38, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: ink.base, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
        >
          <Text token="bodyS" weight="600" color={surface.white} numberOfLines={1}>
            {yes}
          </Text>
        </Pressable>
        <Pressable
          testID="assistant-help-no"
          onPress={onNo}
          accessibilityRole="button"
          style={({ pressed }) => ({ height: 38, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: surface.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <Text token="bodyS" weight="600" color={ink.s3} numberOfLines={1}>
            {no}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

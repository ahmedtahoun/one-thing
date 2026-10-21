/**
 * Sanad asking, once, whether it may keep the words.
 *
 * The card is deliberately almost nothing: the benefit, one line saying what
 * is shared, a tap through to where it is explained properly, and two answers
 * of equal weight.
 *
 * **There is no sheet, and that is the point.** For a while the detail sat
 * behind a tap in a sheet of its own, reading the privacy policy's "Helping
 * improve Sanad" section straight out of it — one text, shown in two places.
 * Two places was still one too many: the sheet was a second surface to lay
 * out, translate, screenshot and keep in step, carrying words already
 * published under the heading everybody knows to look under. So the tap goes
 * to the policy itself and lands on that section (`app/legal.tsx`,
 * `?at=help`), and the card is shorter for it.
 *
 * **One line cannot move behind the tap, and it is the one that says what is
 * shared.** Agreeing to "help improve Sanad" without being told that means
 * your sentences are kept is not agreeing to anything, and a consent that
 * hides what it collects is the pattern regulators have been fining — the
 * opposite of what the short card is for. BUILD-REVIEW §2.118, §2.119.
 *
 * The welcome's third step asks the same question in the same words, full
 * width, before the first conversation — `app/onboarding.tsx`. This card is
 * what asks whoever skipped it.
 */
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

export type HelpCopy = {
  title: string;
  body: string;
  link: string;
  yes: string;
  no: string;
};

export function HelpCard({ copy, onYes, onNo, onPolicy }: { copy: HelpCopy; onYes: () => void; onNo: () => void; onPolicy: () => void }) {
  const dir = useDirection();

  return (
    <View
      testID="assistant-help-ask"
      style={{ backgroundColor: surface.white, borderWidth: 1, borderColor: surface.line, borderRadius: radius.largeCard, padding: 16, gap: 10 }}
    >
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
        <Icon name="spark" size={16} color={ink.s3} strokeWidth={1.9} />
        <Text token="bodyS" weight="600">
          {copy.title}
        </Text>
      </View>

      <Text token="caption" color={ink.s4}>
        {copy.body}
      </Text>

      {/* To the policy's own section, not to a retelling of it.
          `flex-start` and not a mirrored pair: the writing direction is set
          on the root (`src/ui/Screen.tsx`), so the cross axis already starts
          at the right in Arabic. Choosing `flex-end` for RTL flipped it
          twice and put the link on the wrong side — which is what the new
          Arabic capture of the welcome showed. */}
      <Pressable testID="assistant-help-policy" onPress={onPolicy} accessibilityRole="link" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
        <Text token="caption" weight="600" color={ink.s3} style={{ textDecorationLine: 'underline' }}>
          {copy.link}
        </Text>
      </Pressable>

      {/* Two answers of equal weight: same height, same shape, neither of
          them a link away from the other. */}
      <View style={{ flexDirection: dir.row, gap: 8, marginTop: 2 }}>
        <Pressable
          testID="assistant-help-yes"
          onPress={onYes}
          accessibilityRole="button"
          style={({ pressed }) => ({ height: 40, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: ink.base, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
        >
          <Text token="bodyS" weight="600" color={surface.white} numberOfLines={1}>
            {copy.yes}
          </Text>
        </Pressable>
        <Pressable
          testID="assistant-help-no"
          onPress={onNo}
          accessibilityRole="button"
          style={({ pressed }) => ({ height: 40, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: surface.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <Text token="bodyS" weight="600" color={ink.s3} numberOfLines={1}>
            {copy.no}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * The badge in Settings that says which plan you are on.
 *
 * It used to be one flat pill asking `isPro`, which is true for `trial`,
 * `pro` and `pro_plus` alike — so a Pro+ subscriber and somebody four days
 * into a free trial both read "Pro". `planBadge` in
 * `src/policy/entitlements.ts` decides which of the four a plan wears; this
 * file only dresses it.
 *
 * **Why a gradient at all.** A flat pill reads as a label. Two stops and a
 * hairline of light along the top edge read as an object, which is the whole
 * difference between "your plan is Pro" and "you are a member". The cost is
 * one `LinearGradient` per badge, on a screen that already has two.
 *
 * The colours are in `tokens.planBadge`, and they are chosen by contrast
 * rather than by eye: white has to clear 4.5:1 against the *lightest* stop,
 * so Pro starts at `ink.solid` and goes darker rather than brightening.
 * `src/design/theme.test.ts` holds all of them in both themes.
 *
 * The height is deliberately the old pill's: 11px text, 5px of padding. The
 * profile row's name is a drift probe, and a taller badge would push it.
 */
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { added } from '@/content/additions';
import { ink, planBadge as tone, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { planBadge, type Plan } from '@/policy/entitlements';
import { Icon } from './Icon';
import { LTRText, Text } from './Text';

/**
 * A filled badge: the gradient, the lit top edge, a star and the word. The
 * star is the same `star` glyph the contact menu uses for a favourite —
 * nothing new was drawn for this.
 */
function Filled({ from, to, edge, fg, label, testID }: { from: string; to: string; edge: string; fg: string; label: string; testID: string }) {
  const dir = useDirection();
  return (
    <LinearGradient
      testID={testID}
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 4,
        paddingVertical: 5,
        paddingStart: 9,
        paddingEnd: 11,
        borderRadius: radius.pill,
        borderTopWidth: 1,
        borderTopColor: edge,
      }}
    >
      <Icon name="star" size={11} color={fg} filled />
      {/* `LTRText`, not `Text`: "Pro+" is Latin letters with a neutral "+"
          after them, and in an Arabic paragraph bidi resolves that trailing
          neutral to the other side — the badge rendered "+Pro". The name is
          a name in both languages, so the run is LTR in both. */}
      <LTRText token="micro" weight="700" color={fg}>
        {label}
      </LTRText>
    </LinearGradient>
  );
}

export function PlanBadge({ plan, testID = 'plan-badge' }: { plan: Plan; testID?: string }) {
  const { setx, lang } = useLanguage();
  const copy = added(lang).plan;
  const kind = planBadge(plan);

  if (kind === 'pro') {
    return <Filled from={tone.proTop} to={tone.proBottom} edge={tone.proEdge} fg={tone.proText} label={setx.st.pro} testID={`${testID}-pro`} />;
  }

  if (kind === 'plus') {
    return <Filled from={tone.plusTop} to={tone.plusBottom} edge={tone.plusEdge} fg={tone.plusText} label={copy.plus} testID={`${testID}-plus`} />;
  }

  // A trial is not a tier you bought, so it is not dressed like one: no
  // gradient, no star, an outline instead. It still has to look like it is
  // going somewhere, which the warm fill does and a grey one would not.
  if (kind === 'trial') {
    return (
      <View
        testID={`${testID}-trial`}
        style={{
          paddingVertical: 4,
          paddingHorizontal: 10,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: tone.trialLine,
          backgroundColor: tone.trialBg,
        }}
      >
        <Text token="micro" weight="700" color={tone.trialText}>
          {copy.trial}
        </Text>
      </View>
    );
  }

  return (
    <View testID={`${testID}-free`} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: surface.fill }}>
      <Text token="micro" weight="600" color={ink.s4}>
        {setx.st.free}
      </Text>
    </View>
  );
}

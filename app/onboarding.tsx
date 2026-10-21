/**
 * The welcome, shown once after Account setup.
 *
 * Three steps: an intro, then the two questions the app would otherwise
 * answer on the person's behalf — how to nudge, and which channels they
 * actually use — and then the one question it must not answer for them,
 * whether Sanad may keep what they write. Why three and not the two it was,
 * and why none of them is the prototype's dead third step:
 * `src/features/onboarding/steps.ts`.
 *
 * Every word on the first two steps was already in `strings.ts` in both
 * languages, ported from the handoff and never used. Nothing was written for
 * them but the heading over the channel tiles, which the prototype computed
 * inline. The third step borrows the question's own words from `meet.help*`,
 * so it reads the same here as on Sanad's card and in Settings.
 *
 * Skip leaves the defaults exactly as Account setup used to apply them, so
 * skipping costs nothing and changes nothing — and on the third step it
 * leaves the question *unanswered* rather than answered no, which is why
 * Sanad's card can still ask somebody who skipped. BUILD-REVIEW §2.119.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { added } from '@/content/additions';
import { asks, ctaKey, canTurnOff, next, pips, type Step } from '@/features/onboarding/steps';
import { LogoMark } from '@/design/BrandMarks';
import { TYPE_ICON, type IconName } from '@/design/icon-paths';
import { ink, radius, space, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useAssistantHelp } from '@/lib/assistant-help';
import { useHelpSanad } from '@/lib/help-sanad';
import { usePrefs } from '@/lib/prefs';
import { useOnboarded } from '@/lib/onboarded';
import type { Channel, NudgeStyle } from '@/lib/model-types';
import { BalancedText } from '@/ui/BalancedText';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function Onboarding() {
  const { t, lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).onboarding;
  const help = added(lang).meet;
  const { prefs, setPrefs } = usePrefs();
  const { markOnboarded } = useOnboarded();
  // The single consent path — preference, consent row, and the forget
  // request if it ever goes off again. src/lib/help-sanad.ts.
  const helpSanad = useHelpSanad();
  const asked = useAssistantHelp();
  // `?step=1` opens the second step directly. The capture harness needs it
  // to shoot a screen that is otherwise two taps in, and so does anyone
  // reviewing the Arabic of it.
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState<Step>(params.step === '1' ? 1 : params.step === '2' ? 2 : 0);

  const leave = () => {
    markOnboarded();
    router.replace('/today');
  };

  const forward = () => {
    const after = next(step);
    if (after === null) return leave();
    setStep(after);
  };

  /**
   * Either answer to the third step is an answer: it is recorded as its own
   * consent row carrying the policy version, a no as firmly as a yes, and
   * marked answered so nothing asks again. Skip is not an answer and does
   * neither.
   */
  const answer = (granted: boolean) => {
    helpSanad.set(granted, 'welcome');
    asked.decide();
    leave();
  };

  const toggle = (key: Channel) => {
    if (!canTurnOff(prefs.channels, key)) return;
    setPrefs({ channels: { ...prefs.channels, [key]: !prefs.channels[key] } });
  };

  return (
    <Screen paddingX={space.screenXWide} paddingTop={16} paddingBottom={44} style={{ gap: 24 }}>
      <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: dir.row, gap: 5 }}>
          {pips(step).map((p, i) => (
            <View
              key={i}
              testID={`onboarding-pip-${i}${p.active ? '-on' : ''}`}
              style={{ height: 6, width: p.width, borderRadius: 3, backgroundColor: p.active ? ink.base : surface.trackOff }}
            />
          ))}
        </View>
        <Pressable testID="onboarding-skip" onPress={leave} accessibilityRole="button" hitSlop={10} style={{ paddingVertical: 8 }}>
          <Text token="bodyS" color={ink.s4}>
            {t.skip}
          </Text>
        </Pressable>
      </View>

      {step === 0 ? (
        <View testID="onboarding-intro" style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
          <LogoMark size={72} />
          <View style={{ gap: 12 }}>
            <Text token="micro" color={ink.s4} style={{ letterSpacing: 1.9 }}>
              {t.ob1_k}
            </Text>
            {/* README § Typography asks for balanced wrapping on a hero
                title, and the prototype sets text-wrap:balance here: it
                reads "Your day, / under control.", not "Your day, under /
                control." */}
            <BalancedText token="h1" size={34} lh={39}>
              {t.ob1_t}
            </BalancedText>
            <Text token="body" size={16} lh={25} color={ink.s3}>
              {t.ob1_s}
            </Text>
          </View>
        </View>
      ) : step === 1 ? (
        <View testID="onboarding-choices" style={{ flex: 1, gap: 22, paddingTop: 24 }}>
          <View style={{ gap: 8 }}>
            <Text token="h1" size={28} lh={34}>
              {t.ob2_t}
            </Text>
            <Text token="bodyS" color={ink.s3}>
              {t.ob2_s}
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            {t.nudges.map(([key, label, sub]) => {
              const on = prefs.nudgeStyle === key;
              return (
                <Pressable
                  key={key}
                  testID={`onboarding-nudge-${key}`}
                  onPress={() => setPrefs({ nudgeStyle: key as NudgeStyle })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={{
                    flexDirection: dir.row,
                    gap: 14,
                    alignItems: 'center',
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: on ? ink.base : surface.line,
                    paddingVertical: 13,
                    paddingHorizontal: 16,
                  }}
                >
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: ink.base, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ink.base }} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text token="body" size={16} weight="600">
                      {label}
                    </Text>
                    <Text token="caption" color={ink.s4}>
                      {sub}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 10, paddingTop: 6 }}>
            <Text token="bodyS" weight="600">
              {copy.channels}
            </Text>
            <View style={{ flexDirection: dir.row, gap: 8 }}>
              {t.chans.map(([raw, label]) => {
                const key = raw as Channel;
                const on = prefs.channels[key];
                const tint = typeColour[key];
                return (
                  <Pressable
                    key={key}
                    testID={`onboarding-channel-${key}${on ? '-on' : ''}`}
                    onPress={() => toggle(key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      gap: 8,
                      paddingTop: 16,
                      paddingBottom: 12,
                      paddingHorizontal: 6,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: on ? ink.base : surface.line,
                      backgroundColor: on ? surface.white : surface.fill2,
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}>
                      {/* TYPE_ICON, not the channel name: the icons are
                          `phone`, `mail` and `msg`. Passing the channel
                          drew an empty tile, because `Icon` renders null
                          for a name it does not know. */}
                      <Icon name={TYPE_ICON[key] as IconName} size={22} color={tint.fg} strokeWidth={1.9} />
                    </View>
                    <Text token="caption" weight="500">
                      {label}
                    </Text>
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        ...(dir.isRTL ? { left: 8 } : { right: 8 }),
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: on ? ink.base : surface.line,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on ? <Icon name="check" size={11} color={surface.white} strokeWidth={2.6} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Text token="caption" color={ink.s4} lh={20}>
              {copy.channelsSub}
            </Text>
          </View>
        </View>
      ) : (
        /* The one question on this screen whose answer is the person's and
           not a preference: what is shared, what is not, that it can be
           changed, and where the whole of it is written. */
        <View testID="onboarding-help" style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
          <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: surface.fill2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="spark" size={24} color={ink.base} strokeWidth={1.9} />
          </View>

          <View style={{ gap: 10 }}>
            <Text token="h1" size={28} lh={34}>
              {help.helpT}
            </Text>
            <Text token="body" size={16} lh={25} color={ink.s3}>
              {help.helpB}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Text token="bodyS" color={ink.s3} lh={22.4}>
              {help.helpWhen}
            </Text>
            <Text token="bodyS" color={ink.s4} lh={22.4}>
              {help.helpLater}
            </Text>
          </View>

          {/* The whole of it, where it is published: the policy's own
              section. Pushed, so coming back lands on this step again. */}
          <Pressable
            testID="onboarding-help-policy"
            onPress={() => router.push('/legal?tab=privacy&at=help')}
            accessibilityRole="link"
            hitSlop={8}
            // The root carries the writing direction, so the cross axis
            // already starts on the right in Arabic — see HelpCard.
            style={{ alignSelf: 'flex-start' }}
          >
            <Text token="bodyS" weight="600" color={ink.s2} style={{ textDecorationLine: 'underline' }}>
              {help.helpLink}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Ink, not `Button`'s primary green: the prototype draws this CTA
          #0b0b0b, the same call OneThingCard's Lock In makes.
          The step that asks has no single CTA — two answers of the same
          size instead, because a question with one button is not a
          question. Stacked rather than side by side: "Help improve Sanad"
          and "Don't help" do not fit half a narrow phone, and shrinking
          one of them would be weighting it. */}
      {asks(step) ? (
        <View style={{ gap: 10 }}>
          <Button
            testID="onboarding-help-yes"
            label={help.helpYes}
            onPress={() => answer(true)}
            style={{ height: 56, borderRadius: radius.pill, backgroundColor: ink.base }}
          />
          <Button
            testID="onboarding-help-no"
            label={help.helpNo}
            variant="outline"
            onPress={() => answer(false)}
            style={{ height: 56, borderRadius: radius.pill }}
          />
        </View>
      ) : (
        <Button
          testID="onboarding-next"
          label={t[ctaKey(step)]}
          onPress={forward}
          style={{ height: 56, borderRadius: radius.pill, backgroundColor: ink.base }}
        />
      )}
    </Screen>
  );
}

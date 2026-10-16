/**
 * The welcome, shown once after Account setup.
 *
 * Two steps, to SCREENS.md § 04 and the prototype's own markup: an intro,
 * then the two questions the app would otherwise answer on the person's
 * behalf — how to nudge, and which channels they actually use. Why two and
 * not the three the prototype's dead markup holds, and why this now runs on
 * first use when the handoff skipped it: `src/features/onboarding/steps.ts`.
 *
 * Every word here was already in `strings.ts` in both languages, ported
 * from the handoff and never used. Nothing was written for this screen but
 * the heading over the channel tiles, which the prototype computed inline.
 *
 * Skip leaves the defaults exactly as Account setup used to apply them, so
 * skipping costs nothing and changes nothing.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { added } from '@/content/additions';
import { ctaKey, canTurnOff, next, pips, type Step } from '@/features/onboarding/steps';
import { LogoMark } from '@/design/BrandMarks';
import { TYPE_ICON, type IconName } from '@/design/icon-paths';
import { ink, radius, space, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
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
  const { prefs, setPrefs } = usePrefs();
  const { markOnboarded } = useOnboarded();
  // `?step=1` opens the second step directly. The capture harness needs it
  // to shoot a screen that is otherwise two taps in, and so does anyone
  // reviewing the Arabic of it.
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState<Step>(params.step === '1' ? 1 : 0);

  const leave = () => {
    markOnboarded();
    router.replace('/today');
  };

  const forward = () => {
    const after = next(step);
    if (after === null) return leave();
    setStep(after);
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
      ) : (
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
      )}

      {/* Ink, not `Button`'s primary green: the prototype draws this CTA
          #0b0b0b, the same call OneThingCard's Lock In makes. */}
      <Button
        testID="onboarding-next"
        label={t[ctaKey(step)]}
        onPress={forward}
        style={{ height: 56, borderRadius: radius.pill, backgroundColor: ink.base }}
      />
    </Screen>
  );
}

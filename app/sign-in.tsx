/**
 * 01 · Sign in — authenticate and record consent. SCREENS.md § 01.
 *
 * The two store rules this screen carries: Sign in with Apple is offered first
 * and with equal prominence, and Terms consent is required while marketing
 * consent is separate, optional and unticked by default — each stored with its
 * own timestamp and policy version.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { BalancedText } from '@/ui/BalancedText';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast } from '@/ui/Toast';
import { AppleMark, GoogleMark, LogoMark } from '@/design/BrandMarks';
import { ink, space, status } from '@/design/tokens';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useSignUpDraft } from '@/lib/signup-draft';

export default function SignIn() {
  const { acc } = useLanguage();
  const si = acc.si;
  const draft = useSignUpDraft();

  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [showError, setShowError] = useState(false);

  /**
   * Both buttons stay pressable while Terms are unticked — they only look
   * disabled. Tapping one is how the user is told why nothing happened.
   */
  const start = (provider: 'apple' | 'google') => {
    if (!terms) {
      setShowError(true);
      return;
    }
    setShowError(false);
    draft.begin({ provider, marketingOptIn: marketing });
    router.push('/setup');
  };

  return (
    <>
      <Screen paddingX={space.screenXWide} paddingTop={16} paddingBottom={40} style={{ gap: 22 }}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
          <LogoMark />
          <View style={{ gap: 10 }}>
            <BalancedText token="display">{si.title}</BalancedText>
            <Text token="bodyL" color={ink.s3}>
              {si.sub}
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Checkbox testID="consent-terms" checked={terms} onToggle={() => setTerms((v) => !v)}>
            {/* Both consent rows set 1.45 in the prototype rather than taking
                the font's own line height. */}
            <Text token="bodyS" lh={20.3} color={ink.s2}>
              {si.terms1}{' '}
              <Text
                token="bodyS"
                weight="600"
                // Links open the Legal screen. They must not toggle the box, so
                // the press is stopped here rather than bubbling to the row.
                onPress={(e) => {
                  e.stopPropagation();
                  router.push('/legal?tab=terms');
                }}
                style={{ textDecorationLine: 'underline' }}
              >
                {si.termsL}
              </Text>{' '}
              {si.and}{' '}
              <Text
                token="bodyS"
                weight="600"
                onPress={(e) => {
                  e.stopPropagation();
                  router.push('/legal?tab=privacy');
                }}
                style={{ textDecorationLine: 'underline' }}
              >
                {si.privL}
              </Text>
              {si.terms2}
            </Text>
          </Checkbox>

          <Checkbox testID="consent-marketing" checked={marketing} onToggle={() => setMarketing((v) => !v)}>
            <Text token="bodyS" lh={20.3} color={ink.s2}>
              {si.mkt} <Text token="bodyS" lh={20.3} color={ink.s5}>{si.opt}</Text>
            </Text>
          </Checkbox>

          {showError ? (
            <Text token="caption" color={status.dangerFg} testID="consent-error">
              {si.err}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          <Button
            testID="sign-in-apple"
            label={si.apple}
            dimmed={!terms}
            icon={<AppleMark />}
            onPress={() => start('apple')}
          />
          <Button
            testID="sign-in-google"
            label={si.google}
            variant="outline"
            dimmed={!terms}
            icon={<GoogleMark />}
            onPress={() => start('google')}
          />
          <Text token="micro" color={ink.s5} align="center">
            {si.note}
          </Text>
        </View>
      </Screen>
      {/* Signing out and deleting the account both land here with a toast. */}
      <Toast />
    </>
  );
}

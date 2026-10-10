/**
 * 02 · Account setup — one screen, name required, job optional. SCREENS.md § 02.
 *
 * Deliberately one screen with no step dots and no phone field: SCREENS.md,
 * screenshots/app/02-account-setup.png and the prototype's own render all
 * agree on that. (The Store Readiness Audit's prose describes an older
 * three-step version — see BUILD-REVIEW.md §2.7.)
 */
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ink, space } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { track } from '@/lib/analytics/track';
import { recordConsent } from '@/lib/consent';
import { usePrefs } from '@/lib/prefs';
import { useSession } from '@/lib/session';
import { useSignUpDraft } from '@/lib/signup-draft';

/** First word of the typed name, used in the CTA and everywhere after. */
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export default function Setup() {
  const { acc, a11y } = useLanguage();
  const dir = useDirection();
  const su = acc.su;
  const { signIn } = useSession();
  const draft = useSignUpDraft();
  const { setPrefs } = usePrefs();

  const [name, setName] = useState('');
  const [job, setJob] = useState('');
  const [saving, setSaving] = useState(false);

  const first = firstNameOf(name);
  const ready = name.trim().length > 0;

  // "Continue" until a name is typed, then "Let's go, {first name}".
  const cta = useMemo(
    () => (ready ? su.done.replace('{n}', first) : su.cont),
    [ready, su.done, su.cont, first]
  );

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);

    const d = draft.read();
    const userId = `local_${Date.now()}`;

    await signIn({
      userId,
      name: name.trim(),
      firstName: first,
      jobTitle: job.trim() || undefined,
      authProvider: d?.provider ?? 'apple',
    });

    if (d) {
      // Settings' "Tips & offers" toggle starts where sign-in left it.
      setPrefs({ marketing: d.marketingOptIn });
      // Kept on the device until the sync has written it (src/lib/consent.ts).
      await recordConsent(d.consent);
      draft.clear();
    }

    track({ name: 'setup_done' });

    // Defaults applied silently (SCREENS.md § 02): reminder style Gentle,
    // channels all on, focus 45 min — these are the column defaults in
    // supabase/migrations/0001_init.sql, so nothing is written here.
    router.replace('/today');
  };

  return (
    <Screen paddingX={space.screenXWide} paddingTop={16} paddingBottom={40} scroll style={{ gap: 24 }}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={a11y.back}
        hitSlop={12}
        style={{ paddingVertical: 6, alignSelf: 'flex-start' }}
      >
        <Icon name="back" size={24} strokeWidth={2} />
      </Pressable>

      <View style={{ gap: 10, paddingTop: 12 }}>
        <Text token="bodyS" color={ink.s4}>
          {su.hello[0]}
        </Text>
        <Text token="h1" size={30} lh={36}>
          {su.q[0]}
        </Text>
        <Text token="body" color={ink.s3}>
          {su.sub[0]}
        </Text>
      </View>

      <Field
        testID="setup-name"
        size="hero"
        value={name}
        onChangeText={setName}
        placeholder={su.namePh}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <View style={{ gap: 10, paddingTop: 6 }}>
        <Text token="bodyS" weight="500">
          {su.q[2]} {acc.si.opt}
        </Text>
        <Field testID="setup-job" size="hero" value={job} onChangeText={setJob} placeholder={su.jobPh} />
        <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8 }}>
          {su.jobs.map((j) => (
            <Chip key={j} label={j} selected={job === j} onPress={() => setJob(job === j ? '' : j)} />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <Button testID="setup-cta" label={cta} disabled={!ready} loading={saving} onPress={submit} />
    </Screen>
  );
}

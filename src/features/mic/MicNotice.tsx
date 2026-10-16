/**
 * What the microphone is for, said before it is asked for.
 *
 * Google requires a prominent disclosure in the app ahead of the system's
 * own permission prompt, in wording that agrees with the privacy policy;
 * `./notice.ts` says more, and `./mic-notice.test.ts` holds the two
 * sentences together. Apple does not require it, and it is shown on both
 * phones anyway — one app, and an explanation before a prompt is what makes
 * people grant it.
 *
 * It is a sheet rather than a screen because it interrupts a tap: the
 * person reached for the mic, and this is the one thing standing between
 * that and recording. "Not now" records nothing and leaves them in the
 * field they could already type into.
 */
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { added } from '@/content/additions';
import { ink, settingsTile, surface } from '@/design/tokens';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useMicConsent } from '@/lib/mic-consent';
import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { needsMicNotice } from './notice';

const SHEET_PADDING = { paddingTop: 24, paddingHorizontal: 22, paddingBottom: 40 } as const;

/**
 * The gate the three screens with a mic share.
 *
 * `ask` takes what tapping the mic would have done. Either it runs now, or
 * it is held until the sheet is agreed to — held in a ref rather than
 * state, because it is handed in at the moment of the tap and must not be
 * a render behind the screen it came from.
 */
export function useMicGate(): {
  asking: boolean;
  ask: (run: () => void) => void;
  allow: () => void;
  dismiss: () => void;
} {
  const { agreed, ready, agree } = useMicConsent();
  const [asking, setAsking] = useState(false);
  const held = useRef<(() => void) | null>(null);

  return {
    asking,
    ask: (run) => {
      if (!needsMicNotice(agreed, ready)) return run();
      held.current = run;
      setAsking(true);
    },
    allow: () => {
      setAsking(false);
      agree();
      const run = held.current;
      held.current = null;
      run?.();
    },
    dismiss: () => {
      setAsking(false);
      held.current = null;
    },
  };
}

export function MicNotice({ open, onAllow, onClose }: { open: boolean; onAllow: () => void; onClose: () => void }) {
  const { lang } = useLanguage();
  const copy = added(lang).micNotice;

  return (
    <Sheet testID="mic-notice" open={open} onClose={onClose} handle={false} padding={SHEET_PADDING} gap={16}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: settingsTile.privacy.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="mic" size={24} color={settingsTile.privacy.fg} strokeWidth={1.9} />
      </View>
      <View style={{ gap: 8 }}>
        <Text token="h3">{copy.title}</Text>
        {/* The policy's own paragraph. Not paraphrased on purpose. */}
        <Text token="bodyS" lh={21.7} color={ink.s3}>
          {copy.body}
        </Text>
      </View>
      <Text token="micro" lh={18} color={ink.s5}>
        {copy.background}
      </Text>
      <Pressable
        testID="mic-notice-allow"
        onPress={onAllow}
        accessibilityRole="button"
        style={{ height: 54, borderRadius: 27, backgroundColor: ink.base, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text token="bodyL" weight="600" color={surface.white} align="center">
          {copy.allow}
        </Text>
      </Pressable>
      <Pressable
        testID="mic-notice-deny"
        onPress={onClose}
        accessibilityRole="button"
        style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text token="body" align="center">
          {copy.deny}
        </Text>
      </Pressable>
    </Sheet>
  );
}

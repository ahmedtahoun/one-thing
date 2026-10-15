/**
 * The viewfinder for a stack of cards: the camera, the counter, the shutter,
 * and the way through to the review.
 *
 * It is a file of its own, and required rather than imported
 * (app/scan-many.tsx), for one reason: expo-camera's web build fetches a QR
 * decoder from a public CDN the moment the module is evaluated. Nothing in
 * this app scans QR codes, the web build cannot read a card at all, and a
 * screen quietly calling a third party is not something to ship after
 * publishing a policy that says what leaves the device. Required behind the
 * reader check, the module is never evaluated where it cannot work, so the
 * request is never made.
 *
 * It holds no state of its own beyond the camera. The batch belongs to the
 * screen, which is still reading it while this is open.
 */
import { useRef } from 'react';
import { Image, Pressable, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import type { Added } from '@/content/additions';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ink, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

/** Over the viewfinder, where the screen's own tokens would vanish. */
const OVER = { pill: 'rgba(0,0,0,0.45)', ring: 'rgba(255,255,255,0.6)', hint: 'rgba(255,255,255,0.75)', dim: 'rgba(255,255,255,0.35)', slot: 'rgba(255,255,255,0.15)' };

export type CameraStageProps = {
  copy: Added['many'];
  /** How many shots are in the batch, and how many the reader has not finished. */
  count: number;
  reading: number;
  /** The last shot, as the thumbnail beside the shutter. */
  lastUri?: string;
  onShot: (uri: string) => void;
  onReview: () => void;
  onClose: () => void;
  /** The screen's own header, so the two gates look like one screen. */
  header: (title: string, onBack: () => void) => React.ReactNode;
};

export function CameraStage({ copy, count, reading, lastUri, onShot, onReview, onClose, header }: CameraStageProps) {
  const dir = useDirection();
  const { a11y } = useLanguage();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    return (
      <Screen scroll paddingBottom={40} style={{ gap: 16 }}>
        {header(copy.title, onClose)}
        <View style={{ gap: 16, paddingTop: 30 }}>
          <View style={{ alignSelf: 'center', width: 76, height: 76, borderRadius: 24, backgroundColor: surface.fill, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="cards" size={32} strokeWidth={1.8} />
          </View>
          <Text testID="many-permission" token="body" color={ink.s3} align="center">
            {permission && !permission.canAskAgain ? copy.cameraOff : copy.permission}
          </Text>
          {permission?.canAskAgain === false ? null : (
            <Button testID="many-allow" label={copy.allow} onPress={() => void requestPermission()} />
          )}
        </View>
      </Screen>
    );
  }

  const shoot = async () => {
    const photo = await camera.current?.takePictureAsync({ quality: 0.6, skipProcessing: true }).catch(() => null);
    if (photo?.uri) onShot(photo.uri);
  };

  return (
    <View testID="many-camera" style={{ flex: 1, backgroundColor: '#000000' }}>
      <CameraView ref={camera} style={{ flex: 1 }} facing="back" />

      <View style={{ position: 'absolute', top: 54, left: 20, right: 20, flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable testID="many-stop" onPress={onClose} accessibilityRole="button" accessibilityLabel={a11y.back} hitSlop={12}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: OVER.pill, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={20} color={surface.white} strokeWidth={2} />
          </View>
        </Pressable>
        <View testID="many-counter" style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: OVER.pill, alignItems: 'center', justifyContent: 'center' }}>
          <Text token="bodyS" weight="600" color={surface.white}>
            {copy.counter.replace('{n}', String(count))}
          </Text>
        </View>
      </View>

      <View style={{ position: 'absolute', bottom: 46, left: 20, right: 20, gap: 14 }}>
        <Text testID="many-hint" token="caption" color={OVER.hint} align="center">
          {count === 0 ? copy.hint : reading > 0 ? copy.reading.replace('{n}', String(reading)) : copy.hint}
        </Text>
        <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 54, height: 54, borderRadius: 14, overflow: 'hidden', backgroundColor: OVER.slot }}>
            {lastUri ? <Image source={{ uri: lastUri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}
          </View>
          <Pressable
            testID="many-shutter"
            onPress={() => void shoot()}
            accessibilityRole="button"
            accessibilityLabel={copy.shutter}
            style={({ pressed }) => ({
              width: 74,
              height: 74,
              borderRadius: 37,
              borderWidth: 4,
              borderColor: OVER.ring,
              backgroundColor: surface.white,
              transform: [{ scale: pressed ? 0.93 : 1 }],
            })}
          />
          <Pressable
            testID="many-review"
            disabled={count === 0}
            onPress={onReview}
            accessibilityRole="button"
            accessibilityState={{ disabled: count === 0 }}
            style={{ width: 54, alignItems: 'center' }}
          >
            <Text token="bodyS" weight="700" color={count === 0 ? OVER.dim : surface.white} align="center">
              {copy.review.replace('{n}', String(count))}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

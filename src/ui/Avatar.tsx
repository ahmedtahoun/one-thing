/**
 * A person's picture: their photo if they have one, else their initials on
 * their own colour. An optional small badge on the lower corner shows how you
 * last reached them, in that channel's colour.
 */
import { Image, View } from 'react-native';

import { avatarColour } from '@/features/people/avatar-colour';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TYPE_ICON, type IconName } from '@/design/icon-paths';
import { surface, typeColour, type TaskType } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import { initials, type Channel } from '@/lib/model-types';
import { usePhotos } from '@/lib/photos';

export function Avatar({
  name,
  contactId,
  size = 48,
  channel = null,
}: {
  name: string;
  contactId?: string;
  size?: number;
  /** How they were last reached; draws the badge. */
  channel?: Channel | null;
}) {
  const dir = useDirection();
  const photos = usePhotos();
  const uri = contactId ? photos.get(contactId) : undefined;
  const colour = avatarColour(name);
  const badge = Math.max(18, Math.round(size * 0.4));

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: surface.fill }} />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colour.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text size={Math.round(size * 0.36)} weight="600" color={colour.fg} align="center">
            {initials(name) || '?'}
          </Text>
        </View>
      )}
      {channel ? (
        // A physical side, not `end`: React Native Web resolves `end` from the
        // app-wide direction, not the one set on the screen.
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            ...(dir.isRTL ? { left: -2 } : { right: -2 }),
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            borderWidth: 2,
            borderColor: surface.white,
            backgroundColor: typeColour[channel].fg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={TYPE_ICON[channel as TaskType] as IconName} size={Math.round(badge * 0.55)} color={surface.white} strokeWidth={2.2} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Where a person's picture comes from: the camera, the photo library, or none.
 * The picture is copied into the app and stays on this phone.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { added } from '@/content/additions';
import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { type IconName } from '@/design/icon-paths';
import { ink, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { removePhoto, setPhoto } from '@/lib/photos';

const OPTIONS = { mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.5 };

export function PhotoSheet({
  open,
  contactId,
  hasPhoto,
  onClose,
}: {
  open: boolean;
  contactId: string;
  hasPhoto: boolean;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).photo;
  const [denied, setDenied] = useState(false);

  const keep = async (result: ImagePicker.ImagePickerResult) => {
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) await setPhoto(contactId, uri);
    onClose();
  };
  const take = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
    if (!permission?.granted) return setDenied(true);
    setDenied(false);
    await keep(await ImagePicker.launchCameraAsync(OPTIONS));
  };
  const choose = async () => keep(await ImagePicker.launchImageLibraryAsync(OPTIONS));
  const remove = async () => {
    await removePhoto(contactId);
    onClose();
  };

  const row = (testID: string, icon: IconName, label: string, onPress: () => void, danger = false) => (
    <Pressable
      key={testID}
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 14,
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 16,
        backgroundColor: pressed ? surface.fill : 'transparent',
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: surface.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={danger ? status.danger : ink.base} strokeWidth={1.9} />
      </View>
      <Text token="body" weight="600" color={danger ? status.danger : ink.base}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Sheet open={open} onClose={onClose} testID="photo-sheet" padding={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: 30 }} gap={4}>
      <Text token="title" style={{ paddingVertical: 10, paddingHorizontal: 6 }}>
        {copy.title}
      </Text>
      {row('photo-take', 'camera', copy.take, take)}
      {row('photo-choose', 'users', copy.choose, choose)}
      {hasPhoto ? row('photo-remove', 'trash', copy.remove, remove, true) : null}
      {denied ? (
        <Text token="caption" color={ink.s4} style={{ paddingHorizontal: 6, paddingTop: 6 }}>
          {copy.denied}
        </Text>
      ) : null}
    </Sheet>
  );
}

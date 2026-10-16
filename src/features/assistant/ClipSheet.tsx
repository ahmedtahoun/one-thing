/**
 * The paperclip's three choices: a card through the camera, a card already in
 * the photo library, or a file of people.
 *
 * The same three the Assistant opens when they are asked for in words
 * (src/lib/parse/attach.ts), so there is one list and it reads the same way
 * however it was reached. Each sub-line says where the reading happens,
 * because "never uploaded" is the thing a person wants to know before handing
 * over an address book.
 */
import { Pressable, View } from 'react-native';

import type { Added } from '@/content/additions';
import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { type IconName } from '@/design/icon-paths';
import { ink, surface, typeColour } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import type { Attach } from '@/lib/parse/attach';

export function ClipSheet({
  open,
  copy,
  onClose,
  onChoose,
}: {
  open: boolean;
  copy: Added['clip'];
  onClose: () => void;
  onChoose: (choice: Attach) => void;
}) {
  const dir = useDirection();
  const rows: { key: Attach; label: string; sub: string; icon: IconName; fg: string; bg: string }[] = [
    { key: 'scan', label: copy.scan, sub: copy.scanSub, icon: 'camera', fg: typeColour.webinar.fg, bg: typeColour.webinar.bg },
    { key: 'photo', label: copy.photo, sub: copy.photoSub, icon: 'cards', fg: typeColour.meeting.fg, bg: typeColour.meeting.bg },
    { key: 'file', label: copy.file, sub: copy.fileSub, icon: 'list', fg: typeColour.course.fg, bg: typeColour.course.bg },
  ];

  return (
    <Sheet open={open} onClose={onClose} testID="clip-sheet" padding={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: 30 }} gap={4}>
      <Text token="title" style={{ paddingVertical: 10, paddingHorizontal: 6 }}>
        {copy.title}
      </Text>
      {rows.map((row) => (
        <Pressable
          key={row.key}
          testID={`clip-${row.key}`}
          onPress={() => {
            onClose();
            onChoose(row.key);
          }}
          accessibilityRole="button"
          accessibilityLabel={row.label}
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
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: row.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={row.icon} size={20} color={row.fg} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text token="body" weight="600" numberOfLines={1}>
              {row.label}
            </Text>
            <Text token="micro" color={ink.s4} numberOfLines={1}>
              {row.sub}
            </Text>
          </View>
        </Pressable>
      ))}
    </Sheet>
  );
}

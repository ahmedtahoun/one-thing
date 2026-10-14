/**
 * People's one "Add" button: everything that puts a person in the list, in
 * one sheet instead of a row of buttons — type one in, scan a business card,
 * import a file, or pick from the phone.
 */
import { Pressable, View } from 'react-native';

import type { Added } from '@/content/additions';
import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { type IconName } from '@/design/icon-paths';
import { ink, surface, typeColour } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

export type AddChoice = 'new' | 'scan' | 'file' | 'phone';

export function AddMenu({
  open,
  copy,
  canPickFromPhone,
  onClose,
  onChoose,
}: {
  open: boolean;
  copy: Added['addPeople'];
  /** The phone's own contact picker exists on phones only. */
  canPickFromPhone: boolean;
  onClose: () => void;
  onChoose: (choice: AddChoice) => void;
}) {
  const dir = useDirection();
  const rows: { key: AddChoice; label: string; sub: string; icon: IconName; fg: string; bg: string }[] = [
    { key: 'new', label: copy.newContact, sub: copy.newSub, icon: 'plus', fg: ink.base, bg: surface.fill },
    { key: 'scan', label: copy.scan, sub: copy.scanSub, icon: 'screen', fg: typeColour.webinar.fg, bg: typeColour.webinar.bg },
    { key: 'file', label: copy.file, sub: copy.fileSub, icon: 'list', fg: typeColour.course.fg, bg: typeColour.course.bg },
    ...(canPickFromPhone
      ? [{ key: 'phone' as const, label: copy.phone, sub: copy.phoneSub, icon: 'users' as IconName, fg: typeColour.email.fg, bg: typeColour.email.bg }]
      : []),
  ];

  return (
    <Sheet open={open} onClose={onClose} testID="add-menu" padding={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: 30 }} gap={4}>
      <Text token="title" style={{ paddingVertical: 10, paddingHorizontal: 6 }}>
        {copy.title}
      </Text>
      {rows.map((row) => (
        <Pressable
          key={row.key}
          testID={`add-${row.key}`}
          onPress={() => onChoose(row.key)}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          style={({ pressed }) => ({
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 14,
            paddingVertical: 8,
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

/**
 * What opens when you tap a person: a sheet of colour-coded ways to reach
 * them — WhatsApp green, email blue, call orange, a meeting teal — then
 * favorite and their profile. The colours are the ones every task type
 * already wears, so a person's menu looks like the rest of the app.
 */
import { Pressable, View } from 'react-native';

import type { Added } from '@/content/additions';
import { canReach, primaryChannel } from '@/features/people/channel';
import { Avatar } from '@/ui/Avatar';
import { ForwardChevron } from '@/ui/ForwardChevron';
import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TYPE_ICON, type IconName } from '@/design/icon-paths';
import { ink, surface, typeColour, type TaskType } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import type { Channel, Contact } from '@/lib/model-types';

type Row = {
  key: string;
  testID: string;
  label: string;
  sub: string;
  icon: IconName;
  fg: string;
  bg: string;
  dim?: boolean;
  tag?: string;
  onPress: () => void;
};

export function ContactMenu({
  contact,
  favorite,
  copy,
  onClose,
  onStart,
  onMeeting,
  onProfile,
  onFavorite,
}: {
  contact: Contact | null;
  favorite: boolean;
  copy: Added['menu'];
  onClose: () => void;
  onStart: (contact: Contact, channel: Channel) => void;
  onMeeting: (contact: Contact) => void;
  onProfile: (contact: Contact) => void;
  onFavorite: (contact: Contact) => void;
}) {
  const { t } = useLanguage();
  const dir = useDirection();
  if (!contact) return <Sheet open={false} onClose={onClose} padding={{}} gap={0}>{null}</Sheet>;

  const usual = primaryChannel(contact);
  const number = `${contact.dial ?? ''} ${contact.phone ?? ''}`.trim();
  const channel = (type: Channel): Row => {
    const ok = canReach(contact, type);
    const sub = type === 'email' ? (ok ? contact.email ?? '' : copy.addEmail) : ok ? number : copy.addNumber;
    return {
      key: type,
      testID: `menu-${type}`,
      label: t.types[type],
      sub,
      icon: TYPE_ICON[type as TaskType] as IconName,
      fg: typeColour[type].fg,
      bg: typeColour[type].bg,
      dim: !ok,
      tag: usual === type ? copy.usual : undefined,
      onPress: () => onStart(contact, type),
    };
  };
  const rows: Row[] = [
    channel('whatsapp'),
    channel('email'),
    channel('call'),
    {
      key: 'meeting',
      testID: 'menu-meeting',
      label: copy.meeting,
      sub: copy.meetingSub,
      icon: TYPE_ICON.meeting as IconName,
      fg: typeColour.meeting.fg,
      bg: typeColour.meeting.bg,
      onPress: () => onMeeting(contact),
    },
  ];
  const line = (row: Row) => (
    <Pressable
      key={row.key}
      testID={row.testID}
      onPress={row.onPress}
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
        opacity: row.dim ? 0.6 : 1,
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: row.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={row.icon} size={20} color={row.fg} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text token="body" weight="600" numberOfLines={1}>
          {row.label}
        </Text>
        {row.sub ? (
          <Text token="micro" color={ink.s4} numberOfLines={1} style={{ writingDirection: 'ltr', textAlign: dir.textAlign }}>
            {row.sub}
          </Text>
        ) : null}
      </View>
      {row.tag ? (
        <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: row.bg }}>
          <Text size={11} weight="700" color={row.fg}>
            {row.tag}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <Sheet open onClose={onClose} testID="contact-menu" padding={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: 30 }} gap={4}>
      {/* The header is the profile: one tap on the person opens it, so there is no separate row. */}
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Pressable
          testID="menu-profile"
          onPress={() => onProfile(contact)}
          accessibilityRole="button"
          accessibilityLabel={`${contact.name} · ${copy.profile}`}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
            paddingHorizontal: 10,
            borderRadius: 18,
            backgroundColor: pressed ? surface.cardLine : surface.fill,
          })}
        >
          <Avatar name={contact.name} contactId={contact.id} size={46} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text token="title" numberOfLines={1}>
              {contact.name}
            </Text>
            <Text token="micro" color={ink.s4} numberOfLines={1}>
              {contact.role ? `${contact.role} · ${copy.profileSub}` : copy.profileSub}
            </Text>
          </View>
          <ForwardChevron color={ink.s4} />
        </Pressable>
        <Pressable
          testID="menu-favorite"
          onPress={() => onFavorite(contact)}
          accessibilityRole="button"
          accessibilityLabel={favorite ? copy.favRemove : copy.favAdd}
          accessibilityState={{ selected: favorite }}
          hitSlop={6}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon
            name="star"
            size={24}
            color={favorite ? typeColour.visit.fg : ink.s4}
            filled={favorite}
            strokeWidth={1.9}
          />
        </Pressable>
      </View>
      {rows.map(line)}
    </Sheet>
  );
}

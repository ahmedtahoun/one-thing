/**
 * One card on Next: who, what, why — and the real action one tap away.
 * The action button wears the channel's colour (WhatsApp green, email blue,
 * call orange), the same colours as the rest of the app.
 */
import { Pressable, View } from 'react-native';

import type { Added } from '@/content/additions';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TYPE_ICON, type IconName } from '@/design/icon-paths';
import { ink, status, surface, typeColour, type TaskType } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { ltr } from '@/lib/bidi';

import type { NextCard } from './build';
import { isUrgent, reasonText } from './reason';

export function NextCardView({
  card,
  copy,
  onPrimary,
  onDone,
  onLater,
}: {
  card: NextCard;
  copy: Added['next'];
  onPrimary: () => void;
  onDone: () => void;
  onLater: () => void;
}) {
  const { t } = useLanguage();
  const dir = useDirection();
  const urgent = isUrgent(card.reason);
  const channel = card.channel;

  const label = channel ? t.types[channel] : card.source === 'quiet' ? copy.message : card.source === 'followup' ? copy.nudge : copy.open;
  const icon = (channel ? TYPE_ICON[channel as TaskType] : card.source === 'followup' ? 'send' : 'chevR') as IconName;
  const bg = channel ? typeColour[channel].fg : ink.solid;

  // Numbers and clock times inside Arabic text keep their own order.
  const reason = reasonText(card.reason, copy).replace(/\d[\d:]*/g, (n) => ltr(n));

  return (
    <View
      testID={`next-${card.id}`}
      style={{
        backgroundColor: surface.white,
        borderWidth: 1,
        borderColor: urgent ? status.dangerBg : surface.cardLine,
        borderRadius: 20,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 14 }}>
        <Avatar name={card.who || card.title} contactId={card.contactId} size={52} channel={channel} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text token="title" weight="600" numberOfLines={1}>
            {card.who || card.title}
          </Text>
          {card.who && card.title ? (
            <Text token="bodyS" color={ink.s2} numberOfLines={2}>
              {card.title}
            </Text>
          ) : null}
          <Text testID={`next-${card.id}-why`} token="caption" weight="500" color={urgent ? status.overdueFg : ink.s4} numberOfLines={1}>
            {reason}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 10 }}>
        {/* Two plain, labelled choices instead of a bare tick: what each does is written on it. */}
        <View style={{ flex: 1, flexDirection: dir.row, alignItems: 'center', gap: 4 }}>
          <Pressable
            testID={`next-${card.id}-later`}
            onPress={onLater}
            accessibilityRole="button"
            hitSlop={6}
            style={{ height: 40, paddingHorizontal: 10, borderRadius: 20, flexDirection: dir.row, alignItems: 'center', gap: 5 }}
          >
            <Icon name="clock" size={15} color={ink.s3} strokeWidth={1.9} />
            <Text token="bodyS" weight="600" color={ink.s3} numberOfLines={1}>
              {copy.later}
            </Text>
          </Pressable>
          {card.source !== 'quiet' ? (
            <Pressable
              testID={`next-${card.id}-done`}
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel={copy.done}
              hitSlop={6}
              style={{ height: 40, paddingHorizontal: 10, borderRadius: 20, flexDirection: dir.row, alignItems: 'center', gap: 5 }}
            >
              <Icon name="check" size={16} color={ink.s3} strokeWidth={2.2} />
              <Text token="bodyS" weight="600" color={ink.s3} numberOfLines={1}>
                {copy.doneShort}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          testID={`next-${card.id}-go`}
          onPress={onPrimary}
          accessibilityRole="button"
          style={({ pressed }) => ({
            height: 46,
            paddingHorizontal: 20,
            borderRadius: 23,
            backgroundColor: bg,
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 8,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Icon name={icon} size={16} color={surface.white} strokeWidth={2} />
          <Text token="body" weight="600" color={surface.white}>
            {label}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

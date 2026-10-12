/**
 * The normal One Thing card on Today: `fill` background, radius 26, the day's
 * priority, Lock In and Shrink. SCREENS.md § 06 draws it taller (a separate
 * focus line, a full-width button and a "Feeling stuck?" link); it is kept to
 * one decision here — the title, then Lock In with its length in the label and
 * a smaller Shrink beside it — so the quick actions and the day's tasks stay
 * on screen. A thin bar shows how many of today's promises are kept.
 */
import { Pressable, View } from 'react-native';

import { BalancedText } from '@/ui/BalancedText';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { added } from '@/content/additions';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';

export function OneThingCard({
  title,
  focusMinutes,
  done,
  progress,
  onEdit,
  onLockIn,
  onShrink,
}: {
  title: string;
  focusMinutes: number;
  done: boolean;
  /** Today's promises: how many are kept out of how many. Omitted when there are none. */
  progress?: { done: number; total: number };
  onEdit: () => void;
  onLockIn: () => void;
  onShrink: () => void;
}) {
  const { t, inline, lang } = useLanguage();
  const dir = useDirection();
  const share = progress && progress.total > 0 ? Math.min(1, progress.done / progress.total) : 0;

  return (
    <View
      testID="one-thing-card"
      style={{
        backgroundColor: surface.fill,
        borderRadius: radius.oneThing,
        paddingTop: 16,
        paddingHorizontal: 18,
        paddingBottom: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'center' }}>
        <Text token="eyebrow" color={ink.s4}>
          {t.h_k}
        </Text>
        <Pressable testID="one-thing-edit" onPress={onEdit} accessibilityRole="button" hitSlop={10}>
          <Text token="caption" weight="500" color={ink.s3}>
            {t.edit}
          </Text>
        </Pressable>
      </View>

      <BalancedText token="h2" size={22} lh={27} numberOfLines={2} testID="one-thing-title" style={{ letterSpacing: -0.2 }}>
        {title}
      </BalancedText>

      {done ? (
        <View
          testID="one-thing-done"
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 8,
            backgroundColor: surface.white,
            borderRadius: radius.small,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Icon name="check" size={16} strokeWidth={2.4} />
          <Text token="bodyS" weight="500">
            {t.doneToday}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
          <Pressable
            testID="lock-in"
            onPress={onLockIn}
            accessibilityRole="button"
            accessibilityLabel={t.focusMeta.replace('{n}', String(focusMinutes))}
            style={({ pressed }) => ({
              flex: 1,
              height: 46,
              borderRadius: 23,
              backgroundColor: ink.base,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text token="body" weight="600" color={surface.white} numberOfLines={1}>
              {`${t.lockin} · ${focusMinutes}${inline.minSuffixShort}`}
            </Text>
          </Pressable>

          <Pressable
            testID="shrink-it"
            onPress={onShrink}
            accessibilityRole="button"
            accessibilityLabel={t.stuckLink}
            style={({ pressed }) => ({
              height: 46,
              paddingHorizontal: 16,
              borderRadius: 23,
              borderWidth: 1.5,
              borderColor: surface.line,
              backgroundColor: surface.white,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text token="bodyS" weight="500" numberOfLines={1}>
              {added(lang).shrinkShort}
            </Text>
          </Pressable>
        </View>
      )}

      {progress && progress.total > 0 ? (
        <View testID="one-thing-progress" style={{ gap: 6 }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: surface.line, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(share * 100)}%`, height: 4, backgroundColor: ink.base }} />
          </View>
          <Text token="micro" color={ink.s4}>
            {t.tk_sum.replace('{a}', String(progress.total - progress.done)).replace('{b}', String(progress.done))}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

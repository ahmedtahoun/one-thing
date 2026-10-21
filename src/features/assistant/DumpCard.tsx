/**
 * Several errands said in one breath, drawn in the chat for review.
 *
 * Somebody holds the mic and lists five things. The splitter
 * (`src/lib/parse/local.ts`) divides the run and the parser reads each piece,
 * but nothing is saved until it is looked at: a dictated errand is the most
 * likely of all of them to have been misheard, and five wrong tasks are
 * worse than none.
 *
 * So every row can be dropped with a tap before the one button that saves
 * what is left — the same bargain the Brain dump screen makes (SCREENS.md
 * § 18), in the place the owner asked for it. Nothing here reads or writes
 * data; both are the screen's.
 */
import { Pressable, View } from 'react-native';

import type { Added } from '@/content/additions';
import { own } from '@/lib/bidi';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TYPE_ICON } from '@/design/icon-paths';
import { ink, status, surface, typeColour } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import type { ParsedTask } from '@/lib/parse';

export type DumpItem = ParsedTask & { keep: boolean };

export type DumpCardProps = {
  items: readonly DumpItem[];
  copy: Added['qa'];
  /** "Tue · 14:30" for an errand's own day, written by the screen. */
  whenLabel: (iso: string | null | undefined) => string;
  /** Kept or dropped, by position: the pieces have no ids of their own yet. */
  onToggle: (index: number) => void;
  onSave: () => void;
  /** How many were saved, once they have been; the card then stops offering. */
  saved?: number;
};

export function DumpCard({ items, copy, whenLabel, onToggle, onSave, saved }: DumpCardProps) {
  const dir = useDirection();
  const kept = items.filter((item) => item.keep).length;

  return (
    <View testID="qa-dump" style={{ gap: 8 }}>
      <View style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, backgroundColor: surface.white, overflow: 'hidden' }}>
        {items.map((item, i) => (
          <Pressable
            key={`${i}-${item.title}`}
            testID={`qa-dump-${i}`}
            onPress={() => (saved === undefined ? onToggle(i) : undefined)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.keep }}
            accessibilityLabel={item.title}
            style={({ pressed }) => ({
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: surface.lineFaint,
              backgroundColor: pressed ? surface.fill : 'transparent',
              opacity: item.keep ? 1 : 0.45,
            })}
          >
            <Icon name={TYPE_ICON[item.type]} size={16} color={typeColour[item.type].fg} strokeWidth={1.9} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                token="bodyS"
                weight="600"
                numberOfLines={1}
                color={item.keep ? ink.base : ink.muted}
                style={item.keep ? undefined : { textDecorationLine: 'line-through' }}
              >
                {own(item.title)}
              </Text>
              <Text token="micro" color={ink.s4} numberOfLines={1}>
                {own([item.who, whenLabel(item.when)].filter(Boolean).join(' · '))}
              </Text>
            </View>
            {item.keep ? <Icon name="check" size={14} color={status.successFg} strokeWidth={2.6} /> : null}
          </Pressable>
        ))}
      </View>

      {saved === undefined ? (
        <Pressable
          testID="qa-dump-save"
          onPress={kept > 0 ? onSave : undefined}
          accessibilityRole="button"
          accessibilityState={{ disabled: kept === 0 }}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: surface.line,
            backgroundColor: pressed ? surface.fill : surface.white,
            opacity: kept > 0 ? 1 : 0.5,
          })}
        >
          <Text token="caption" weight="600" color={ink.base}>
            {copy.saveMany.replace('{n}', String(kept))}
          </Text>
        </Pressable>
      ) : (
        <Text token="micro" color={status.successFg} style={{ paddingHorizontal: 2 }}>
          {copy.savedMany.replace('{n}', String(saved))}
        </Text>
      )}
    </View>
  );
}

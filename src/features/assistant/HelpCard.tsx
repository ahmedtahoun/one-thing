/**
 * Sanad asking, once, whether it may keep the words — and the sheet that
 * answers "how we use it" properly.
 *
 * The card is deliberately almost nothing: the benefit, one line saying what
 * is shared, a tap for the rest, and two answers of equal weight. Everything
 * else — what the phone removes before anything is sent, who can read what is
 * kept, the audit log, the ninety days, how to stop — is behind the tap,
 * where somebody who wants it will find it and somebody who does not is not
 * made to wade through it.
 *
 * **One line cannot move behind the tap, and it is the one that says what is
 * shared.** Agreeing to "help improve Sanad" without being told that means
 * your sentences are kept is not agreeing to anything, and a consent that
 * hides what it collects is the pattern regulators have been fining — the
 * opposite of what the short card is for. BUILD-REVIEW §2.118.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { ink, radius, surface } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';

export type HelpCopy = {
  title: string;
  body: string;
  link: string;
  yes: string;
  no: string;
  sheetTitle: string;
  paragraphs: readonly string[];
  policy: string;
};

export function HelpCard({ copy, onYes, onNo, onPolicy }: { copy: HelpCopy; onYes: () => void; onNo: () => void; onPolicy: () => void }) {
  const dir = useDirection();
  const [open, setOpen] = useState(false);

  /** The same pair on the card and in the sheet: the answer can be given from either. */
  const Answers = ({ testIDs }: { testIDs: [string, string] }) => (
    <View style={{ flexDirection: dir.row, gap: 8, marginTop: 2 }}>
      <Pressable
        testID={testIDs[0]}
        onPress={() => {
          setOpen(false);
          onYes();
        }}
        accessibilityRole="button"
        style={({ pressed }) => ({ height: 40, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: ink.base, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
      >
        <Text token="bodyS" weight="600" color={surface.white} numberOfLines={1}>
          {copy.yes}
        </Text>
      </Pressable>
      <Pressable
        testID={testIDs[1]}
        onPress={() => {
          setOpen(false);
          onNo();
        }}
        accessibilityRole="button"
        style={({ pressed }) => ({ height: 40, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: surface.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
      >
        <Text token="bodyS" weight="600" color={ink.s3} numberOfLines={1}>
          {copy.no}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <View
        testID="assistant-help-ask"
        style={{ backgroundColor: surface.white, borderWidth: 1, borderColor: surface.line, borderRadius: radius.largeCard, padding: 16, gap: 10 }}
      >
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
          <Icon name="spark" size={16} color={ink.s3} strokeWidth={1.9} />
          <Text token="bodyS" weight="600">
            {copy.title}
          </Text>
        </View>

        <Text token="caption" color={ink.s4}>
          {copy.body}
        </Text>

        <Pressable testID="assistant-help-more" onPress={() => setOpen(true)} accessibilityRole="button" hitSlop={8} style={{ alignSelf: dir.isRTL ? 'flex-end' : 'flex-start' }}>
          <Text token="caption" weight="600" color={ink.s3} style={{ textDecorationLine: 'underline' }}>
            {copy.link}
          </Text>
        </Pressable>

        <Answers testIDs={['assistant-help-yes', 'assistant-help-no']} />
      </View>

      {/* The whole of it, for whoever taps. Answerable from here too: making
          somebody close the explanation to answer the question is how an
          explanation goes unread. */}
      <Sheet open={open} onClose={() => setOpen(false)} testID="assistant-help-sheet" padding={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 28 }} gap={12}>
        <Text token="h3">{copy.sheetTitle}</Text>
        <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
          {copy.paragraphs.map((line, i) => (
            <Text key={i} token="bodyS" color={ink.s3}>
              {line}
            </Text>
          ))}
          <Pressable testID="assistant-help-policy" onPress={onPolicy} accessibilityRole="link" hitSlop={8} style={{ alignSelf: dir.isRTL ? 'flex-end' : 'flex-start' }}>
            <Text token="bodyS" weight="600" color={ink.s2} style={{ textDecorationLine: 'underline' }}>
              {copy.policy}
            </Text>
          </Pressable>
        </ScrollView>
        <Answers testIDs={['assistant-help-sheet-yes', 'assistant-help-sheet-no']} />
      </Sheet>
    </>
  );
}

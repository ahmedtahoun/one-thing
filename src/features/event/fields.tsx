/**
 * The repeated pieces of the event form: a labelled block, a wrapping row of
 * chips, the scrolling time row, the seven study-day toggles, the person
 * chips and the lessons counter. SCREENS.md § 09.
 */
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Chip } from '@/ui/Chip';
import { LTRText, Text } from '@/ui/Text';
import { ink, radius, space, surface, typeColour } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import { initials, type Contact } from '@/lib/model-types';
import type { EventType } from './model';

/** Label 12/`ink-4` above anything. */
export function Labelled({
  label,
  trailing,
  children,
}: {
  label: string;
  /** The right-hand hint on "Who", and the counter on "Progress". */
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const dir = useDirection();
  return (
    <View style={{ gap: 8 }}>
      {trailing ? (
        <View style={{ flexDirection: dir.row, justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text token="micro" color={ink.s4}>
            {label}
          </Text>
          {trailing}
        </View>
      ) : (
        <Text token="micro" color={ink.s4}>
          {label}
        </Text>
      )}
      {children}
    </View>
  );
}

/** Where / Day / Length / Remind me — a wrapping row of pills. */
export function ChipRow({
  options,
  selected,
  onSelect,
  testID,
}: {
  options: readonly string[];
  selected: number;
  onSelect: (index: number) => void;
  testID: string;
}) {
  const dir = useDirection();
  return (
    <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: space.gridGap }}>
      {options.map((label, index) => (
        <Chip
          key={label + index}
          label={label}
          selected={selected === index}
          onPress={() => onSelect(index)}
          testID={`${testID}-${index}`}
        />
      ))}
    </View>
  );
}

/**
 * The hours, scrolling sideways. Selected is ink-filled rather than the
 * chips' soft fill, and the times stay left-to-right in Arabic.
 */
export function TimeRow({
  times,
  selected,
  onSelect,
}: {
  times: readonly string[];
  selected: string;
  onSelect: (time: string) => void;
}) {
  const dir = useDirection();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -space.screenX, flexGrow: 0 }}
      contentContainerStyle={{ flexDirection: dir.row, gap: space.gridGap, paddingHorizontal: space.screenX }}
    >
      {times.map((time) => {
        const on = time === selected;
        return (
          <Pressable
            key={time}
            testID={`event-time-${time}`}
            onPress={() => onSelect(time)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              borderWidth: 1.5,
              borderColor: on ? ink.base : surface.line,
              backgroundColor: on ? ink.base : surface.white,
              borderRadius: radius.small,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <LTRText token="body" tabular color={on ? surface.white : ink.base}>
              {time}
            </LTRText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** S M T W T F S, seven across. */
export function StudyDays({
  labels,
  selected,
  onToggle,
}: {
  labels: readonly string[];
  selected: readonly number[];
  onToggle: (index: number) => void;
}) {
  const dir = useDirection();
  return (
    <View style={{ flexDirection: dir.row, gap: 6 }}>
      {labels.map((label, index) => {
        const on = selected.includes(index);
        return (
          <Pressable
            key={index}
            testID={`event-day-${index}`}
            onPress={() => onToggle(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              height: 42,
              borderRadius: radius.small,
              borderWidth: 1.5,
              borderColor: on ? ink.base : surface.line,
              backgroundColor: on ? ink.base : surface.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text token="caption" weight="500" color={on ? surface.white : ink.base}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal person chips with an avatar. */
export function PersonChips({
  contacts,
  selected,
  onToggle,
}: {
  contacts: Contact[];
  selected: readonly number[];
  onToggle: (index: number) => void;
}) {
  const dir = useDirection();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -space.screenX, flexGrow: 0 }}
      contentContainerStyle={{ flexDirection: dir.row, gap: space.gridGap, paddingHorizontal: space.screenX }}
    >
      {contacts.map((contact, index) => {
        const on = selected.includes(index);
        return (
          <Pressable
            key={contact.id}
            testID={`event-who-${index}`}
            onPress={() => onToggle(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 8,
              borderWidth: 1.5,
              borderColor: on ? ink.base : surface.line,
              backgroundColor: on ? surface.fill : surface.white,
              borderRadius: radius.pill,
              paddingVertical: 5,
              paddingStart: 5,
              paddingEnd: 14,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: on ? ink.base : surface.avatar,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text token="eyebrow" weight="600" color={on ? surface.white : ink.base} style={{ letterSpacing: 0 }}>
                {initials(contact.name)}
              </Text>
            </View>
            <Text token="bodyS">{contact.name.split(' ')[0]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** − bar + , with "{a} of {b} lessons" above it. */
export function ProgressStepper({
  done,
  total,
  type,
  onChange,
}: {
  done: number;
  total: number;
  type: EventType;
  onChange: (next: number) => void;
}) {
  const dir = useDirection();
  const step = (delta: number) => onChange(Math.max(0, Math.min(total, done + delta)));

  return (
    <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 10 }}>
      <StepButton label="−" onPress={() => step(-1)} testID="event-progress-down" />
      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: surface.progressTrack, overflow: 'hidden' }}>
        <View
          testID="event-progress-bar"
          style={{
            height: '100%',
            width: `${total ? Math.round((done / total) * 100) : 0}%`,
            borderRadius: 4,
            backgroundColor: typeColour[type].fg,
          }}
        />
      </View>
      <StepButton label="+" onPress={() => step(1)} testID="event-progress-up" />
    </View>
  );
}

function StepButton({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: surface.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text token="bodyL" size={18}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The repeated pieces of the event form: a labelled block, a wrapping row of
 * chips, the scrolling time row, the seven study-day toggles, the person
 * chips and the lessons counter. SCREENS.md § 09.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Chip } from '@/ui/Chip';
import { LTRText, Text } from '@/ui/Text';
import { fontFamily, ink, radius, space, status, surface, typeColour } from '@/design/tokens';
import { useDirection } from '@/i18n/LanguageProvider';
import { parseClock } from '@/lib/clock';
import { clockFromHHMM } from '@/lib/clock-format';
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
 *
 * With `custom`, a box under the chips takes any time the chips do not cover
 * ("5:45 PM"); both feed the same `onSelect`.
 */
export function TimeRow({
  times,
  selected,
  onSelect,
  custom,
}: {
  times: readonly string[];
  selected: string;
  onSelect: (time: string) => void;
  custom?: { label: string; bad: string };
}) {
  const dir = useDirection();
  const [typed, setTyped] = useState('');
  const parsed = parseClock(typed);
  const bad = typed.trim() !== '' && parsed === null;
  return (
    <View style={{ gap: 10 }}>
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
                borderColor: on ? ink.solid : surface.line,
                backgroundColor: on ? ink.solid : surface.white,
                borderRadius: radius.small,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
            >
              <LTRText token="body" tabular color={on ? surface.white : ink.base}>
                {clockFromHHMM(time)}
              </LTRText>
            </Pressable>
          );
        })}
      </ScrollView>
      {custom ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 10 }}>
            <Text token="bodyS" color={ink.s4}>
              {custom.label}
            </Text>
            <TextInput
              testID="event-custom-time"
              value={typed}
              onChangeText={(text) => {
                setTyped(text);
                const next = parseClock(text);
                if (next) onSelect(next);
              }}
              placeholder={clockFromHHMM('17:45')}
              placeholderTextColor={ink.s5}
              keyboardType="numbers-and-punctuation"
              maxLength={8}
              returnKeyType="done"
              autoCorrect={false}
              style={{
                width: 96,
                height: 40,
                borderRadius: radius.small,
                borderWidth: 1.5,
                borderColor: bad ? status.invalid : parsed ? ink.solid : surface.line,
                paddingHorizontal: 12,
                fontFamily: `${fontFamily}_400Regular`,
                fontSize: 16,
                color: ink.base,
                textAlign: 'center',
                writingDirection: 'ltr',
              }}
            />
          </View>
          {bad ? (
            <Text token="micro" color={status.invalid}>
              {custom.bad}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
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
              borderColor: on ? ink.solid : surface.line,
              backgroundColor: on ? ink.solid : surface.white,
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
              borderColor: on ? ink.solid : surface.line,
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
                backgroundColor: on ? ink.solid : surface.avatar,
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

/**
 * Smart lists — the second of Pro+'s three features (§2.71).
 *
 * A list here is a rule, not a folder: pick what its people have in common
 * and it becomes a chip on People that is right every time it is tapped. The
 * count under each one is live while you build it, so the rule can be judged
 * before it is saved rather than after.
 *
 * Metered, not locked. Everyone can make one — enough to see what they are
 * for — and Pro+ lifts the number (src/policy/entitlements.ts). A lock would
 * have hidden the idea, which sells nothing.
 */
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import { labelsIn } from '@/features/people/filters';
import { countsFor, describe, hasCondition, peopleIn, QUIET_DAYS, type Condition, type SmartList } from '@/features/people/smart-lists';
import { BackButton } from '@/ui/BackButton';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { fontFamily, ink, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { useFavorites } from '@/lib/favorites';
import { usePeople } from '@/lib/people';
import { useSession } from '@/lib/session';
import { addSmartList, removeSmartList, updateSmartList, useSmartLists } from '@/lib/smart-lists';
import { canAddSmartList, limitsFor } from '@/policy/entitlements';

type Draft = { id: string | null; name: string; all: Condition[] };

const EMPTY: Draft = { id: null, name: '', all: [] };

export default function SmartLists() {
  const { lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).smart;
  const { contacts, followUps } = usePeople();
  const favorites = useFavorites();
  const lists = useSmartLists();
  const { session } = useSession();
  const toast = useToast();
  const plan = session?.plan ?? 'free';

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | undefined>();

  const world = useMemo(() => ({ favorites, followUps, now: new Date() }), [favorites, followUps]);
  const counts = useMemo(() => countsFor(lists, contacts, world), [lists, contacts, world]);
  const labels = useMemo(() => labelsIn(contacts), [contacts]);

  const words: Record<Condition['kind'], string> = {
    label: '',
    favourite: copy.cFavourite,
    quiet: copy.cQuiet,
    waiting: copy.cWaiting,
    never: copy.cNever,
    noPhone: copy.cNoPhone,
    noEmail: copy.cNoEmail,
  };

  /** The rule as it stands, read back as a sentence. */
  const sentence = (list: SmartList): string => describe(list, words, copy.and, copy.daysN);

  const asList = (d: Draft): SmartList => ({ id: d.id ?? 'draft', name: d.name, all: d.all, createdAt: new Date().toISOString() });
  const holding = draft ? peopleIn(asList(draft), contacts, world).length : 0;

  const toggle = (condition: Condition) =>
    setDraft((d) => {
      if (!d) return d;
      const list = asList(d);
      // A tap turns a condition off if it is already on, so the same control
      // both adds and removes and nothing is ever listed twice.
      if (hasCondition(list, condition)) {
        return { ...d, all: d.all.filter((c) => !(c.kind === condition.kind && JSON.stringify(c) === JSON.stringify(condition))) };
      }
      // Only one "no word for" at a time: two would contradict each other.
      const without = condition.kind === 'quiet' ? d.all.filter((c) => c.kind !== 'quiet') : d.all;
      return { ...d, all: [...without, condition] };
    });

  const save = async () => {
    if (!draft) return;
    if (draft.name.trim() === '') return setError(copy.needName);
    if (draft.all.length === 0) return setError(copy.needRule);
    if (draft.id) await updateSmartList(draft.id, { name: draft.name, all: draft.all });
    else await addSmartList(draft.name, draft.all);
    setDraft(null);
    setError(undefined);
  };

  const drop = async (id: string) => {
    if (id === '') return;
    await removeSmartList(id);
    setDraft(null);
    toast.show(copy.remove, { undo: false });
  };

  const chip = (key: string, label: string, on: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      testID={`smart-cond-${key}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 999,
        justifyContent: 'center',
        backgroundColor: on ? ink.solid : surface.fill,
      }}
    >
      <Text token="bodyS" weight="600" color={on ? surface.white : ink.s2}>
        {label}
      </Text>
    </Pressable>
  );

  const current = draft ? asList(draft) : null;
  const limit = limitsFor(plan).smartLists;
  const room = canAddSmartList(plan, lists.length);

  return (
    <>
      <Screen scroll paddingBottom={60} style={{ gap: 14 }}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingTop: 6 }}>
          <BackButton testID="smart-back" onPress={() => (draft ? setDraft(null) : router.canGoBack() ? router.back() : router.replace('/people'))} />
          <Text token="title">{copy.title}</Text>
        </View>

        {draft === null ? (
          <>
            {lists.length === 0 ? (
              <View testID="smart-none" style={{ gap: 8, paddingTop: 20 }}>
                <Text token="body" weight="600" align="center">
                  {copy.none}
                </Text>
                <Text token="bodyS" color={ink.s3} align="center">
                  {copy.noneBody}
                </Text>
              </View>
            ) : (
              <View testID="smart-list" style={{ gap: 10 }}>
                {lists.map((list) => (
                  <Pressable
                    key={list.id}
                    testID={`smart-open-${list.id}`}
                    onPress={() => setDraft({ id: list.id, name: list.name, all: [...list.all] })}
                    accessibilityRole="button"
                    accessibilityLabel={list.name}
                    style={({ pressed }) => ({
                      borderWidth: 1,
                      borderColor: surface.line,
                      borderRadius: 16,
                      padding: 14,
                      gap: 4,
                      backgroundColor: pressed ? surface.fill : surface.white,
                    })}
                  >
                    <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
                      <Text token="body" weight="600" style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
                        {list.name}
                      </Text>
                      <Text token="bodyS" color={ink.s4} style={{ fontVariant: ['tabular-nums'] }}>
                        {counts.get(list.id) ?? 0}
                      </Text>
                      <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
                        <Icon name="chevR" size={16} color={ink.s4} strokeWidth={2} />
                      </View>
                    </View>
                    <Text token="micro" color={ink.s4} numberOfLines={2}>
                      {sentence(list)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {room ? (
              <Button testID="smart-add" label={copy.add} onPress={() => setDraft({ ...EMPTY })} />
            ) : (
              <Text testID="smart-capped" token="caption" color={ink.s3} align="center">
                {copy.capped.replace('{n}', String(limit ?? 0))}
              </Text>
            )}
          </>
        ) : (
          <>
            {/* The name. */}
            <View style={{ gap: 4 }}>
              <Text token="micro" color={ink.s4}>
                {copy.nameLabel}
              </Text>
              <View style={{ height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: surface.line, borderRadius: 12, backgroundColor: surface.white, justifyContent: 'center' }}>
                <TextInput
                  testID="smart-name"
                  value={draft.name}
                  onChangeText={(name) => {
                    setDraft((d) => (d ? { ...d, name } : d));
                    setError(undefined);
                  }}
                  placeholder={copy.namePh}
                  placeholderTextColor={ink.s5}
                  style={{ fontFamily: `${fontFamily}_400Regular`, fontSize: 15, color: ink.base, textAlign: dir.textAlign, padding: 0 }}
                />
              </View>
            </View>

            {/* The rule. */}
            <Text token="micro" color={ink.s4}>
              {copy.rule}
            </Text>
            <View style={{ flexDirection: dir.row, gap: 8, flexWrap: 'wrap' }}>
              {chip('favourite', copy.cFavourite, hasCondition(current!, { kind: 'favourite' }), () => toggle({ kind: 'favourite' }))}
              {chip('waiting', copy.cWaiting, hasCondition(current!, { kind: 'waiting' }), () => toggle({ kind: 'waiting' }))}
              {chip('never', copy.cNever, hasCondition(current!, { kind: 'never' }), () => toggle({ kind: 'never' }))}
              {chip('noPhone', copy.cNoPhone, hasCondition(current!, { kind: 'noPhone' }), () => toggle({ kind: 'noPhone' }))}
              {chip('noEmail', copy.cNoEmail, hasCondition(current!, { kind: 'noEmail' }), () => toggle({ kind: 'noEmail' }))}
            </View>

            {/* How long since anything was sent. */}
            <View style={{ flexDirection: dir.row, gap: 8, flexWrap: 'wrap' }}>
              {QUIET_DAYS.map((days) =>
                chip(`quiet-${days}`, `${copy.cQuiet} ${copy.daysN.replace('{n}', String(days))}`, hasCondition(current!, { kind: 'quiet', days }), () =>
                  toggle({ kind: 'quiet', days }),
                ),
              )}
            </View>

            {/* The labels actually in use. */}
            {labels.length > 0 ? (
              <>
                <Text token="micro" color={ink.s4}>
                  {copy.taggedTitle}
                </Text>
                <View style={{ flexDirection: dir.row, gap: 8, flexWrap: 'wrap' }}>
                  {labels.map((label) =>
                    chip(`label-${label}`, label, hasCondition(current!, { kind: 'label', label }), () => toggle({ kind: 'label', label })),
                  )}
                </View>
              </>
            ) : null}

            {/* What it holds as things stand, so the rule is judged before it is saved. */}
            <Text testID="smart-holds" token="bodyS" weight="600" color={holding === 0 ? ink.s3 : ink.base}>
              {draft.all.length === 0 ? copy.holdsNone : holding === 1 ? copy.holdsOne : holding === 0 ? copy.holdsNone : copy.holdsN.replace('{n}', String(holding))}
            </Text>

            {error ? (
              <Text testID="smart-error" token="caption" color={status.dangerFg}>
                {error}
              </Text>
            ) : null}

            <Button testID="smart-save" label={copy.save} onPress={() => void save()} />
            {draft.id !== null ? (
              <Pressable testID="smart-remove" onPress={() => void drop(draft.id ?? '')} accessibilityRole="button" hitSlop={8}>
                <Text token="caption" weight="600" color={status.dangerFg} align="center">
                  {copy.remove}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </Screen>
      <Toast />
    </>
  );
}

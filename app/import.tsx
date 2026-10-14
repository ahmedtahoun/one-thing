/**
 * Import contacts — from a spreadsheet (CSV or Excel) or a vCard file.
 *
 * Pick a file, see everyone in it with the columns already matched, untick
 * what you do not want, import. Nothing is saved until "Import"; people who
 * are already in People start unticked, so importing the same file twice does
 * not double anyone.
 */
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

import { added } from '@/content/additions';
import { defaultSelection, type Candidate } from '@/features/people-import/columns';
import { candidatesFromFile } from '@/features/people-import/read-file';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast } from '@/ui/Toast';
import { ink, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { initials } from '@/lib/model-types';
import { ltr } from '@/lib/bidi';
import { dialFor } from '@/lib/parse/contact';
import { usePeople } from '@/lib/people';
import { deviceRegion } from '@/lib/speech';

type Stage =
  | { kind: 'start'; error?: string }
  | { kind: 'reading' }
  | { kind: 'preview'; candidates: Candidate[]; selected: ReadonlySet<string> }
  | { kind: 'done'; count: number };

export default function ImportContacts() {
  const { lang, inline, a11y } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).importer;
  const { contacts, addContacts } = usePeople();
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  const region = deviceRegion();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/people'));

  const choose = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false }).catch(() => null);
    const asset = picked && !picked.canceled ? picked.assets[0] : undefined;
    if (!asset) return;
    setStage({ kind: 'reading' });
    try {
      const result = await candidatesFromFile(
        {
          name: asset.name,
          mime: asset.mimeType,
          text: async () => (await fetch(asset.uri)).text(),
          bytes: async () => new Uint8Array(await (await fetch(asset.uri)).arrayBuffer()),
        },
        contacts,
        region
      );
      if ('error' in result) return setStage({ kind: 'start', error: copy[result.error] });
      setStage({ kind: 'preview', candidates: result.candidates, selected: defaultSelection(result.candidates) });
    } catch {
      setStage({ kind: 'start', error: copy.failed });
    }
  };

  const toggle = (key: string) =>
    setStage((s) => {
      if (s.kind !== 'preview') return s;
      const next = new Set(s.selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...s, selected: next };
    });

  const importable = useMemo(
    () => (stage.kind === 'preview' ? stage.candidates.filter((c) => !c.issues.includes('no-name')) : []),
    [stage]
  );

  const run = () => {
    if (stage.kind !== 'preview') return;
    const chosen = stage.candidates.filter((c) => stage.selected.has(c.key) && !c.issues.includes('no-name'));
    addContacts(
      chosen.map((c) => ({
        name: c.name,
        role: c.role,
        dial: c.phone ? dialFor({ dial: c.dial }, region) : undefined,
        phone: c.phone,
        email: c.email,
        preferredChannel: c.phone ? 'whatsapp' : c.email ? 'email' : undefined,
        lastLabel: inline.addedToday,
      }))
    );
    setStage({ kind: 'done', count: chosen.length });
  };

  const header = (
    <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingTop: 6, paddingBottom: 10 }}>
      <Pressable testID="import-back" onPress={back} accessibilityRole="button" accessibilityLabel={a11y.back} hitSlop={12}>
        <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
          <Icon name="back" size={24} strokeWidth={2} />
        </View>
      </Pressable>
      <Text token="title">{copy.title}</Text>
    </View>
  );

  return (
    <>
      <Screen paddingBottom={0}>
        {header}

        {stage.kind === 'start' || stage.kind === 'reading' ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: 16, paddingBottom: 60 }}>
            <View style={{ alignSelf: 'center', width: 76, height: 76, borderRadius: 24, backgroundColor: typeColour.course.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="list" size={32} color={typeColour.course.fg} strokeWidth={1.8} />
            </View>
            <Text token="body" color={ink.s3} align="center">
              {copy.intro}
            </Text>
            <Text token="caption" color={ink.s4} align="center">
              {copy.formats}
            </Text>
            {stage.kind === 'start' && stage.error ? (
              <Text testID="import-error" token="bodyS" color={status.invalid} align="center">
                {stage.error}
              </Text>
            ) : null}
            <Button testID="import-choose" label={stage.kind === 'reading' ? copy.reading : copy.choose} loading={stage.kind === 'reading'} onPress={() => void choose()} />
          </View>
        ) : null}

        {stage.kind === 'preview' ? (
          <>
            <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
              <Text token="caption" color={ink.s3} testID="import-summary">
                {copy.found.replace('{n}', String(stage.candidates.length))} · {copy.ready.replace('{n}', String(stage.selected.size))}
              </Text>
              <Pressable
                testID="import-select-all"
                onPress={() =>
                  setStage({ ...stage, selected: stage.selected.size >= importable.length ? new Set() : new Set(importable.map((c) => c.key)) })
                }
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text token="bodyS" weight="600">
                  {stage.selected.size >= importable.length ? copy.clear : copy.selectAll}
                </Text>
              </Pressable>
            </View>
            <FlatList
              style={{ flex: 1 }}
              data={stage.candidates}
              keyExtractor={(c) => c.key}
              initialNumToRender={20}
              renderItem={({ item: c }) => {
                const blocked = c.issues.includes('no-name');
                const on = stage.selected.has(c.key);
                const reach = [c.phone ? `${c.dial ?? ''} ${c.phone}`.trim() : '', c.email ?? ''].filter(Boolean).join(' · ');
                const notes = [
                  c.duplicateOf ? copy.already.replace('{n}', c.duplicateOf) : '',
                  blocked ? copy.noName : '',
                  c.issues.includes('bad-email') ? copy.skippedEmail : '',
                  c.issues.includes('bad-phone') ? copy.skippedPhone : '',
                ].filter(Boolean);
                return (
                  <Pressable
                    testID={`import-row-${c.key}`}
                    onPress={() => !blocked && toggle(c.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: blocked }}
                    style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: surface.avatar, opacity: blocked ? 0.5 : 1 }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: on ? ink.solid : surface.line,
                        backgroundColor: on ? ink.solid : surface.white,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on ? <Icon name="check" size={14} color={surface.white} strokeWidth={2.4} /> : null}
                    </View>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: surface.avatarPeople, alignItems: 'center', justifyContent: 'center' }}>
                      <Text token="caption" weight="600" align="center">
                        {initials(c.name || '?')}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text token="body" weight="600" numberOfLines={1}>
                        {c.name || '—'}
                      </Text>
                      <Text token="micro" color={ink.s4} numberOfLines={1}>
                        {c.role ?? ''}
                        {c.role && reach ? ' · ' : ''}
                        {/* An LTR island, so a number or address keeps its order next to Arabic. */}
                        {reach ? ltr(reach) : ''}
                      </Text>
                      {notes.length > 0 ? (
                        <Text size={11} weight="600" color={c.duplicateOf || blocked ? status.invalid : ink.s3} numberOfLines={1}>
                          {notes.join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
            <View style={{ paddingTop: 10, paddingBottom: 28, gap: 8 }}>
              <Button
                testID="import-run"
                label={copy.importN.replace('{n}', String(stage.selected.size))}
                dimmed={stage.selected.size === 0}
                onPress={run}
              />
            </View>
          </>
        ) : null}

        {stage.kind === 'done' ? (
          <View testID="import-done" style={{ flex: 1, justifyContent: 'center', gap: 14, paddingBottom: 60 }}>
            <Text token="h1" align="center">
              {copy.doneTitle}
            </Text>
            <Text token="body" color={ink.s3} align="center">
              {copy.doneBody.replace('{n}', String(stage.count))}
            </Text>
            <Button testID="import-people" label={copy.back} onPress={() => router.replace('/people')} />
            <Button testID="import-another" variant="outline" label={copy.another} onPress={() => setStage({ kind: 'start' })} />
          </View>
        ) : null}
      </Screen>
      <Toast />
    </>
  );
}

/**
 * The attachment row: the files picked so far, each tappable to drop, and
 * the button that picks more.
 *
 * Shared by `app/compose.tsx` and `app/bulk.tsx` rather than written twice.
 * The two screens had the same row drawn once and missing entirely, and the
 * thing that goes wrong when they are separate is not the look — it is that
 * one of them learns a rule (which channel can carry a file, which send
 * path drops it) and the other does not.
 *
 * It owns the picker and nothing else: whether files are *allowed* here,
 * and whether they will actually arrive, is the screen's business.
 * `fileOutcome` in `src/features/bulk/plan.ts` answers the second.
 */
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, View } from 'react-native';

import { added } from '@/content/additions';
import { ink, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

export type PickedFile = { uri: string; name: string };

/** Adds what was picked to what is there. Exported for the screens' tests. */
export async function pickFiles(): Promise<PickedFile[]> {
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true }).catch(() => null);
  if (!picked || picked.canceled) return [];
  return picked.assets.map((a) => ({ uri: a.uri, name: a.name }));
}

export function AttachRow({
  files,
  onChange,
  testID = 'attach',
}: {
  files: readonly PickedFile[];
  onChange: (next: PickedFile[]) => void;
  testID?: string;
}) {
  const { lang } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).attach;

  return (
    <View style={{ flexDirection: dir.row, flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {files.map((f) => (
        <Pressable
          key={f.uri}
          testID={`${testID}-file`}
          onPress={() => onChange(files.filter((x) => x.uri !== f.uri))}
          accessibilityRole="button"
          accessibilityLabel={`${copy.remove} ${f.name}`}
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: surface.fill,
            maxWidth: '100%',
          }}
        >
          <Icon name="note" size={14} color={ink.s2} strokeWidth={2} />
          <Text token="caption" weight="600" color={ink.s2} numberOfLines={1} style={{ flexShrink: 1 }}>
            {f.name}
          </Text>
          <Icon name="x" size={12} color={ink.s4} strokeWidth={2.2} />
        </Pressable>
      ))}
      <Pressable
        testID={`${testID}-add`}
        onPress={() => void pickFiles().then((more) => (more.length > 0 ? onChange([...files, ...more]) : undefined))}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Text token="caption" weight="600" color={ink.s3}>
          + {copy.button}
        </Text>
      </Pressable>
    </View>
  );
}

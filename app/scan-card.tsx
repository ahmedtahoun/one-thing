/**
 * Scan a business card.
 *
 * A photo of the card, read on the phone, becomes a contact card with the
 * name, company or role, number and email filled in. Every field can be
 * corrected before "Save contact"; nothing is saved without it. When the
 * phone cannot read the card (the web, a build without the reader, or a card
 * in a script the reader does not know), the same form opens empty to fill
 * in by hand.
 */
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { added } from '@/content/additions';
import { ContactCard } from '@/features/capture/ContactCard';
import { parseCard } from '@/features/card/parse';
import { scanOutcome } from '@/features/card/scan-note';
import { emailInvalid, findDuplicate, nameValid, phoneInvalid } from '@/features/contact/form-rules';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { ink, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { canReadCards, readCard, readsArabicCards } from '@/lib/card-reader';
import { applyEdit, dialFor, type ContactEdit, type ContactFields } from '@/lib/parse/contact';
import { usePeople } from '@/lib/people';
import { deviceRegion } from '@/lib/speech';

type Stage = 'start' | 'reading' | 'review';

export default function ScanCard() {
  const { lang, inline, a11y } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).scan;
  const { contacts, addContact, updateContact } = usePeople();
  const toast = useToast();
  const region = deviceRegion();
  // Lines of card text can be passed in (`?text=a|b|c`), to open the review without a photo.
  const preset = useLocalSearchParams<{ text?: string }>().text;

  const [stage, setStage] = useState<Stage>('start');
  const [image, setImage] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [fields, setFields] = useState<ContactFields>({});
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | undefined>();
  const [showRead, setShowRead] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/people'));

  const review = (read: string[], message: string | null) => {
    const found = read.length > 0 ? parseCard(read, { region, prefer: lang }) : {};
    setLines(read);
    setFields(found);
    // The note belongs here rather than only before the photo: on Android
    // the Arabic was dropped silently, and the field it would have filled —
    // usually the name — is the one in front of the person right now.
    const outcome = scanOutcome(readsArabicCards, found);
    setNote(message ?? (outcome === 'nothing' ? copy.nothing : outcome === 'latinOnly' ? copy.latinOnly : null));
    setStage('review');
  };

  useEffect(() => {
    if (preset) review(preset.split('|').map((l) => l.trim()).filter(Boolean), null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const handle = async (result: ImagePicker.ImagePickerResult) => {
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (!uri) return;
    setImage(uri);
    setStage('reading');
    if (!canReadCards()) return review([], copy.unsupported);
    const read = await readCard(uri).catch(() => []);
    review(read, null);
  };

  const take = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
    if (!permission?.granted) return toast.show(copy.cameraOff, { undo: false });
    await handle(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 }));
  };
  const choose = async () => handle(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 }));

  const save = (how: 'ask' | 'new' | 'update' = 'ask') => {
    const name = fields.name?.trim() ?? '';
    if (!nameValid(name)) return setError(copy.needName);
    if (phoneInvalid(fields.phone ?? '')) return setError(added(lang).contact.badPhone);
    if (emailInvalid(fields.email ?? '')) return setError(added(lang).contact.badEmail);

    const same = how === 'ask' ? findDuplicate({ name, phone: fields.phone ?? '', email: fields.email ?? '' }, contacts) : undefined;
    if (same) return setDuplicate({ id: same.id, name: same.name });

    if (how === 'update' && duplicate) {
      updateContact(duplicate.id, {
        ...(fields.phone ? { phone: fields.phone, dial: dialFor(fields, region) } : {}),
        ...(fields.email ? { email: fields.email } : {}),
        ...(fields.role ? { role: fields.role } : {}),
        ...(fields.address ? { address: fields.address } : {}),
      });
      toast.show(added(lang).contact.updated.replace('{n}', duplicate.name), { undo: false });
    } else {
      addContact({
        name,
        role: fields.role,
        dial: fields.phone ? dialFor(fields, region) : undefined,
        phone: fields.phone,
        email: fields.email,
        address: fields.address?.trim() || undefined,
        preferredChannel: fields.phone ? 'whatsapp' : fields.email ? 'email' : undefined,
        lastLabel: inline.addedToday,
      });
      toast.show(copy.saved.replace('{n}', name), { undo: false });
    }
    setTimeout(() => router.replace('/people'), 700);
  };

  return (
    <>
      <Screen scroll paddingBottom={40} style={{ gap: 16 }}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingTop: 6 }}>
          <Pressable testID="scan-back" onPress={back} accessibilityRole="button" accessibilityLabel={a11y.back} hitSlop={12}>
            <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
              <Icon name="back" size={24} strokeWidth={2} />
            </View>
          </Pressable>
          <Text token="title">{copy.title}</Text>
        </View>

        {stage !== 'review' ? (
          <View style={{ gap: 16, paddingTop: 30 }}>
            <View style={{ alignSelf: 'center', width: 76, height: 76, borderRadius: 24, backgroundColor: typeColour.webinar.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="screen" size={32} color={typeColour.webinar.fg} strokeWidth={1.8} />
            </View>
            <Text token="body" color={ink.s3} align="center">
              {copy.intro}
            </Text>
            {Platform.OS === 'android' ? (
              <Text token="caption" color={ink.s4} align="center">
                {copy.androidNote}
              </Text>
            ) : null}
            <Button testID="scan-take" label={stage === 'reading' ? copy.reading : copy.take} loading={stage === 'reading'} onPress={() => void take()} />
            <Button testID="scan-choose" variant="outline" label={copy.choose} onPress={() => void choose()} />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {image ? <Image source={{ uri: image }} resizeMode="cover" style={{ width: '100%', height: 150, borderRadius: 16, backgroundColor: surface.fill }} /> : null}
            {note ? (
              <Text testID="scan-note" token="caption" color={ink.s3}>
                {note}
              </Text>
            ) : null}
            <ContactCard
              fields={{ ...fields, address: fields.address ?? '' }}
              dial={dialFor(fields, region)}
              copy={added(lang).contact}
              duplicate={duplicate}
              error={error}
              canSave={Boolean(fields.name)}
              canSaveNameOnly={false}
              onEdit={(edit: ContactEdit) => {
                setFields((f) => applyEdit(f, edit, region));
                setDuplicate(undefined);
                setError(undefined);
              }}
              onSave={() => save()}
              onSaveNameOnly={() => save()}
              onUpdate={() => save('update')}
              onSaveNew={() => save('new')}
              onCancel={back}
            />
            <Button testID="scan-another" variant="outline" label={copy.another} onPress={() => { setStage('start'); setDuplicate(undefined); setError(undefined); }} />
            {lines.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Pressable testID="scan-read-toggle" onPress={() => setShowRead((v) => !v)} accessibilityRole="button" hitSlop={8}>
                  <Text token="caption" weight="600" color={ink.s3}>
                    {copy.read} {showRead ? '–' : '+'}
                  </Text>
                </Pressable>
                {showRead ? (
                  <Text testID="scan-read" token="micro" color={ink.s4} style={{ writingDirection: 'ltr', textAlign: dir.textAlign }}>
                    {lines.join('\n')}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </Screen>
      <Toast />
    </>
  );
}

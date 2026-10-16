/**
 * Scan a stack of business cards.
 *
 * Twenty cards in a lanyard pouch is the end of a conference day, and the
 * single-card screen is the wrong shape for it: photo, review, save, back,
 * photo. So the camera stays open. A shot goes in, the phone reads it in the
 * background while the next one is being taken, and the counter is the only
 * thing that changes. Nothing is saved until the whole batch has been looked
 * at once, together, on one screen.
 *
 * Everything is read on the phone — Apple's Vision, Google's ML Kit — the same
 * as one card. No photo is uploaded and no card is sent anywhere, which is
 * also why a batch of twenty costs nothing and works in a hall with no signal.
 *
 * What makes the scanning worth anything is what follows it, so saving the
 * batch opens Send to many with those people already picked: the cards become
 * twenty messages before the venue car park, which is the whole point of
 * having them. The rules about how many a plan keeps are in
 * src/policy/entitlements.ts; the batch itself is src/features/scan-many.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { added } from '@/content/additions';
import { parseCard } from '@/features/card/parse';
import {
  capFor,
  capReached,
  edit,
  grade,
  kept,
  label,
  newCard,
  read,
  remove,
  repeats,
  savable,
  selectAll,
  summary,
  toggle,
  type Card,
} from '@/features/scan-many/batch';
import type { CameraStageProps } from '@/features/scan-many/CameraStage';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { fontFamily, ink, status, surface } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import { canReadCards, readCard } from '@/lib/card-reader';
import { applyEdit, dialFor, type ContactEdit, type ContactFields } from '@/lib/parse/contact';
import { usePeople } from '@/lib/people';
import { useSession } from '@/lib/session';
import { deviceRegion } from '@/lib/speech';

type Stage = 'camera' | 'review';

/**
 * The viewfinder, loaded only where it can work.
 *
 * expo-camera's web build fetches a QR decoder from a public CDN as soon as
 * the module runs, and this app scans no QR codes. Behind the reader check
 * the module is never evaluated on the web, so the request never happens —
 * the same lazy-require shape as src/lib/card-reader.ts, for the same reason.
 */
function cameraStage(): ((props: CameraStageProps) => ReactNode) | null {
  try {
    return (require('@/features/scan-many/CameraStage') as typeof import('@/features/scan-many/CameraStage')).CameraStage;
  } catch {
    return null;
  }
}

const BADGE = {
  ready: { bg: status.successBg, fg: status.successFg },
  partial: { bg: status.duplicateBg, fg: status.duplicateFg },
  unreadable: { bg: status.dangerBg, fg: status.dangerFg },
} as const;

export default function ScanMany() {
  const { lang, inline } = useLanguage();
  const dir = useDirection();
  const copy = added(lang).many;
  const { contacts, addContacts } = usePeople();
  const { session } = useSession();
  const toast = useToast();
  const region = deviceRegion();
  const plan = session?.plan ?? 'free';
  const cap = capFor(plan);
  const supported = canReadCards();

  const [stage, setStage] = useState<Stage>('camera');
  const [cards, setCards] = useState<readonly Card[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [tag, setTag] = useState('');
  const [saving, setSaving] = useState(false);
  const shots = useRef(0);
  /** Cards handed to the reader already, so a re-render never reads one twice. */
  const started = useRef<Set<string>>(new Set());

  const back = () => (router.canGoBack() ? router.back() : router.replace('/people'));

  /**
   * One card at a time, in the order they were shot. Each one finishing is
   * what starts the next, so the queue drains itself while the camera is
   * still open and a long stack never holds up a shot.
   */
  useEffect(() => {
    const next = cards.find((card) => card.reading && !started.current.has(card.id));
    if (!next) return;
    started.current.add(next.id);
    let alive = true;
    void (async () => {
      const lines = await readCard(next.uri).catch(() => []);
      if (!alive) return;
      const fields = lines.length > 0 ? parseCard(lines, { region, prefer: lang }) : {};
      setCards((current) => read(current, next.id, lines, fields, cap));
    })();
    return () => {
      alive = false;
    };
  }, [cards, cap, lang, region]);

  const save = () => {
    const chosen = kept(cards);
    if (chosen.length === 0 || saving) return;
    setSaving(true);
    const tagged = label(tag);
    const saved = addContacts(
      chosen.map((card) => ({
        name: (card.fields.name ?? '').trim(),
        role: card.fields.role,
        dial: card.fields.phone ? dialFor(card.fields, region) : undefined,
        phone: card.fields.phone,
        email: card.fields.email,
        address: card.fields.address?.trim() || undefined,
        labels: tagged === '' ? undefined : [tagged],
        preferredChannel: card.fields.phone ? 'whatsapp' : card.fields.email ? 'email' : undefined,
        lastLabel: inline.addedToday,
      })),
    );
    toast.show(copy.savedN.replace('{n}', String(saved.length)), { undo: false });
    // Straight on to the messages: a saved stack nobody writes to was a
    // contact import, not a conference.
    setTimeout(() => router.replace(`/bulk?ids=${saved.map((contact) => contact.id).join(',')}`), 700);
  };

  const Camera = supported ? cameraStage() : null;

  // The web build, and any build without the reader, cannot do this at all,
  // so it says so rather than opening a camera whose photos nothing can read.
  if (!Camera) {
    return (
      <>
        <Screen scroll paddingBottom={40} style={{ gap: 16 }}>
          <Header title={copy.title} onBack={back} />
          <View style={{ gap: 16, paddingTop: 30 }}>
            <Text token="body" color={ink.s3} align="center">
              {copy.unsupported}
            </Text>
            <Button testID="many-single" variant="outline" label={added(lang).scan.title} onPress={() => router.replace('/scan-card')} />
          </View>
        </Screen>
        <Toast />
      </>
    );
  }

  if (stage === 'camera') {
    const counts = summary(cards);
    return (
      <Camera
        copy={copy}
        count={cards.length}
        reading={counts.reading}
        lastUri={cards[cards.length - 1]?.uri}
        onShot={(uri) => {
          shots.current += 1;
          setCards((current) => [...current, newCard(`shot-${shots.current}`, uri)]);
        }}
        onReview={() => setStage('review')}
        onClose={back}
        header={(title, onBack) => <Header title={title} onBack={onBack} />}
      />
    );
  }

  const flags = repeats(cards, contacts);
  const counts = summary(cards);
  const chosen = kept(cards).length;
  const full = capReached(cards, cap);

  const row = (card: Card) => {
    const g = grade(card.fields);
    const badge = BADGE[g];
    const flag = flags.get(card.id);
    const expanded = open === card.id;
    const field = (labelText: string, value: string, change: (text: string) => void, extra: object = {}) => (
      <View style={{ gap: 4 }}>
        <Text token="micro" color={ink.s4}>
          {labelText}
        </Text>
        <View style={{ height: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: surface.line, borderRadius: 12, backgroundColor: surface.white, justifyContent: 'center' }}>
          <TextInput
            value={value}
            onChangeText={change}
            placeholder="—"
            placeholderTextColor={ink.s5}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ fontFamily: `${fontFamily}_400Regular`, fontSize: 15, color: ink.base, textAlign: dir.textAlign, padding: 0 }}
            {...extra}
          />
        </View>
      </View>
    );

    return (
      <View key={card.id} testID={`many-card-${card.id}`} style={{ borderWidth: 1, borderColor: surface.line, borderRadius: 16, backgroundColor: surface.white, overflow: 'hidden' }}>
        <Pressable
          testID={`many-tick-${card.id}`}
          onPress={() => setCards((current) => toggle(current, card.id, cap))}
          onLongPress={() => setOpen(expanded ? null : card.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: card.keep, disabled: !savable(card) }}
          accessibilityLabel={card.fields.name ?? copy.unreadable}
          style={({ pressed }) => ({ flexDirection: dir.row, alignItems: 'center', gap: 12, padding: 12, backgroundColor: pressed ? surface.fill : 'transparent' })}
        >
          <View style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden', backgroundColor: surface.fill }}>
            <Image source={{ uri: card.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            {card.reading ? (
              <Text token="bodyS" color={ink.s4} numberOfLines={1}>
                {copy.reading.replace('{n}', '1')}
              </Text>
            ) : (
              <>
                <Text token="body" weight="600" numberOfLines={1}>
                  {card.fields.name?.trim() || copy.unreadable}
                </Text>
                <Text token="micro" color={ink.s4} numberOfLines={1}>
                  {[card.fields.role, card.fields.phone, card.fields.email].filter(Boolean).join(' · ') || '—'}
                </Text>
                <View style={{ flexDirection: dir.row, gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: badge.bg }}>
                    <Text token="micro" weight="600" color={badge.fg}>
                      {copy[g]}
                    </Text>
                  </View>
                  {flag ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: surface.fill }}>
                      <Text token="micro" weight="600" color={ink.s3}>
                        {flag === 'batch' ? copy.inBatch : copy.inPeople}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </View>
          {card.reading ? (
            <ActivityIndicator size="small" color={ink.s5} />
          ) : (
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                borderWidth: card.keep ? 0 : 1.5,
                borderColor: savable(card) ? surface.line : surface.lineSoft,
                backgroundColor: card.keep ? ink.solid : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {card.keep ? <Icon name="check" size={16} color={surface.white} strokeWidth={2.4} /> : null}
            </View>
          )}
        </Pressable>

        {card.reading ? null : (
          <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
            <Pressable testID={`many-open-${card.id}`} onPress={() => setOpen(expanded ? null : card.id)} accessibilityRole="button" hitSlop={8}>
              <Text token="caption" weight="600" color={ink.s3}>
                {copy.fix} {expanded ? '–' : '+'}
              </Text>
            </Pressable>
            {expanded ? (
              <View style={{ gap: 10 }}>
                {g === 'unreadable' ? (
                  <Text token="caption" color={ink.s3}>
                    {copy.nothing}
                  </Text>
                ) : null}
                {field(added(lang).scan.name, card.fields.name ?? '', (text) => change(card.id, card.fields, { name: text }), { autoCapitalize: 'words' })}
                {field(added(lang).scan.role, card.fields.role ?? '', (text) => change(card.id, card.fields, { role: text }), { autoCapitalize: 'words' })}
                {field(added(lang).scan.phone, card.fields.phone ?? '', (text) => change(card.id, card.fields, { phoneText: text }), { keyboardType: 'phone-pad' })}
                {field(added(lang).scan.email, card.fields.email ?? '', (text) => change(card.id, card.fields, { email: text }), { keyboardType: 'email-address' })}
                <Pressable testID={`many-remove-${card.id}`} onPress={() => setCards((current) => remove(current, card.id))} accessibilityRole="button" hitSlop={8}>
                  <Text token="caption" weight="600" color={status.dangerFg}>
                    {copy.remove}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  function change(id: string, fields: ContactFields, patch: ContactEdit) {
    setCards((current) => edit(current, id, applyEdit(fields, patch, region)));
  }

  return (
    <>
      <Screen scroll paddingBottom={120} style={{ gap: 14 }}>
        <Header title={copy.reviewTitle} onBack={() => setStage('camera')} />

        <Text testID="many-summary" token="body" color={ink.s3}>
          {[
            counts.ready > 0 ? copy.sumReady.replace('{n}', String(counts.ready)) : null,
            counts.partial > 0 ? copy.sumPartial.replace('{n}', String(counts.partial)) : null,
            counts.unreadable > 0 ? copy.sumNone.replace('{n}', String(counts.unreadable)) : null,
          ]
            .filter(Boolean)
            .join(' · ') || copy.empty}
        </Text>

        <View style={{ gap: 4 }}>
          <Text token="micro" color={ink.s4}>
            {copy.labelTitle}
          </Text>
          <View style={{ height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: surface.line, borderRadius: 12, backgroundColor: surface.white, justifyContent: 'center' }}>
            <TextInput
              testID="many-label"
              value={tag}
              onChangeText={setTag}
              placeholder={copy.labelPh}
              placeholderTextColor={ink.s5}
              style={{ fontFamily: `${fontFamily}_400Regular`, fontSize: 15, color: ink.base, textAlign: dir.textAlign, padding: 0 }}
            />
          </View>
        </View>

        <View style={{ flexDirection: dir.row, alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable testID="many-select-all" onPress={() => setCards((current) => selectAll(current, cap))} accessibilityRole="button" hitSlop={8}>
            <Text token="bodyS" weight="600" color={ink.solid}>
              {chosen > 0 ? copy.clearAll : copy.selectAll}
            </Text>
          </Pressable>
          <Pressable testID="many-keep-scanning" onPress={() => setStage('camera')} accessibilityRole="button" hitSlop={8}>
            <Text token="bodyS" weight="600" color={ink.s3}>
              {copy.keepScanning}
            </Text>
          </Pressable>
        </View>

        <View testID="many-list" style={{ gap: 10 }}>{cards.map(row)}</View>

        {full ? (
          <Text testID="many-capped" token="caption" color={ink.s3}>
            {copy.capped.replace('{n}', String(cap))}
          </Text>
        ) : null}
      </Screen>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, backgroundColor: surface.white, borderTopWidth: 1, borderTopColor: surface.lineSoft }}>
        <Button
          testID="many-save"
          label={chosen === 1 ? copy.saveOne : copy.save.replace('{n}', String(chosen))}
          disabled={chosen === 0 || saving}
          onPress={save}
        />
      </View>
      <Toast />
    </>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const dir = useDirection();
  const { a11y } = useLanguage();
  return (
    <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12, paddingTop: 6 }}>
      <Pressable testID="many-back" onPress={onBack} accessibilityRole="button" accessibilityLabel={a11y.back} hitSlop={12}>
        <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
          <Icon name="back" size={24} strokeWidth={2} />
        </View>
      </Pressable>
      <Text token="title">{title}</Text>
    </View>
  );
}

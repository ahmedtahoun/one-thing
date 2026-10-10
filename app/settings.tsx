/**
 * 21–23 · Settings. SCREENS.md § 21–23.
 *
 * Grouped screen on `fill-2`, 4 / 20 / 44 with a 14 pt gap. One accordion card
 * (only one panel open at a time) holds Reminders, Notifications, Channels,
 * the inline Language switch and Privacy & data; a second card holds the tip
 * jar and Restore / Manage; the footer has Sign out, the version and Delete
 * account.
 */
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';

import {
  AccordionPanel,
  AccordionRow,
  LinkRow,
  RowTile,
  Segmented,
  SettingsCard,
  ToggleRow,
  rowRule,
} from '@/features/settings/parts';
import { DeleteSheet, TipSheet } from '@/features/settings/sheets';
import { ForwardChevron } from '@/ui/ForwardChevron';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { LTRText, Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { ink, settingsTile, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import type { Lang } from '@/content/strings';
import { useAccount } from '@/lib/account';
import { POLICY_VERSION, recordConsent } from '@/lib/consent';
import type { Channel, NudgeStyle, Prefs } from '@/lib/model-types';
import { usePrefs } from '@/lib/prefs';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';
import { isPro } from '@/policy/entitlements';

type Panel = 'reminders' | 'notifications' | 'channels' | 'privacy';

/** Names of the two languages, each in itself — the same in both UIs. */
const LANGUAGES: { key: Lang; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'ar', label: 'العربية' },
];

const FOCUS_OPTIONS = [25, 45, 90] as const;

/** Where "Manage subscription" goes on each store. DATA_MODEL § Integrations. */
const STORE_SUBSCRIPTIONS = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
});

export default function Settings() {
  const { t, acc, setx, inline, a11y, lang, setLang } = useLanguage();
  const dir = useDirection();
  const { session } = useSession();
  const { prefs, setPrefs } = usePrefs();
  const { setFocusMinutes } = useTasks();
  const { signOut, deleteAccount } = useAccount();
  const toast = useToast();
  const st = setx.st;

  const [open, setOpen] = useState<Panel | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const pro = isPro(session?.plan ?? 'free');
  const firstName = session?.firstName ?? '';
  const toggle = (panel: Panel) => setOpen((current) => (current === panel ? null : panel));

  const nudgeLabel = t.nudges.find(([key]) => key === prefs.nudgeStyle)?.[1] ?? '';
  const channelsOn = Object.values(prefs.channels).filter(Boolean).length;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const setMarketing = useCallback(
    (granted: boolean) => {
      setPrefs({ marketing: granted });
      // A separate consent row, with its own timestamp and version, every
      // time it changes — ACCEPTANCE § First run, DATA_MODEL § Consent.
      if (session) {
        recordConsent(session.userId, [
          { kind: 'marketing', granted, version: POLICY_VERSION, at: new Date().toISOString(), source: 'settings' },
        ]).catch(() => {});
      }
    },
    [setPrefs, session]
  );

  const pickFocus = (minutes: Prefs['focusMinutes']) => {
    setPrefs({ focusMinutes: minutes });
    // The prototype keeps one focus length: changing it here changes today's
    // One Thing card too.
    setFocusMinutes(minutes);
  };

  const openPhoneSettings = () => {
    toast.show(inline.openingSettings, { undo: false });
    if (Platform.OS !== 'web') Linking.openSettings().catch(() => {});
  };

  const manageSubscription = () => {
    toast.show(st.toastManage, { undo: false });
    if (STORE_SUBSCRIPTIONS) Linking.openURL(STORE_SUBSCRIPTIONS).catch(() => {});
  };

  const onSignOut = async () => {
    await signOut();
    router.replace('/sign-in');
    toast.show(st.toastOut, { undo: false });
  };

  const onDelete = async () => {
    setDeleteOpen(false);
    await deleteAccount();
    router.replace('/sign-in');
    toast.show(st.toastDel, { undo: false });
  };

  return (
    <>
      <Screen scroll background="grouped" paddingTop={4} paddingBottom={44} style={{ gap: 14 }}>
        <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 8 }}>
          <Pressable
            testID="settings-back"
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={a11y.back}
            hitSlop={10}
            // 40 tall in the prototype: the icon sits at the top of a line box
            // 28 high (the button's own 13.3 px font), inside 6 pt padding.
            style={{ paddingTop: 6, paddingBottom: 12 }}
          >
            <View style={{ transform: [{ scaleX: dir.isRTL ? -1 : 1 }] }}>
              <Icon name="back" size={22} strokeWidth={1.7} />
            </View>
          </Pressable>
          <Text token="title">{t.set_t}</Text>
        </View>

        {/* Profile */}
        <View
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            gap: 14,
            backgroundColor: surface.white,
            borderRadius: 18,
            padding: 14,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: ink.base,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text token="title" size={19} color={surface.white}>
              {firstName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text token="title" numberOfLines={1} testID="settings-name">
              {session?.name ?? ''}
            </Text>
            {/* The prototype falls back to its demo user's role here
                ("Founder · Qahwa House"); a real account without a job
                title shows nothing — BUILD-REVIEW.md §2.19. */}
            {session?.jobTitle ? (
              <Text token="caption" color={ink.s4} numberOfLines={1}>
                {session.jobTitle}
              </Text>
            ) : null}
          </View>
          <View
            style={{
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: pro ? ink.base : surface.fill,
            }}
          >
            <Text token="micro" weight="600" color={pro ? surface.white : ink.s4}>
              {pro ? st.pro : st.free}
            </Text>
          </View>
        </View>

        {!pro ? (
          <Pressable
            testID="settings-pro"
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 14,
              backgroundColor: ink.base,
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 16,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                backgroundColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="star" size={20} color={surface.white} strokeWidth={1.9} />
            </View>
            <Text token="bodyL" weight="600" color={surface.white} style={{ flex: 1 }}>
              {st.proT}
            </Text>
            <ForwardChevron color={surface.white} />
          </Pressable>
        ) : null}

        <SettingsCard>
          <AccordionRow
            testID="settings-reminders"
            tile={<RowTile icon="bell" {...settingsTile.reminders} />}
            label={st.remind}
            value={`${nudgeLabel} · ${prefs.focusMinutes}${inline.minSuffixShort}`}
            open={open === 'reminders'}
            onToggle={() => toggle('reminders')}
          />
          {open === 'reminders' ? (
            <AccordionPanel>
              <View style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, ...rowRule }}>
                <Text token="body">{t.set_rem}</Text>
                <Segmented<NudgeStyle>
                  testID="nudge"
                  options={t.nudges.map(([key, label]) => ({ key: key as NudgeStyle, label: label ?? '' }))}
                  value={prefs.nudgeStyle}
                  onPick={(nudgeStyle) => setPrefs({ nudgeStyle })}
                />
                <Text token="caption" lh={18.85} color={ink.s3} testID="nudge-desc">
                  {inline.nudgeDesc[prefs.nudgeStyle]}
                </Text>
              </View>
              <View style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, ...rowRule }}>
                <Text token="body">{t.set_focus}</Text>
                <Segmented<Prefs['focusMinutes']>
                  testID="focus"
                  options={FOCUS_OPTIONS.map((m) => ({ key: m, label: `${m} ${t.min}` }))}
                  value={prefs.focusMinutes}
                  onPick={pickFocus}
                />
              </View>
              <View
                style={{
                  flexDirection: dir.row,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                }}
              >
                <Text token="body">{t.set_quiet}</Text>
                <LTRText token="bodyS" color={ink.s4}>
                  {t.set_quietV}
                </LTRText>
              </View>
            </AccordionPanel>
          ) : null}

          <AccordionRow
            testID="settings-notifications"
            tile={<RowTile icon="phone" {...settingsTile.notifications} />}
            label={inline.notifications}
            value={inline.on}
            open={open === 'notifications'}
            onToggle={() => toggle('notifications')}
          />
          {open === 'notifications' ? (
            <AccordionPanel>
              <Pressable
                testID="settings-os-notifications"
                onPress={openPhoneSettings}
                accessibilityRole="link"
                style={{
                  flexDirection: dir.row,
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  ...rowRule,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text token="body">{inline.allowNotifications}</Text>
                  <Text token="micro" color={ink.s4}>
                    {inline.managedInSettings}
                  </Text>
                </View>
                <Text token="caption" weight="600" color={status.successFg}>
                  {inline.notificationsOn}
                </Text>
                <ForwardChevron />
              </Pressable>
              <ToggleRow
                testID="settings-sound"
                label={inline.sound}
                on={prefs.sound}
                onToggle={() => setPrefs({ sound: !prefs.sound })}
              />
              <ToggleRow
                testID="settings-vibration"
                label={inline.vibration}
                on={prefs.vibration}
                onToggle={() => setPrefs({ vibration: !prefs.vibration })}
              />
            </AccordionPanel>
          ) : null}

          <AccordionRow
            testID="settings-channels"
            tile={<RowTile icon="msg" {...settingsTile.channels} />}
            label={t.set_ch}
            value={`${channelsOn}${inline.onSuffix}`}
            open={open === 'channels'}
            onToggle={() => toggle('channels')}
          />
          {open === 'channels' ? (
            <AccordionPanel>
              {t.chans.map(([key, label]) => {
                const channel = key as Channel;
                const on = prefs.channels[channel];
                return (
                  <ToggleRow
                    key={channel}
                    testID={`settings-channel-${channel}`}
                    label={label ?? ''}
                    on={on}
                    offColour={surface.trackOffChannel}
                    onToggle={() => setPrefs({ channels: { ...prefs.channels, [channel]: !on } })}
                    lead={
                      <Icon
                        name={channel === 'call' ? 'phone' : channel === 'email' ? 'mail' : 'msg'}
                        size={20}
                        color={typeColour[channel].fg}
                        strokeWidth={1.9}
                      />
                    }
                  />
                );
              })}
            </AccordionPanel>
          ) : null}

          {/* Language is not an accordion: the switch sits on the row. */}
          <View
            style={{
              flexDirection: dir.row,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              paddingHorizontal: 16,
              ...rowRule,
            }}
          >
            <View style={{ flexDirection: dir.row, alignItems: 'center', gap: 12 }}>
              <RowTile icon="globe" bg={surface.fill} fg={ink.s2} />
              <Text token="body">{t.set_lang}</Text>
            </View>
            <View
              style={{ flexDirection: dir.row, backgroundColor: surface.langTrack, borderRadius: 999, padding: 3, gap: 2 }}
            >
              {LANGUAGES.map((option) => {
                const on = option.key === lang;
                return (
                  <Pressable
                    key={option.key}
                    testID={`settings-lang-${option.key}`}
                    onPress={() => setLang(option.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: on ? ink.base : 'transparent',
                    }}
                  >
                    <Text token="caption" color={on ? surface.white : ink.base}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <AccordionRow
            testID="settings-privacy"
            tile={<RowTile icon="lock" {...settingsTile.privacy} />}
            label={st.privacy}
            open={open === 'privacy'}
            onToggle={() => toggle('privacy')}
            last
          />
          {open === 'privacy' ? (
            <AccordionPanel>
              <ToggleRow
                testID="settings-marketing"
                label={st.mkt}
                sub={st.mktS}
                on={prefs.marketing}
                onToggle={() => setMarketing(!prefs.marketing)}
              />
              <LinkRow label={acc.si.privL} onPress={() => router.push('/legal?tab=privacy')} />
              <LinkRow label={acc.si.termsL} onPress={() => router.push('/legal?tab=terms')} />
              {/* The export request itself is a PrivacyRequest row once the
                  backend exists; the promise to the user is the toast. */}
              <LinkRow
                testID="settings-export"
                label={st.export}
                onPress={() => toast.show(st.toastExp, { undo: false })}
                last
              />
            </AccordionPanel>
          ) : null}
        </SettingsCard>

        <SettingsCard>
          <Pressable
            testID="settings-coffee"
            onPress={() => setTipOpen(true)}
            accessibilityRole="button"
            style={{
              flexDirection: dir.row,
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: surface.white,
              ...rowRule,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                backgroundColor: settingsTile.coffee.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="coffee" size={18} color={settingsTile.coffee.fg} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text token="body" weight="500">
                {st.coffee}
              </Text>
              <Text token="micro" color={ink.s4}>
                {st.coffeeS}
              </Text>
            </View>
            <ForwardChevron />
          </Pressable>
          {pro ? (
            <LinkRow label={st.manage} onPress={manageSubscription} background={surface.white} last />
          ) : (
            // Restoring needs the store SDKs (StoreKit `AppStore.sync()`, Play
            // `queryPurchasesAsync`), which wait on the developer accounts.
            <LinkRow
              testID="settings-restore"
              label={st.restore}
              onPress={() => toast.show(setx.pw.toastRestore, { undo: false })}
              background={surface.white}
              last
            />
          )}
        </SettingsCard>

        <View
          style={{
            flexDirection: dir.row,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingVertical: 2,
            paddingHorizontal: 4,
          }}
        >
          <Pressable
            testID="settings-sign-out"
            onPress={onSignOut}
            accessibilityRole="button"
            style={{
              height: 40,
              paddingHorizontal: 16,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: surface.line,
              backgroundColor: surface.white,
              justifyContent: 'center',
            }}
          >
            <Text token="bodyS" weight="500">
              {t.set_out}
            </Text>
          </Pressable>
          <Text token="micro" color={ink.s6}>
            {st.ver}
          </Text>
          <Pressable
            testID="settings-delete"
            onPress={() => setDeleteOpen(true)}
            accessibilityRole="button"
            style={{ height: 40, paddingHorizontal: 4, justifyContent: 'center' }}
          >
            <Text token="bodyS" weight="500" color={status.danger}>
              {st.del}
            </Text>
          </Pressable>
        </View>
      </Screen>

      <TipSheet
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        onBuy={() => {
          // A consumable in-app purchase (tip_small / tip_regular /
          // tip_large) once the store accounts exist — never a payment link.
          setTipOpen(false);
          toast.show(st.toastTip, { undo: false });
        }}
      />
      <DeleteSheet open={deleteOpen} onCancel={() => setDeleteOpen(false)} onConfirm={onDelete} />

      <Toast />
    </>
  );
}

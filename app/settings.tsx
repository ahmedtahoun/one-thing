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
import Constants from 'expo-constants';
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
import { PhotoSheet } from '@/features/people/PhotoSheet';
import { DeleteSheet, TipSheet } from '@/features/settings/sheets';
import { Avatar } from '@/ui/Avatar';
import { PlanBadge } from '@/ui/PlanBadge';
import { ForwardChevron } from '@/ui/ForwardChevron';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { LTRText, Text } from '@/ui/Text';
import { Toast, useToast } from '@/ui/Toast';
import { ink, settingsTile, status, surface, typeColour } from '@/design/tokens';
import { useDirection, useLanguage } from '@/i18n/LanguageProvider';
import type { Lang } from '@/content/strings';
import type { LanguageChoice } from '@/i18n/dialect';
import { useAccount } from '@/lib/account';
import { useSync } from '@/lib/sync/SyncProvider';
import { canSyncNow, isTrouble, showsRow, syncLine } from '@/features/settings/sync-state';
import {
  canTurnOn as canTurnOnReminders,
  isTrouble as remindersTrouble,
  reminderLine,
  showsRow as showsReminderRow,
} from '@/features/settings/reminder-state';
import { chatTime } from '@/features/people/time';
import { TIP_PRODUCTS, buyTip, manageSubscription as openStoreSubscriptions } from '@/features/paywall/purchases';
import { added } from '@/content/additions';
import { track } from '@/lib/analytics/track';
import { ME_PHOTO, usePhotos } from '@/lib/photos';
import { requestExport } from '@/lib/privacy-request';
import { requestAppReview } from '@/lib/store-review';
import { SUPPORT_EMAIL, supportMailUrl } from '@/lib/support';
import { POLICY_VERSION, recordConsent } from '@/lib/consent';
import type { Channel, NudgeStyle, Prefs } from '@/lib/model-types';
import { useNotifications } from '@/lib/notifications/NotificationsProvider';
import { usePrefs } from '@/lib/prefs';
import { CHASE_SETTINGS, setChase, useChase } from '@/lib/chase';
import { barSupported, setBarOn, useBarOn } from '@/lib/today-bar';
import { useSession } from '@/lib/session';
import { useTasks } from '@/lib/tasks';
import { isPro } from '@/policy/entitlements';

type Panel = 'reminders' | 'notifications' | 'channels' | 'privacy';

/** Names of the two languages, each in itself — the same in both UIs. */
/** English, Gulf Arabic and Egyptian: the last two differ only in their words (src/i18n/dialect.ts). */
const LANGUAGES: { key: LanguageChoice; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'ar', label: 'العربية' },
  { key: 'eg', label: 'مصري' },
];

const FOCUS_OPTIONS = [25, 45, 90] as const;

/** Where "Manage subscription" goes on each store. DATA_MODEL § Integrations. */
const STORE_SUBSCRIPTIONS = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
});

export default function Settings() {
  const { t, acc, setx, inline, a11y, lang, choice, setChoice, theme, setTheme } = useLanguage();
  const dir = useDirection();
  const { session } = useSession();
  const { prefs, setPrefs } = usePrefs();
  const { allowed, ask, turnOn, scheduled, remindable } = useNotifications();
  // Reminders could fail entirely and say nothing (BUILD-REVIEW §2.101).
  const reminders = reminderLine({ supported: Platform.OS !== 'web', allowed, scheduled, remindable });
  const { setFocusMinutes } = useTasks();
  const { signOut, deleteAccount } = useAccount();
  const toast = useToast();
  // Syncing used to fail in silence: the provider set 'error' and wrote a
  // console line nobody sees (BUILD-REVIEW §2.98).
  const { status: syncStatus, lastSyncedAt, syncNow } = useSync();
  const line = syncLine(syncStatus, lastSyncedAt);
  // Fixed per render rather than ticking: the row reads "Last synced 14:32",
  // which does not need a clock behind it.
  const now = new Date();
  const chase = useChase();
  const barOn = useBarOn();
  const st = setx.st;

  const [open, setOpen] = useState<Panel | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const hasPhoto = usePhotos().has(ME_PHOTO);

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
      recordConsent([
        { kind: 'marketing', granted, version: POLICY_VERSION, at: new Date().toISOString(), source: 'settings' },
      ]).catch(() => {});
    },
    [setPrefs]
  );

  const pickFocus = (minutes: Prefs['focusMinutes']) => {
    setPrefs({ focusMinutes: minutes });
    // The prototype keeps one focus length: changing it here changes today's
    // One Thing card too.
    setFocusMinutes(minutes);
  };

  /**
   * SCREENS.md § 21–23 says this row "opens OS settings". It asks first when
   * the OS will still show its own prompt — being sent to Settings before
   * ever being asked is a dead end — and otherwise does what the spec says.
   */
  const openPhoneSettings = async () => {
    if (allowed !== true && (await ask())) return;
    toast.show(inline.openingSettings, { undo: false });
    if (Platform.OS !== 'web') Linking.openSettings().catch(() => {});
  };

  const manageSubscription = async () => {
    toast.show(st.toastManage, { undo: false });
    // The store's own screen where there is a store connection; its web page
    // otherwise.
    if (!(await openStoreSubscriptions()) && STORE_SUBSCRIPTIONS) Linking.openURL(STORE_SUBSCRIPTIONS).catch(() => {});
  };

  const rateApp = async () => {
    if ((await requestAppReview()) === 'unavailable') toast.show(added(lang).rateUnavailable, { undo: false });
  };

  const helpAndFeedback = async () => {
    const copy = added(lang);
    const body = `${copy.helpBody}\n\n\n—\nThe One Thing ${Constants.expoConfig?.version ?? ''} · ${Platform.OS} ${Platform.Version}`;
    try {
      await Linking.openURL(supportMailUrl(copy.helpSubject, body));
    } catch {
      toast.show(copy.helpNoMail.replace('{email}', SUPPORT_EMAIL), { undo: false });
    }
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
          <Pressable
            testID="settings-photo"
            onPress={() => setPhotoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={added(lang).photo.hint}
          >
            <Avatar name={session?.name ?? firstName} contactId={ME_PHOTO} size={56} />
            <View
              style={{
                position: 'absolute',
                bottom: -2,
                ...(dir.isRTL ? { left: -2 } : { right: -2 }),
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: surface.white,
                backgroundColor: ink.solid,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="camera" size={11} color={surface.white} strokeWidth={2.2} />
            </View>
          </Pressable>
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
          <PlanBadge plan={session?.plan ?? 'free'} testID="settings-plan" />
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
              backgroundColor: ink.solid,
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
                backgroundColor: surface.onInkTile,
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
              <View style={{ gap: 6, paddingVertical: 14, paddingHorizontal: 16, ...rowRule }}>
                <Text token="body">{added(lang).sent.chaseTitle}</Text>
                <Text token="caption" color={ink.s4}>
                  {added(lang).sent.chaseHint}
                </Text>
                <View style={{ flexDirection: dir.row, flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                  {CHASE_SETTINGS.map((option) => {
                    const on = chase === option;
                    const o = added(lang).sent.chaseOptions;
                    const label = option === 'auto' ? o.auto : option === 'off' ? o.off : option === 1 ? o.d1 : option === 2 ? o.d2 : option === 3 ? o.d3 : o.d7;
                    return (
                      <Pressable
                        key={String(option)}
                        testID={`settings-chase-${option}`}
                        onPress={() => void setChase(option)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? ink.solid : surface.fill }}
                      >
                        <Text token="bodyS" weight="600" color={on ? surface.white : ink.s2}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
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
            // SCREENS.md § 21–23 shows this row's value as "On". The handoff
            // has no wording for the other case, so when the user has
            // actually refused, the row carries no value rather than
            // claiming one — BUILD-REVIEW.md §2.25.
            value={allowed === false ? '' : inline.on}
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
                {/* The handoff has no "Off" string, so the green "On" is
                    simply absent once the user has refused. */}
                {allowed !== false ? (
                  <Text token="caption" weight="600" color={status.successFg}>
                    {inline.notificationsOn}
                  </Text>
                ) : null}
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
                const on = option.key === choice;
                return (
                  <Pressable
                    key={option.key}
                    testID={`settings-lang-${option.key}`}
                    onPress={() => setChoice(option.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: on ? ink.solid : 'transparent',
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

          {/* Dark mode lives with the person's own settings, not on the Home header. */}
          <ToggleRow
            testID="settings-dark"
            label={added(lang).today.darkMode}
            on={theme === 'dark'}
            onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            lead={<RowTile icon={theme === 'dark' ? 'moon' : 'sun'} bg={surface.fill} fg={ink.s2} />}
          />

          {barSupported ? (
            <ToggleRow
              testID="settings-today-bar"
              label={added(lang).bar.toggle}
              sub={added(lang).bar.toggleSub}
              // `barOn` is null until the stored choice is read. Both lines
              // treat that window as off, which is now the default, so the
              // row cannot show on and then snap off a moment later.
              on={barOn === true}
              onToggle={() => void setBarOn(barOn !== true)}
              lead={<RowTile icon="clock" bg={surface.fill} fg={ink.s2} />}
            />
          ) : null}

          <LinkRow
            testID="settings-recap"
            label={added(lang).recap.entry}
            onPress={() => router.push('/recap')}
            tile={<RowTile icon="spark" bg={surface.fill} fg={ink.s2} />}
          />

          <LinkRow
            testID="settings-saved"
            label={added(lang).saved.title}
            onPress={() => router.push('/templates')}
            tile={<RowTile icon="note" bg={surface.fill} fg={ink.s2} />}
          />

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
              {/* The toast promises "within 24 hours", so the request has to
                  outlive the tap: it queues on the device and goes up as a
                  privacy_request row, which is what the admin panel counts
                  its 30-day deadline from. The export itself is a server job
                  — see src/lib/privacy-request.ts. */}
              <LinkRow
                testID="settings-export"
                label={st.export}
                onPress={() => {
                  void requestExport();
                  toast.show(st.toastExp, { undo: false });
                }}
                last
              />
            </AccordionPanel>
          ) : null}
        </SettingsCard>

        {showsReminderRow(reminders) ? (
          <SettingsCard>
            <Pressable
              testID="settings-reminder-state"
              onPress={() => (canTurnOnReminders(reminders) ? void turnOn() : undefined)}
              accessibilityRole={canTurnOnReminders(reminders) ? 'button' : 'text'}
              accessibilityLabel={added(lang).reminders.title}
              disabled={!canTurnOnReminders(reminders)}
              style={{ flexDirection: dir.row, alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text token="body" weight="600" color={remindersTrouble(reminders) ? status.dangerFg : undefined}>
                  {reminders.kind === 'off' ? added(lang).reminders.off : added(lang).reminders.title}
                </Text>
                <Text testID="settings-reminder-line" token="micro" lh={17} color={ink.s4}>
                  {reminders.kind === 'off'
                    ? added(lang).reminders.offHow
                    : reminders.kind === 'on'
                      ? added(lang).reminders.on.replace('{n}', String(reminders.scheduled))
                      : reminders.kind === 'broken'
                        ? added(lang).reminders.broken.replace('{n}', String(reminders.expected))
                        : added(lang).reminders.nothing}
                </Text>
              </View>
              {canTurnOnReminders(reminders) ? (
                <Text token="caption" weight="600">
                  {added(lang).reminders.turnOn}
                </Text>
              ) : null}
            </Pressable>
          </SettingsCard>
        ) : null}

        {showsRow(line) ? (
          <SettingsCard>
            <Pressable
              testID="settings-sync"
              onPress={() => {
                if (!canSyncNow(line)) return;
                toast.show(added(lang).sync.started, { undo: false });
                void syncNow();
              }}
              accessibilityRole="button"
              accessibilityLabel={added(lang).sync.title}
              disabled={!canSyncNow(line)}
              style={{ flexDirection: dir.row, alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text token="body" weight="600" color={isTrouble(line) ? status.dangerFg : undefined}>
                  {line.kind === 'syncing'
                    ? added(lang).sync.syncing
                    : line.kind === 'error'
                      ? added(lang).sync.failed
                      : added(lang).sync.title}
                </Text>
                <Text testID="settings-sync-line" token="micro" lh={17} color={ink.s4}>
                  {line.kind === 'synced'
                    ? added(lang).sync.synced.replace('{t}', chatTime(line.at, now, lang))
                    : line.kind === 'pending'
                      ? added(lang).sync.pending
                      : line.kind === 'error'
                        ? line.lastAt
                          ? added(lang).sync.failedSince.replace('{t}', chatTime(line.lastAt, now, lang))
                          : added(lang).sync.failedNever
                        : added(lang).sync.syncing}
                </Text>
              </View>
              {canSyncNow(line) ? (
                <Text token="caption" weight="600">
                  {added(lang).sync.now}
                </Text>
              ) : null}
            </Pressable>
          </SettingsCard>
        ) : null}

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
              ...(pro ? rowRule : null),
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
          {/* Restore purchases lives on the paywall, where a purchase is made; the
              store requires it be reachable there, and it only clutters here. */}
          {pro ? <LinkRow label={st.manage} onPress={manageSubscription} background={surface.white} last /> : null}
        </SettingsCard>

        <SettingsCard>
          <LinkRow
            testID="settings-rate"
            label={added(lang).rateApp}
            onPress={rateApp}
            background={surface.white}
            tile={<RowTile icon="star" filled {...settingsTile.rate} />}
          />
          <LinkRow
            testID="settings-help"
            label={added(lang).helpFeedback}
            onPress={helpAndFeedback}
            background={surface.white}
            tile={<RowTile icon="msg" {...settingsTile.help} />}
            last
          />
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
        onBuy={async (size, cups) => {
          // A consumable in-app purchase, never a payment link. The thanks
          // waits for the store to take the money: before, it was said for a
          // purchase that never happened (§2.34).
          setTipOpen(false);
          const product = TIP_PRODUCTS[size] ?? 'tip_small';
          const result = await buyTip(product, cups);
          if (result === 'started') {
            track({ name: 'tip', product });
            toast.show(st.toastTip, { undo: false });
          } else if (result === 'failed') {
            toast.show(added(lang).storeFailed, { undo: false });
          }
        }}
      />
      <DeleteSheet open={deleteOpen} onCancel={() => setDeleteOpen(false)} onConfirm={onDelete} />

      <PhotoSheet open={photoOpen} contactId={ME_PHOTO} hasPhoto={hasPhoto} onClose={() => setPhotoOpen(false)} />
      <Toast />
    </>
  );
}

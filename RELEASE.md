# Shipping The One Thing — from this repo to a build in review

This is the path from the current repo to a build sitting in review, in the
order the steps actually unblock each other. Every item says who it belongs to.
Nothing here is a design change; where a step needs a decision that cannot be
reversed later, it is marked **irreversible**.

The build today is every screen in the handoff bar the dead one, in both
languages, with the notification layer, the sync engine and the verification
harness behind them. What it does *not* have is every piece that touches a
store or a live server: real sign-in, purchases, and a Supabase project.
Those are the three things the accounts unlock.

---

## 0. The accounts

Both developer accounts exist and have shipped apps before, so enrolment,
Agreements/Tax/Banking and Play's closed-testing requirement are all behind
us. Two things are still worth stating, because they catch people who have
shipped before:

- **Sign in with Apple is configured in the Developer account, not App Store
  Connect** — a Services ID, a `.p8` key, the Team ID and the Key ID. Those
  four values go into Supabase, not into this repo.
- **Google sign-in does not come from Play Console.** It comes from a **Google
  Cloud** project: OAuth 2.0 client IDs, one Web (this is the one Supabase
  needs) plus iOS and Android. The Android client needs the release signing
  certificate's SHA-1, which only exists after the first EAS production build.

---

## 1. The three irreversible decisions

### 1.1 Bundle ID / package name — **decided**
One identifier on both platforms, from the `onlyonething.app` domain in the
normal reverse-DNS form:

```
ios.bundleIdentifier   app.onlyonething
android.package        app.onlyonething
scheme                 onlyonething
```

The old ids carried `.ios` / `.android` suffixes, which worked but read oddly
in every sign-in and purchase configuration. The `scheme` moved with them: it
is the deep-link scheme the OAuth redirect URIs are built from, so it has to
be settled before the Google Cloud clients are created. Nothing referenced the
old scheme.

If the identifier was meant to be the literal string `onlyonething.app` rather
than its reverse-DNS form, that is a one-line change — but only until the
first upload, after which neither store will move it.

### 1.2 Product IDs for the subscription — **decided**
Both periods ship, at the handoff's prices. Permanent per store once created:

| | Apple (StoreKit 2) | Google (Play Billing) |
|---|---|---|
| Monthly | `pro_monthly` — $4.99 | base plan, monthly |
| Yearly | `pro_yearly` — $35.88, 7-day intro trial | base plan, yearly + 7-day free trial offer |
| Tips (consumables) | `tip_small` 0.99 · `tip_regular` 2.99 · `tip_large` 4.99 | same three |

The paywall already offers both cards and its fine print is written word-for-word
in `SCREENS.md` §24 — what you configure in the stores has to match that text
exactly, including `$35.88/year`. One thing to set while you are in there:
Arabic-locale pricing in SAR is a separate price tier per territory, and the
app shows prices LTR inside Arabic text, so a SAR tier needs looking at on the
Arabic paywall once it is live.

### 1.3 Data region — **still open, and now the only blocker here**
PDPL applies and most of the seed data is Saudi/Gulf. The Supabase region is
chosen when the project is created and cannot be moved afterwards; it also
decides what the Privacy Policy has to say. Nothing server-side can start
until this is picked.

---

## 2. Apple, step by step

1. **Register `app.onlyonething`** in Certificates, Identifiers & Profiles,
   with **Sign in with Apple** and **Push Notifications** enabled.
   Notifications in this build are local, so push is not strictly needed yet —
   but adding the capability later means a new provisioning profile, so turn it
   on now.
2. **Create the app record** in App Store Connect.
3. **Sign in with Apple server-side**: a Services ID, a private key (`.p8`),
   your Team ID and Key ID. These four values go into Supabase →
   Authentication → Providers → Apple. Nothing in this repo stores them.
4. **Create the IAP products** from §1.2, with the 7-day introductory offer on
   the yearly. Fill in the subscription group, localisations (EN **and** AR),
   and the review screenshot each product needs, or the submission is blocked
   on the products rather than the build.
5. **EU trader status** — if this account has not submitted since the rule
   came in, App Store Connect will not accept an EU submission without it, and
   a verified address, phone and email then appear publicly on the listing.

## 3. Google, step by step

1. **Create the app** with the `app.onlyonething` package, EN-US and AR
   listings.
2. **Google Cloud Console** (separate from Play): a project, then OAuth 2.0
   client IDs — a **Web** client (this is the one Supabase needs), plus **iOS**
   and **Android** clients. The Android client needs the release signing
   certificate's SHA-1, which comes from EAS after the first production build,
   so this step straddles step 4 below.
3. **Supabase** → Providers → Google: the Web client ID and secret.
4. **Play Billing**: the subscription with monthly and yearly base plans, the
   7-day free-trial offer, and the three consumable tips. Product IDs from §1.2.
5. **A service account JSON** for `eas submit` to upload builds without you.
6. **Data safety form** and the **account-deletion URL** (§7).

---

## 4. The code that still has to be written

All 21 screens are now built, the sync engine is written and tested, and
server-side deletion is in place. What is left is almost entirely the wiring
that needs your two accounts.

**Real sign-in is the keystone.** `src/lib/sync/SyncProvider.tsx` waits on a
Supabase auth session (`db.auth.getSession()`), and `app/sign-in.tsx` never
creates one — it records the chosen provider and hands to `/setup`, which
opens a session held only on the device. So the whole sync layer, several
thousand tested lines of it, is dormant until Apple and Google sign-in are
real. Do this one first; most of the rest follows from it.

| Work | Where it lands | Blocked on |
|---|---|---|
| Supabase project, apply `supabase/migrations/0001_init.sql` and `0002_sync.sql`, fill `.env` | `.env` (see `.env.example`); `npm run schema:check` applies both to a throwaway Postgres first | §1.3 region decision |
| Real Apple + Google sign-in replacing the stub | `app/sign-in.tsx`, then `supabase.auth.signInWithIdToken`. Needs `expo-apple-authentication` and a Google sign-in module | Apple §2.4, Google §3.4 |
| Purchases | `src/features/paywall/purchases.ts` answers `'unavailable'` on purpose, so nobody becomes Pro on a purchase that never happened. Plan must come from the store receipt via the backend (App Store Server Notifications / Play RTDN), not from the client | §2.5 / §3.5 |
| Restore purchases, Manage subscription, the tip jar | `app/settings.tsx` ~495 and ~555 show their toasts and nothing else | store products |
| The assistant / capture parsing | `src/lib/parse/local.ts` is a real local parser with the 10/day Free meter (`assistant-meter.ts`); a hosted model would replace or back it | an AI provider, if you want one |
| Notification delivery on a real device | rules are written and unit-tested; never once delivered (BUILD-REVIEW §2.26) | a build on hardware |
| Store webhooks → `plan` | nothing exists; the admin panel also assumes it | backend + store products |

Not in this repo: the admin panel (13 screens), now being built by a third
developer, and the public website, which still has no owner. The admin panel
reads the same Supabase project, so it is waiting on §1.3 too, and both it and
this app need the store webhooks in the last row above — without them nobody's
`plan` ever changes and the admin panel's subscription screens have nothing to
show.

## 5. Two config fixes already applied

- `app.json` pointed `android.adaptiveIcon.foregroundImage` at
  `./assets/adaptive-icon.png`, **which has never existed in this repo**. The
  Android build would have failed on the first attempt. It now points at the
  three `android-icon-*.png` files that are actually there. The foreground is
  512×512 where Expo wants 1024×1024 — it will build, slightly soft.
- `eas.json` did not exist, so no EAS build could be started at all. Added with
  `development` / `preview` / `production` profiles and remote versioning.

Still needed in `app.json` once you have an Expo account:
`extra.eas.projectId`, which `eas init` writes for you.

## 6. Build and test tracks

```
npm i -g eas-cli && eas login && eas init
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios    # needs the ASC app ID + Apple ID
eas submit --platform android  # needs the service account JSON
```

Play's closed-testing requirement — roughly 12 testers for 14 continuous days
before the Production track unlocks — applies to personal accounts opened
after 13 Nov 2023 that have not yet cleared it. This account has shipped
before, so it does not apply, and that removes two to three weeks of calendar
time from the plan. Worth one glance at the Production track in Console to
confirm it is open rather than assuming.

Use the tracks anyway: `preview` to TestFlight and to an internal Play track
is where the notification delivery and the purchase flow get tested, and
neither has ever run on hardware.

## 7. What both stores will ask for, and do not have yet

- **Three public pages at a real domain** — Privacy, Terms, and a deletion
  route. Play requires a web-accessible deletion path, not only the in-app
  one. `app/legal.tsx` is the in-app copy of the text; nobody owns the website
  (BUILD-REVIEW §3).

  **The domain in the app's copy no longer matches the bundle ID.** The
  handoff's copy says `theonething.app`, and it is user-facing in six places,
  in both languages: `privacy@theonething.app` ×4 (`src/content/strings.ts`
  1057, 1061, 1073, 1165, 1173) and `theonething.app/delete` ×2 (1061, 1214).
  If the domain is now `onlyonething.app`, all six change, that mailbox has to
  exist, and `/delete` has to resolve — a reviewer can and does click them.
  Not changed on a guess, because the handoff set that copy and two of the
  strings are Arabic. Say which domain is real and it is a five-minute edit.
- **Legal review of that text.** What ships in `ACC` is plain-English summary
  copy. It is good UX writing and it is not a policy that satisfies PDPL or
  GDPR.
- **App Privacy answers** (Apple) and the **Data safety form** (Play), both
  consistent with the analytics event list in `DATA_MODEL.md` and with every
  third-party SDK you end up adding. Apple needs a `PrivacyInfo.xcprivacy`
  manifest; EAS generates one from your plugins, so check it matches what you
  declared.
- **Screenshots** per device size, in both languages — the harness in
  `scripts/` already renders every screen at 402×874 in EN and AR, so these
  can come out of it rather than out of a designer's afternoon.
- **A reviewer demo account.** The app is behind a sign-in wall. Apple will
  reject it if the reviewer cannot get in. Once auth is real, create a seeded
  account and put the credentials in the review notes.
- **Export compliance** — answered ahead of time now, via
  `ITSAppUsesNonExemptEncryption: false` in `app.json`.
- **Age rating / content questionnaire** on both stores.

## 8. Review risks specific to this app

1. **Account deletion.** Apple 5.1.1(v): an app with account creation must
   offer in-app deletion. This is now handled — `src/lib/account.ts` deletes
   the server rows first, keeps the deletion pending if the server cannot be
   reached, and finishes it on the next launch that can. Worth testing on a
   real build, because it is the single rejection reason easiest to trip.
2. **Sign in with Apple parity.** Because the app offers Google sign-in, Apple
   requires Sign in with Apple as an equivalent option. The design already
   puts it first with equal prominence — keep it that way; it is a store rule,
   not a style choice, and `app/sign-in.tsx` says so at the top.
3. **Nothing is ever sent automatically.** Compose hands a draft to WhatsApp,
   Mail or the dialler and the user presses send. Keep it that way. An app
   that sends messages on a user's behalf is a different review conversation
   and this one stays well clear of it.
4. **The microphone permission is declared but never exercised on a device.**
   `app.json` asks for `RECORD_AUDIO` and ships two iOS purpose strings.
   `src/lib/speech.ts` uses the Web Speech API where the platform has one —
   so dictation works on web and nowhere else, and both screens fall back to
   typing. Which recogniser to use is still an open decision (BUILD-REVIEW
   §2.35). Either it ships in v1 or those three declarations come out before
   submitting: a permission you never exercise invites a reviewer question you
   cannot answer, and on Android `RECORD_AUDIO` is one Play asks about.
5. **`SCHEDULE_EXACT_ALARM`.** Also declared, and Play treats exact-alarm
   access as justify-or-remove. I read the module rather than guessing:
   `expo-notifications` calls `setExactAndAllowWhileIdle` when the permission
   is granted and falls back to `setAndAllowWhileIdle` when it is not
   (`ExpoSchedulingDelegate.kt:105`), so dropping the permission costs
   punctuality, not delivery — Android batches inexact alarms, so a 9:00
   reminder can arrive some minutes late. That is survivable for the evening
   nudge and awkward for the focus timer's end. Your call: keep it and justify
   it as a reminder app, or drop it and accept the window.
6. **Arabic completeness.** Four strings are still missing in Arabic — the
   three notification rows (§2.25) and "Plan tomorrow" (§2.30). An Arabic
   listing with English strings inside the app is the kind of thing a reviewer
   does notice.

---

---

## 9. What this plan does not cover

Written by auditing the repo against the handoff rather than against the plan,
because a plan can only miss what nobody has looked for. In order of what
would hurt most.

### 9.1 Nothing has ever run on a phone
Every one of the 202 drift probes, 30 pixel comparisons and 193 behavioural
checks runs `react-native-web` in Chromium. That is a real check — it caught
the Arabic double-mirror and the line-height error — but it is not the
platform you are shipping. Unverified on hardware: native RTL layout (iOS and
Android resolve `direction: 'rtl'` in their own layout engines, not CSS's),
IBM Plex Sans Arabic loading through `expo-font`, `expo-blur` on the tab bar,
shadows, safe areas on a notched device, every keyboard interaction, and all
five notifications. The first `preview` build is where a batch of small
surprises arrives, and there is no way to shorten that discovery except to do
it early.

### 9.2 There is no analytics, and no table to put it in — **built**
All seventeen events now exist, emitted from the code and landing in an
`analytics_event` table (migration `0003`). See BUILD-REVIEW §2.37 for the
decisions. What is still open: the admin panel's own queries, and whether a
vendor ever joins this — if one does, it brings an SDK, a privacy-manifest
entry and a Data safety answer with it.


### 9.3 The app promised a data download it could not do — **built**
The row was there all along — Settings → Privacy & data → "Download my data",
with the toast SCREENS.md § 21–23 specifies — and the tap did nothing but
show the toast. So the Privacy Policy's "Download or delete your data … from
Settings", in both languages, rested on a promise with no record of ever
having been made. A request now queues on the device and goes up as a
`privacy_request` row of type `export`, which is what the admin panel counts
its 30-day deadline from. BUILD-REVIEW §2.38.

**The export itself is still a server job**, and still unwritten: something
has to read every table for that user and email the result inside 24 hours.
Nothing on a phone can do that.


### 9.4 Support has a back end and no front door
`support_ticket` and `support_message` exist, and the admin panel has a
support inbox. The app has no Help or Contact screen at all (BUILD-REVIEW
§2.3, still open), so no ticket can ever arrive. Apple also requires a
**Support URL** in App Store Connect, which makes this a fourth public page
on the website nobody owns yet — or an in-app screen, which is the better
answer and is not designed.

### 9.5 Weekly recap is sold on a paywall that is now live
The paywall ships and lists Weekly recap as a Pro feature. It does not exist
in any screen, and the Pro gating matrix is still undefined (§2.1), so Free
currently gets everything except the assistant's 10-a-day limit. Advertising
a feature the app does not have is both a metadata problem at review and a
refund problem after it. Design it or take it off the card.

### 9.6 The assistant has no server, and its limit is on the wrong side
`.env.example` reserves `ANTHROPIC_API_KEY` for "the backend that fronts the
assistant", and there is no backend. The key cannot ship in the app — anyone
can read it out of the bundle — so this needs a Supabase Edge Function or
similar. The same host is needed for the store webhooks (App Store Server
Notifications / Play RTDN) that move a user's `plan`. And the Free limit of 10
requests a day lives in `src/lib/assistant-meter.ts`, on the device, where a
reinstall resets it; when the assistant costs money per call, the meter has to
move server-side.

### 9.7 Every fix will be a full store review
`expo-updates` is not installed, so there is no over-the-air channel: a typo
in Arabic copy means a new binary and another review. I removed the `channel`
keys I had put in `eas.json`, because they do nothing without that package and
would have read as if updates were configured. Adding OTA updates later is
easy; deciding now whether you want them is the point.

### 9.8 Sign in with Apple will hand you relay addresses
Apple's Hide My Email gives you `…@privaterelay.appleid.com`, and the real
address only on first authorisation, once. This app stores `email` on
`app_user`, shows it in Settings, and Compose mails contacts — not the user —
so the blast radius is small, but nothing in the code or the plan
acknowledges relay addresses, and "sign in with Google, then Apple" creates
two accounts for one person with no merge path.

### 9.9 Smaller, but real
- **Focus sessions never leave the device.** `focus_session` is in the schema
  and not in the sync engine's `COLUMNS`, so a new phone starts with no focus
  history. The daily total survives, because `one_thing.focus_minutes` syncs.
  The evening review's decisions are the same story (§2.29).
- **No crash or error reporting.** You will ship blind to anything the
  harness cannot see, which after §9.1 is a lot.
- **Supabase tier.** A free project pauses after inactivity, which is not a
  thing a live app survives. Budget the Pro tier, and set backups with it.
- **Store listing assets beyond screenshots** — Play's 512 icon and
  1024×500 feature graphic, both stores' descriptions and keywords, all in
  Arabic as well as English. Nobody has written the Arabic listing copy.
- **The Android adaptive icon foreground is 512×512** where Expo wants
  1024×1024. It builds; it will look slightly soft next to a sharp one.
- **The repo's default branch is still my working branch.** `main` is the
  trunk now — Settings → Branches, and I have no tool for it.

---

## What is actually left

With both accounts already shipping-ready and Play's tester gate behind us,
the calendar-time risks are gone and what remains is work:

1. **Pick the data region** (§1.3). Nothing server-side — not this app, not
   the admin panel — starts without it.
2. **Real Apple and Google sign-in** (§4). The keystone; the sync engine does
   nothing until it exists.
3. **The website**, three pages, and the domain question in §7.
4. **Purchases and the store webhooks**, which is what makes anyone Pro.
5. **A build on hardware**, because notifications and deletion have only ever
   been tested in a browser and in Postgres.

Of those, only (1) and the domain in §7 are waiting on you. The rest is ours.

What §9 adds to that list, in the order I would take it: get a `preview` build
onto a real phone (§9.1), decide analytics before the admin panel is built
around nothing (§9.2), and settle Weekly recap and the gating matrix (§9.5)
before the paywall is in front of a paying customer.

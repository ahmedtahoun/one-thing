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

**Real sign-in is written, and has never run.** Both flows end at
`signInWithIdToken`, which is what wakes the sync layer. What is missing is
only configuration: the Google client IDs in `.env` (see `.env.example`), and
Apple's Services ID and key in the Supabase dashboard. Until all of it is in
place `src/lib/auth/availability.ts` reports why, and the screen falls back to
the local session the app has always used — so this costs nothing while you
set the accounts up. BUILD-REVIEW §2.41.

| Work | Where it lands | Blocked on |
|---|---|---|
| Supabase project, apply all six migrations, fill `.env`, deploy the `assist` function | `.env` (see `.env.example`); `npm run schema:check` applies the whole sequence to a throwaway Postgres first | §1.3 region decision |
| ~~Real Apple + Google sign-in~~ — written, unrun | `src/lib/auth/`, wired into `app/sign-in.tsx`. Needs the client IDs and a build on a device | Apple §2.3, Google §3.2–3.3 |
| Purchases | `src/features/paywall/purchases.ts` answers `'unavailable'` on purpose, so nobody becomes Pro on a purchase that never happened. Plan must come from the store receipt via the backend (App Store Server Notifications / Play RTDN), not from the client | §2.5 / §3.5 |
| Restore purchases, Manage subscription, the tip jar | `app/settings.tsx` ~495 and ~555 show their toasts and nothing else | store products |
| ~~The assistant / capture parsing~~ — built, never called | `supabase/functions/assist` with the limit in `0005_assist.sql`; `src/lib/parse/local.ts` is the fallback. Needs deploying, and an API key to have ever run | a Supabase project |
| Notification delivery on a real device | rules are written and unit-tested; never once delivered (BUILD-REVIEW §2.26) | a build on hardware |
| ~~Store webhooks → `plan`~~ — written, never delivered to | `supabase/functions/app-store`, `supabase/functions/play-rtdn`, `0007_store_webhooks.sql`. Needs the certificates, the service account and a Pub/Sub subscription | a Supabase project + store products |
| A schedule for `lapse_expired_subscriptions()` and for `export` | the safety net for a lost expiry notification, and the export sweep; nothing calls either | a Supabase project |
| An email provider, to send an export | `supabase/functions/export` writes the file and records its path; sending it is the only step left | **your decision** |
| Purchases must send the Supabase user id | `startTrial` in `src/features/paywall/purchases.ts` says exactly what, and why it cannot be recovered later | whoever writes purchases |

The admin panel is now in this repo, under `admin/` — all 13 of ADMIN.md's
screens as a separate Next.js app, with its own checks in CI. It reads the
same Supabase project, so it waits on §1.3 as well, and it needs the store
webhooks in the row above: without them nobody's `plan` ever changes and its
subscription screens have nothing to show.

Still not in this repo at all: the public website, which has no owner.

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
`analytics_event` table (migration `0006`). BUILD-REVIEW §2.39 has the
decisions.

One correction to what this section first said. The admin panel is *not*
reading from nothing: dev 2 built its funnel and retention cohorts from the
entity tables instead — signed-in from `app_user`, "set first One Thing" from
`one_thing`, "3+ tasks" by counting them, trial and Pro from `subscription`,
and the cohorts from `active_day`. For those numbers that is arguably the
better source: state cannot be lost in transit the way an event can.

What the events add is everything that leaves no row behind:
`task_created`'s `via` (which capture route people actually use),
`compose_opened`'s channel, `send_confirmed`, `nudge_opened`, the focus
sessions, `review_closed`, and `paywall_viewed` — the funnel step between
"3+ tasks" and "started trial" that the panel currently has no way to show.
`signin` and `setup_done` also separate two steps the panel had to collapse:
its own comment says "Finished setup equals Signed in", and with the events it
no longer has to.

Still open: pointing the Growth screen at the new table, and whether a vendor
ever joins this — if one does, it brings an SDK, a privacy-manifest entry and
a Data safety answer with it.
### 9.3 The app promised a data download it could not do — **built**
The row was there all along — Settings → Privacy & data → "Download my data",
with the toast SCREENS.md § 21–23 specifies — and the tap did nothing but
show the toast. So the Privacy Policy's "Download or delete your data … from
Settings", in both languages, rested on a promise with no record of ever
having been made. A request now queues on the device and goes up as a
`privacy_request` row of type `export`, which is what the admin panel counts
its 30-day deadline from. BUILD-REVIEW §2.40.

**The export itself is now written too** — `supabase/functions/export` and
`0008_export.sql`, with the table list held to the database's own answer so it
cannot quietly go stale (BUILD-REVIEW §2.44). It needs a private `exports`
bucket and a schedule.

**One decision left there, and it is yours: an email provider.** The copy
promises "we'll email your data within 24 hours", and whoever sends it
processes a file containing someone's entire account. Until you pick one, the
file is written and the request is marked answered with its path, and the
admin panel's Privacy requests screen is where someone hands over a signed
link.


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

### 9.6 The assistant has no server, and its limit is on the wrong side — **built by dev 2**
`supabase/functions/assist` is now that server: the Claude key stays in the
function's environment, the note and the contact names are fenced as data
rather than instructions, and the answer has to fit a fixed schema that cannot
carry free text. The daily limit moved into the database with it
(`0005_assist.sql`), counted in the user's own time zone, spendable only by
the function's service role — so a reinstall no longer resets it.
BUILD-REVIEW §2.38.

Three decisions came with it, and they are yours:

- **Cost.** Opus 5.5 at low effort runs about 1–2 cents a note. Haiku 5.5
  should be measured against it before launch.
- **A hidden guard.** Quick capture and Brain dump stop at 200 a day per
  account, silently. Nothing tells the user.
- **Whose day.** The limit counts in the user's own time zone, so changing the
  phone's clock stretches an allowance a little.

**It has never called Claude.** There was no API key in the build
environment: `ANTHROPIC_API_KEY=… npx tsx scripts/try-assist.ts` runs the real
function code on the handoff's own sample sentences for about 20 cents.

The other thing the same host has to do — the **store webhooks** that move a
user's `plan` — is now written too: `supabase/functions/app-store` and
`supabase/functions/play-rtdn`, with `0007_store_webhooks.sql` behind them.
BUILD-REVIEW §2.42. They need deploying with `--no-verify-jwt`, Apple's root
certificate and a Play service account as secrets, and the Pub/Sub push
subscription pointed at the Play one. Neither has seen a real delivery.

Two things are still open there. `lapse_expired_subscriptions()` is the safety
net for a lost expiry notification and **nothing calls it yet** — it needs a
schedule. And the purchase itself has to carry the Supabase user id
(`appAccountToken` on StoreKit, `setObfuscatedAccountId` on Play); it is the
only part of a purchase that cannot be recovered afterwards, and the note is
on `startTrial` where purchases will be written.

### 9.7 Every fix will be a full store review
`expo-updates` is not installed, so there is no over-the-air channel: a typo
in Arabic copy means a new binary and another review. I removed the `channel`
keys I had put in `eas.json`, because they do nothing without that package and
would have read as if updates were configured. Adding OTA updates later is
easy; deciding now whether you want them is the point.

### 9.8 Sign in with Apple will hand you relay addresses — **partly handled**
Apple's Hide My Email gives you `…@privaterelay.appleid.com`, and the real
address only on first authorisation, once. This app stores `email` on
`app_user`, shows it in Settings, and Compose mails contacts — not the user —
so the blast radius is small. The relay address is now captured and stored as
given, on the first authorisation, which is the only time Apple offers it
(BUILD-REVIEW §2.41). What is still open: "sign in with Google, then Apple"
creates two accounts for one person, and there is no merge path.

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
there is no multi-week wait left in this plan. Everything below is work, and
most of it is ours:

1. **Pick the data region** (§1.3), then create the project. Nothing
   server-side starts without it — not this app, not the admin panel, not the
   `assist` function — and it cannot be moved afterwards. **Yours.**
2. **Settle the domain** (§7), because six user-facing strings and a mailbox
   depend on it. **Yours.**
3. **A build on hardware** (§9.1). Notifications, account deletion, both
   sign-in flows and the assist function have between them never run on a
   phone or against a live server. This is where the surprises are.
4. **Purchases** (§9.6). The webhooks behind them are written; what is left is
   the in-app purchase itself, which must carry the Supabase user id, and
   deploying the two functions. This is the only thing that makes anyone Pro,
   and the only thing that gives the admin panel's subscription screens
   anything to show.
5. **The website**, three pages plus a Support URL (§7, §9.4).
6. **Weekly recap and the Pro gating matrix** (§9.5), before the paywall is in
   front of a paying customer.

Items 1, 2 and 6 are decisions only you can make. 3, 4 and 5 are work, and 5
has no owner yet.

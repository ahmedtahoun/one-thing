# Shipping The One Thing — what the Apple and Google accounts are for

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

## 0. What you have, and what it is actually for

Your Apple ID and your Google account are logins. Each one opens two different
doors, and the app needs both doors on both platforms.

| | Apple | Google |
|---|---|---|
| **Distribution** | Apple Developer Program — $99/year, renews. Gets you App Store Connect: the app record, TestFlight, the IAP products, the review queue. | Google Play Console — $25 once. Gets you the app record, the testing tracks, Play Billing, the review queue. |
| **Sign-in** | The same Developer account issues the Services ID + signing key that "Sign in with Apple" needs. | A **Google Cloud** project (same Google account, different console) issues the OAuth client IDs. Not Play Console. |

So: one Apple enrolment covers both Apple jobs. On Google, Play Console and
Cloud Console are separate set-ups that happen to share your login.

**Individual or company?** This decides two things you cannot change later:
the seller name shown on both stores, and — on Google — whether you are hit by
the closed-testing requirement in step 6. A company account needs a D-U-N-S
number, which takes days to get. Decide before enrolling.

---

## 1. Decisions to make before anything is created — **irreversible**

### 1.1 Bundle ID / package name
`app.json` currently has:

```
ios.bundleIdentifier   app.theonething.ios
android.package        app.theonething.android
```

Those per-platform suffixes work, but they are unusual, they can never be
changed after the first submission on either store, and they make every
sign-in and purchase configuration read oddly. The normal shape is one
identifier used on both platforms:

```
app.theonething
```

Say which you want and I will change it. After the first upload, nobody can.

### 1.2 Product IDs for the subscription
`DATA_MODEL.md` fixes these, and they are permanent per store:

| | Apple (StoreKit 2) | Google (Play Billing) |
|---|---|---|
| Monthly | `pro_monthly` — $4.99 | base plan, monthly |
| Yearly | `pro_yearly` — $35.88, 7-day intro trial | base plan, yearly + 7-day free trial offer |
| Tips (consumables) | `tip_small` 0.99 · `tip_regular` 2.99 · `tip_large` 4.99 | same three |

Two things to settle while you are in there: `$35.88/year` is an odd-looking
price in the required fine print (BUILD-REVIEW §2.8 — it is $2.99 × 12, so it
reads as a monthly figure annualised), and Arabic-locale pricing in SAR is a
separate price tier you set per territory. The paywall's fine print is already
written word-for-word in `SCREENS.md` §24 and must match what you configure.

### 1.3 Data region
PDPL applies and most of the seed data is Saudi/Gulf. The Supabase region is
chosen when the project is created and cannot be moved afterwards. This also
decides what the Privacy Policy has to say.

---

## 2. Apple, step by step

1. **Enrol** in the Apple Developer Program with your Apple ID. Allow a day or
   two; identity checks are sometimes slow.
2. **Register the bundle ID** (§1.1) in Certificates, Identifiers & Profiles,
   with **Sign in with Apple** and **Push Notifications** capabilities enabled.
   Notifications in this build are local, so push is not strictly needed yet —
   but adding the capability later means a new provisioning profile, so turn it
   on now.
3. **Create the app record** in App Store Connect.
4. **Sign in with Apple server-side**: a Services ID, a private key (`.p8`),
   your Team ID and Key ID. These four values go into Supabase →
   Authentication → Providers → Apple. Nothing in this repo stores them.
5. **Create the IAP products** from §1.2, with the 7-day introductory offer on
   the yearly. Fill in the subscription group, localisations (EN **and** AR),
   and the review screenshot each product needs, or the submission is blocked
   on the products rather than the build.
6. **Agreements, Tax, and Banking** must be complete before a paid app can be
   reviewed at all. This is the step people forget, and it can take a week.
7. **EU trader status** — App Store Connect will not accept submissions for EU
   distribution without it, and a verified address, phone and email are shown
   publicly on your listing. If you would rather not publish a home address,
   either use a company address or exclude the EU for v1.

## 3. Google, step by step

1. **Pay the $25** and create the Play Console account.
2. **Create the app**, EN-US and AR listings.
3. **Google Cloud Console** (separate): a project, then OAuth 2.0 client IDs —
   a **Web** client (this is the one Supabase needs), plus **iOS** and
   **Android** clients. The Android client needs your release signing
   certificate's SHA-1, which comes from EAS after the first production build,
   so this step straddles step 5 below.
4. **Supabase** → Providers → Google: the Web client ID and secret.
5. **Play Billing**: the subscription with monthly and yearly base plans, the
   7-day free-trial offer, and the three consumable tips. Product IDs from §1.2.
6. **A service account JSON** for `eas submit` to upload builds without you.
7. **Data safety form** and the **account-deletion URL** (step 7 below).

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

Not in this repo at all: the admin panel (13 screens) and the public website.

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

**The Google tester rule is the long pole.** A *personal* Play account created
after 13 Nov 2023 must run a closed test with ~12 opted-in testers who keep the
app installed and actually use it for 14 continuous days before the Production
track unlocks. The count has changed before (it was 20) and the continuity
rules are strict — if testers drop below the threshold the clock can reset —
so read the current requirement in your own Console rather than trusting any
number here, including mine. **Organisation accounts are exempt**, which is a
real argument for enrolling as a company. Start recruiting testers the day you
create the account; this can add two to three weeks on its own.

TestFlight has no equivalent gate — iOS can be in review while Android is
still serving its 14 days.

## 7. What both stores will ask for, and do not have yet

- **Three public pages at a real domain.** Privacy, Terms, and a deletion
  route. The delete sheet's own copy already promises
  `theonething.app/delete`, so that URL has to resolve. Play requires a
  web-accessible deletion path, not only the in-app one. `app/legal.tsx` is
  the in-app copy of the text; nobody owns the website yet (BUILD-REVIEW §3).
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

## The honest timeline

Enrolment and store set-up: a week, mostly waiting on Apple's identity check
and Agreements/Tax/Banking. The code in §4: the large part, and the paywall
sits on developer 2's branch. Google's 14-day closed test: two to three weeks
of calendar time that runs in parallel with everything else, unless you enrol
as a company and skip it.

Start with §1 — the three irreversible decisions — then enrol. Everything
else can be worked in parallel; those three cannot be taken back.

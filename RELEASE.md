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
  Connect**, and it needs far less than the documentation implies. The usual
  four values — a Services ID, a `.p8` key, the Team ID and the Key ID — are
  for the **web** OAuth flow. This app signs in natively, so Supabase verifies
  Apple's identity token against Apple's own public keys and needs only the
  **bundle ID** in Providers → Apple → Client IDs. Leave *Secret Key (for
  OAuth)* empty; the dashboard's own warning that the secret expires every six
  months is the tell that the field wants a self-signed JWT, not the `.p8`.
  Register the App ID with Sign in with Apple, Push Notifications and In-App
  Purchase ticked — all three are cheaper to enable now than to add later —
  and keep the `.p8` backed up for the day web sign-in exists. None of it
  belongs in this repo.
- **Google sign-in does not come from Play Console.** It comes from a **Google
  Cloud** project: OAuth 2.0 client IDs, one Web (this is the one Supabase
  needs) plus iOS and Android. The Android client needs the release signing
  certificate's SHA-1, which only exists once you have made the release keystore (§6.3).

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

### 1.3 Data region — **settled as `eu-west-1`, by default rather than by choice**
The project `ujcoouwbrkewckpphrod` was created in West EU (Ireland). That is
the decision, and it cannot be moved: changing it means a new project and
migrating whatever data is live by then.

Ireland is a defensible place to keep it. Two things it costs, which are
worth knowing rather than discovering:

- **Distance.** Most of the people in the seed data are in the Gulf, and
  every sync crosses a continent to reach them.
- **PDPL.** Saudi personal data leaving the Kingdom carries transfer
  obligations, and the Privacy Policy has to say where the data actually
  lives — which is now a sentence someone has to write (§7).

If a Middle East region matters, the only cheap moment to act is before there
is live data in this one. Check the region list in Supabase rather than
trusting this file: what they offer changes.

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
   certificate's SHA-1, which comes from the release keystore you create in §6.3,
   so this step straddles step 4 below.
3. **Supabase** → Providers → Google: the Web client ID and secret.
4. **Play Billing**: the subscription with monthly and yearly base plans, the
   7-day free-trial offer, and the three consumable tips. Product IDs from §1.2.
5. **A service account JSON**, only if you later script uploads to Play. Uploading the first `.aab` by hand in Play Console needs none.
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
| ~~Supabase project, apply the migrations, fill `.env`, deploy the functions~~ — **live and verified** (§4.1) | `.env` (see `.env.example`); `npm run schema:check` applies the whole sequence to a throwaway Postgres first | — |
| ~~Real Apple + Google sign-in~~ — written, unrun | `src/lib/auth/`, wired into `app/sign-in.tsx`. Needs the client IDs and a build on a device | Apple §2.3, Google §3.2–3.3 |
| ~~Purchases~~ — written, unrun | `src/features/paywall/store.ts` through expo-iap: the trial, the tips, Restore and Manage. Each carries the Supabase user id and makes nobody Pro on its own; the plan comes from the webhooks (BUILD-REVIEW §2.50). Needs the products in both consoles and a build on a device | §2.5 / §3.5 |
| ~~The assistant / capture parsing~~ — built, never called | `supabase/functions/assist` with the limit in `0005_assist.sql`; `src/lib/parse/local.ts` is the fallback. Needs deploying, and an API key to have ever run | a Supabase project |
| Notification delivery on a real device | rules are written and unit-tested; never once delivered (BUILD-REVIEW §2.26) | a build on hardware |
| ~~Store webhooks → `plan`~~ — written, never delivered to | `supabase/functions/app-store`, `supabase/functions/play-rtdn`, `0007_store_webhooks.sql`. Needs the certificates, the service account and a Pub/Sub subscription | a Supabase project + store products |
| ~~A schedule for `lapse_expired_subscriptions()` and for `export`~~ — written | `0009_schedules.sql` schedules both on pg_cron; the export sweep also needs the two Vault secrets the migration's header names | a Supabase project |
| An email provider, to send an export | `supabase/functions/export` writes the file and records its path; sending it is the only step left | **your decision** |

The admin panel is now in this repo, under `admin/` — all 13 of ADMIN.md's
screens as a separate Next.js app, with its own checks in CI. It reads the
same Supabase project, so it waits on §1.3 as well, and it needs the store
webhooks in the row above: without them nobody's `plan` ever changes and its
subscription screens have nothing to show.

Still not in this repo at all: the public website, which has no owner.

### 4.1 The live project, and what checking it is worth

`node scripts/check-project.js` reads the real project with the anon key and
reports what a stranger can reach. On 11 October 2026 every line passed:

```
Schema        24/24 tables present
              closed to a signed-out client, as the migrations intend: analytics_event
              row-level security hides every row from a signed-out client
              none of the 12 privileged functions answers a signed-out caller
Sign-in       apple enabled · google enabled · Google web + iOS client IDs
Edge funcs    assist · export · app-store · play-rtdn — all deployed
Storage       exports bucket exists
```

**Be precise about what that proves.** It proves the schema matches the
migrations, that the policies refuse a signed-out caller, that both providers
are configured, and that four functions answer at all. It does not prove any
of them *works*: `assist` answering 401 means it is deployed, not that the API
key is right; `apple enabled` means Supabase holds a client ID, not that a
phone has ever completed the flow. Every one of those still needs §9.1.

The two store webhooks report **deployed, unconfigured** on purpose. Neither
can be configured before the store products exist, and each answers 503 and
writes nothing until it has Apple's certificate or a Play service account —
so they are safe to leave standing.

The checker is worth more than the one run. It is how you find out that a
later migration, a dashboard click or a rotated key quietly opened something:
run it after any change to the project, not only once.

## 5. Two config fixes already applied

- `app.json` pointed `android.adaptiveIcon.foregroundImage` at
  `./assets/adaptive-icon.png`, **which has never existed in this repo**. The
  Android build would have failed on the first attempt. It now points at the
  three `android-icon-*.png` files that are actually there. The foreground is
  512×512 where Expo wants 1024×1024 — it will build, slightly soft.
- The project is **not linked to EAS**. `eas.json`, `extra.eas.projectId` and
  `owner` were removed: every build is made on this machine with
  `expo run:ios` / `expo run:android` (§6).

## 6. Build and test tracks

Builds are local, so this needs the toolchain on the machine that has the
phone: Xcode and CocoaPods (`brew install cocoapods`) for iOS; the Android SDK,
Java 17+ and an emulator image or a device for Android. Expect several GB of
free disk for the first build of each. The first build generates `ios/` and
`android/` with `expo prebuild`; both are build output, not source.

### 6.1 The first build, in order

`.env` is gitignored but Expo loads it, and the four `EXPO_PUBLIC_*` values are
inlined at build time, so a local build picks them up with nothing to do. The
check that matters: confirm `.env` has all four before building.

Skipping any of them does not fail the build. It produces an app that runs,
falls back to the local session, and explains nothing — because
`app.config.js` adds the Google native module *only* when
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is set, and `availability.ts` will correctly
report `not-configured` for a build that was never given the value. That is the
worst failure mode in this project: everything looks fine and sign-in silently
is not real.

```sh
npx expo run:android                               # emulator or a USB device; no provisioning
npx expo run:ios --device                          # a plugged-in iPhone; needs signing set up in Xcode, once
npx expo run:ios --device <simulator name or UDID>  # a Simulator
```

Android first, deliberately: it reaches a phone without Apple's provisioning,
so the first batch of §9.1 surprises arrives hours earlier.

**Metro port.** `run:ios` and the dev client look for Metro on 8081. If another
project's Metro already holds it, the app loads *that* project's bundle and
fails with a native-module error for a package this repo does not have (seen
once, as `ExpoCamera`). Stop the other server, or check
`lsof -nP -iTCP:8081 -sTCP:LISTEN`.

**For a tester on the iOS Simulator**, a normal device build installs on
registered hardware only, so hand over a Simulator build:

```sh
npx expo run:ios --configuration Release --device <simulator>
```

It runs on a Simulator with no device registration and **no Apple account**,
which is what makes it the cheapest way to put the app in another developer's
hands. Day-to-day iteration is the Debug build with Metro running.

What the Simulator is genuinely good for is most of what §9.1 lists: native
RTL resolved by iOS's own layout engine rather than CSS, IBM Plex Sans Arabic
loading through `expo-font` instead of silently falling back, `expo-blur`,
shadows, safe areas on a notched device, every keyboard interaction, the whole
navigation and task flow, the contact picker, and all five local
notifications, which do fire there.

**It does not close §9.1.** It cannot run in-app purchases without a StoreKit
configuration file, so the trial, the tips, Restore and Manage stay untested.
Its performance and scroll feel are its host Mac's, not a phone's.
Notification behaviour once the app is killed is not faithful. Sign in with
Apple works only if the Simulator is signed into an Apple ID, and is flaky
when it is. Treat it as an accelerator for layout, language and flow bugs —
the hardware run still has to happen before submission.

### 6.2 What the first build is for

§9.1 lists what has never run. Work it as a checklist, because a build that
only gets opened once proves very little:

| Check | What to watch for |
|---|---|
| Arabic layout | Native RTL is resolved by iOS/Android layout engines, not CSS. The web harness cannot see a double-mirror here |
| IBM Plex Sans Arabic | Loaded via `expo-font`. A silent fallback to the system font is the usual failure |
| Tab bar blur, shadows, safe areas | `expo-blur` on a notched device |
| All five notifications | Schedule one of each and **wait**. Delivery has never happened once. Check wording in both languages |
| Google sign-in | Then confirm `auth.users` gained a row in Supabase |
| Apple sign-in | Only the bundle ID is configured (§0); this is the run that proves that is enough. Expect a relay address (§9.8) |
| Sync after sign-in | `signInWithIdToken` is what wakes it. Check rows land in the right tables |
| Account deletion | It is irreversible and server-side. Use a throwaway account |
| The assistant | First call that has ever reached `assist` with a real key |
| A narrow Android phone | At 360pt the greeting truncates and the tab bar crowds the list (§9.9) |

Record what breaks in BUILD-REVIEW rather than fixing it silently — after
submission every fix is a full store review (§9.7).

### 6.3 Submission

**iOS.** `npx expo prebuild --platform ios`, open `ios/TheOneThing.xcworkspace`
in Xcode, set the Team under Signing & Capabilities, then Product → Archive →
Distribute App → App Store Connect (or upload the archive with Transporter).
Bump the build number in Xcode for every upload — nothing does it for you now.

**Android.** Make the release keystore once and **back it up outside the repo**:
losing it means you can never update the app under the same key (unless you
enrol in Play App Signing, which is the safer default).

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore \
  -alias onething -keyalg RSA -keysize 2048 -validity 10000
keytool -list -v -keystore release.keystore -alias onething   # the SHA-1 for §3.2
cd android && ./gradlew bundleRelease                         # app/build/outputs/bundle/release/*.aab
```

Point `android/app/build.gradle`'s release `signingConfig` at that keystore
through `~/.gradle/gradle.properties`, never a committed file. Upload the `.aab`
in Play Console. Raise `versionCode` for every upload.

The keystore's **SHA-1** is what the Google Cloud Android OAuth client needs
(§3.2) — so that client cannot exist until the keystore does. With Play App
Signing, Google re-signs the app, so register the *Play App Signing*
certificate's SHA-1 (Play Console → App integrity) as well.

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

  ~~**The domain in the app's copy no longer matches the bundle ID.**~~
  Settled. All six user-facing places now say `onlyonething.app`, in both
  languages: `privacy@onlyonething.app` ×4 (`src/content/strings.ts` 1057,
  1073, 1165, 1173) and `onlyonething.app/delete` ×2 (1061, 1214). The
  handoff's own files still say `theonething.app`; they are the record of what
  was asked for, not configuration, so the admin panel's fidelity check
  records the divergence as `{ app, prototype }` rather than failing on it
  (BUILD-REVIEW §2.43).

  **What the strings now promise, and nobody has built.** A reviewer clicks
  these. `privacy@onlyonething.app` has to receive mail and `/delete` has to
  resolve — both on a domain with no owner. The copy is no longer the open
  question; the website is.
- **Legal review of that text.** What ships in `ACC` is plain-English summary
  copy. It is good UX writing and it is not a policy that satisfies PDPL or
  GDPR.
- **App Privacy answers** (Apple) and the **Data safety form** (Play), both
  consistent with the analytics event list in `DATA_MODEL.md` and with every
  third-party SDK you end up adding. Apple needs a `PrivacyInfo.xcprivacy`
  manifest; Expo generates one from your plugins at prebuild, so check it
  matches what you declared.
  Both forms must also declare **Contacts**: a contact picked through
  People's "Import" (BUILD-REVIEW §2.46) is stored and synced to the account,
  so it is collected and linked to the user. Only the one contact picked is
  read; the app never reads the address book on its own.
- ~~**Screenshots**~~ — done. `npm run capture:store` writes `store-assets/`:
  six screens per store per language at exactly the sizes each one takes
  (Apple 1320 × 2868, Play 1080 × 2160), plus Play's required 1024 × 500
  feature graphic and 512 × 512 icon. BUILD-REVIEW §2.45. They are committed,
  so nobody needs the toolchain to upload them.
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

Growth now reads two things it could not before (BUILD-REVIEW §2.49):
"Signed in" counts auth users, so it finally differs from "Finished setup",
and "Added 3+ tasks" also counts `task_created` events. `paywall_viewed` is
recorded but has no step to sit in: ADMIN.md's funnel does not have one, and
adding it is a design change. Still open: whether a vendor ever joins this — if one does, it brings an SDK, a privacy-manifest entry and
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
bucket, and the two Vault secrets its schedule reads (`0009_schedules.sql`,
BUILD-REVIEW §2.47).

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

**This one is not a free choice.** `can()` returns `false` for `weeklyRecap`
on every plan, Pro included — so somebody pays $35.88 and gets nothing at all
for one of the six bullets they were shown. That is the shape of a 3.1.2
rejection, and it is worse than an unfinished feature because the money has
changed hands. Taking the bullet off the card is a strings change and can
happen today; building the screen cannot. **Recommendation: remove it now,
add it back when the screen exists.** Note the copy lives in the generated
`strings.ts`, so the edit goes through `scripts/port-content.js` or the next
`content:port` reverts it (BUILD-REVIEW §2.53).

### 9.5.1 The gating matrix, proposed

§2.1 left everything except the assistant open, deliberately, because
shipping a lock the design never drew would be inventing product. That was
right then and it is the wrong place to launch from: Free currently gets
five of the six things Pro is sold on.

**The paywall's own words settle half of it.** Two bullets say *"Unlimited"*
— the assistant and brain dumps — which only means something if Free has a
number. The other three name a feature outright, which reads as Pro-only:

| Capability | What the card promises | Free today | Proposed |
|---|---|---|---|
| `assistant` | "Unlimited smart assistant · Free plan: 10 requests a day" | 10/day | **unchanged** — the one limit the handoff ever specified |
| `brainDump` | "**Unlimited** brain dumps" | open | **3 a day on Free**, counted at sorting |
| `autoFollowUps` | "**Auto** follow-ups" | open | **the chase starts by itself on Pro only** — no cap on how many |
| `clientHistory` | "Client history — every call, message and meeting, by date" | open | **off the card**, left open |
| `events` | "Meetings, webinars & courses" | open | **off the card** — two of the three have no way in |
| `weeklyRecap` | "What you got done, and who still needs you" | off for all | **off the card** until it exists |

Settled and shipped. The card is three bullets now, and each is true.

**Follow-ups are not capped by number**, which was the first idea and the
wrong shape. Nobody adds a follow-up — they accumulate as a side effect of
sending things — so a cap means the fourth message quietly goes unchased:
invisible, and failing exactly where the feature is meant to help. It also
had no decent answer for Quick capture, Brain dump and the Assistant, which
each turn one parsed list into several waiting items at once. What the card
actually sells is the word *Auto*, so that is what Pro buys: a Free account
can still have anyone waiting and can still set a chase by hand from the
Sent row's Change, but it has to ask.

**Three bullets came off the card rather than being locked**, which is the
cheaper mistake to undo: a bullet is one line of copy, a lock is design
work in a screen, and after launch a lock is a take-away. Weekly recap has
no screen. Client history is the person's own notes about their own
contacts. And "Meetings, webinars & courses" sold two things with no door:
the event form builds all four types, but every route into it passes
`meeting` since Today went from eight tiles to four. The capabilities all
remain in `entitlements.ts`, unsold rather than cancelled.

**Prefer a meter to a lock, wherever the choice exists.** The assistant
already proves the pattern end to end: the count runs out, the paywall
opens, nothing new had to be designed. Every *lock* instead needs a locked
state drawn in the screen that holds it — which the handoff never drew for
any of these — so a lock costs design time before it can ship, and a wrong
one is a support ticket where a generous meter is only forgone revenue.
That is why `clientHistory` is proposed as a window rather than a wall, and
why `events` keeps the common case open.

Every rule lives in `src/policy/entitlements.ts`, which is why §2.1 put
them in one file: the two that remain are a meter in Brain dump and one
condition in Compose.

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
net for a lost expiry notification; it now runs hourly on pg_cron
(`0009_schedules.sql`, BUILD-REVIEW §2.47). And the purchase itself has to carry the Supabase user id
(`appAccountToken` on StoreKit, `setObfuscatedAccountId` on Play); it is the
only part of a purchase that cannot be recovered afterwards. The purchases
written since do carry it (BUILD-REVIEW §2.50).

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
- ~~**Focus sessions never leave the device.**~~ — fixed. Each session and
  each closed evening review now goes up to `focus_session`, `review` and
  `review_item`, which is what the admin panel's focus totals read
  (BUILD-REVIEW §2.48).
- **No crash or error reporting.** You will ship blind to anything the
  harness cannot see, which after §9.1 is a lot.
- **Supabase tier.** A free project pauses after inactivity, which is not a
  thing a live app survives. Budget the Pro tier, and set backups with it.
- **Store listing assets beyond screenshots** — Play's 512 icon and
  1024×500 feature graphic, both stores' descriptions and keywords, all in
  Arabic as well as English. Nobody has written the Arabic listing copy.
- ~~**The Android adaptive icon foreground is 512×512**~~ — moot. Every icon
  in the project was Expo's scaffold placeholder, including that one; they are
  now rendered from the design's own logo mark at 1024 (BUILD-REVIEW §2.45).
- **The app has never been rendered narrower than 402 points.** Shooting the
  Play set at 360 showed the greeting truncating and the tab bar covering the
  task list. Nothing is broken, but a narrow Android phone is a real device
  class and §9.1's hardware build is where it will show.
- **The repo's default branch is still my working branch.** `main` is the
  trunk now — Settings → Branches, and I have no tool for it.
- **The browser suites read a bundle nothing rebuilds for them.** Fixed:
  they now refuse to run against a `dist/` older than the code
  (BUILD-REVIEW §2.52). Worth knowing anyway, because the habit it
  encourages is wrong — `npm test` passing after a merge says nothing about
  the 264 behavioural checks, and those need `npm run export:web` first.

---

## What is actually left

With both accounts already shipping-ready and Play's tester gate behind us,
there is no multi-week wait left in this plan. Everything below is work, and
most of it is ours:

1. ~~**Pick the data region**~~ — the project exists, in `eu-west-1` (§1.3).
   What is left there is a decision, not a task: keep Ireland, or move while
   moving is still free.
2. ~~**Settle the domain**~~ — done; the app says `onlyonething.app`
   everywhere (§7). What the strings promise is not: the `privacy@` mailbox
   and `/delete` both belong to item 5. **Yours.**
3. **A build on hardware** (§9.1). Notifications, account deletion, both
   sign-in flows and the assist function have between them never run on a
   phone or against a live server. This is where the surprises are.
4. **Purchases** (§9.6). The webhooks and the in-app purchase are both written
   now, and the purchase carries the Supabase user id (BUILD-REVIEW §2.50).
   What is left is creating the products, including a Play subscription with
   the id `pro`, deploying the two functions, and a first purchase in each
   store's sandbox. This is the only thing that makes anyone Pro,
   and the only thing that gives the admin panel's subscription screens
   anything to show.
5. **The website**, three pages plus a Support URL (§7, §9.4).
6. **Weekly recap and the Pro gating matrix** — now a proposal to approve
   rather than a blank page (§9.5, §9.5.1). Weekly recap is the urgent half:
   a Pro buyer gets nothing for that bullet today. **Yours.**

Items 1, 2 and 6 are decisions only you can make. 3, 4 and 5 are work, and 5
has no owner yet.

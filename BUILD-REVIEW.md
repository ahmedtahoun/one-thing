# The One Thing — pre-build review of `design_handoff_the_one_thing`

Date: 10 Oct 2026. Reviewed: README, SCREENS, ADMIN, DATA_MODEL, ACCEPTANCE,
`source/*.js`, both HTML prototypes, all 43 screenshots.

## 1. Verification I ran (not just read)

I served `design/` locally and booted both prototypes in headless Chromium
(React/Babel served from a local npm copy, since `unpkg.com` is blocked in this
environment), then clicked every nav entry and scraped each rendered frame.

| Check | Result |
|---|---|
| App prototype, English — all 21 screens | render, **0** console/page errors |
| App prototype, Arabic (RTL) — all 21 screens | render, **0** errors |
| Frame size on every screen, both languages | exactly **402 × 874** |
| Broken-text scan (`undefined`, `NaN`, `[object Object]`, unresolved `{{ }}`) | **0 hits** across all 42 renders |
| Admin prototype: sign-in → TOTP → 8 sections | all render, **0** errors |

(The one 404 logged per page is a missing favicon — harmless.)

**Conclusion: the design reference is sound and complete enough to build from.**
Copy is genuinely complete in both languages (`C`, `ACC`, `SETX`, `EVX`, `FUX`,
`PFX`), icon paths are exact, the 8 type colours and all neutrals are tokenised,
and the store-compliance audit has already removed the one real rejection risk
(external PayPal tips → consumable IAP).

## 2. Gaps that block a faithful build

These are things the handoff does not answer. None are design errors — they're
decisions nobody has made yet.

### 2.1 Pro gating is undefined — biggest gap
The paywall sells six features. Exactly one limit exists anywhere in the docs
("Free plan: 10 assistant requests a day"). Nothing states what Free loses for
*Client history*, *Auto follow-ups*, *Unlimited brain dumps*, *Meetings,
webinars & courses*, or *Weekly recap* — and **no screen has a locked or
upsell state designed**. Without a gating matrix, Free and Pro are the same app
plus an assistant counter.

### 2.2 "Weekly recap" is sold but does not exist
It is a paid feature on the paywall (`app-content.js` → `feats[5]`) with no
screen in SCREENS.md, no entry point in the 21 screens, no copy, and no data
shape. Either design it or drop it from the paywall before submission —
advertising an absent feature is also a store-review risk.

### 2.3 No in-app Help / "Contact us"
ADMIN.md's Support inbox merges **"in-app Contact us"** tickets, and
`SupportTicket.source` includes `app`. But Settings has no support row, and no
such screen or copy exists. The admin Support section cannot receive anything
from the app as specified.

### 2.4 No API contract, no offline story
DATA_MODEL gives entities, a state machine and store integrations — but no
endpoints, no sync/conflict model, and no offline behaviour. README only says
"all user data syncs to the backend". A reminders app has to work with no
signal; that needs deciding before the data layer is written, not after.

### 2.5 Reminder enum mismatch
`Task.remind` is `(at|10|60|custom|null)`. Three more values are in use:
`30` and `morning` appear in the seed tasks, and the event form offers **Day
before** (`EVX.rems`). So the documented enum is missing three of its five
real values.

Two follow-ons, found while building the reminder sheet:

- **"Day before" is not stored as itself.** The prototype's event form saves it
  as `remind: 'custom'` (`['10','60','custom',null][e.rem]`), so the offset is
  lost the moment it is chosen and there is no short label for it anywhere.
  The build keeps `day_before` as its own value — a notification scheduler
  needs the offset, not a note that something was customised — and falls back
  to the prototype's "custom" wording in the row's tiny label, since that is
  the only label the handoff has for it.
- **"Morning of" has no stated time.** The labels read "Morning of · 08:00" and
  "8:00", and Settings puts quiet hours at 22:00–08:00, so it is read as
  quiet-hours-end, 08:00 on the day. `day_before` takes the same 08:00 the day
  before. Confirm, or give me the intended times.

### 2.6 The screenshots can't be used for pixel QA
They are 924×540 device-frame captures; the phone content inside sits at roughly
0.57× scale. ACCEPTANCE asks for "±2 pt at 402 × 874" — that can only be
measured against the HTML prototype. I already have a clean set of true
402×874 @2x captures from my verification run and can commit them as the QA
reference.

### 2.7 Contradiction between two docs
The Store Readiness Audit describes setup as "name → phone (all countries) → job
title". SCREENS.md §02 says phone is **not** asked at setup (collected later in
Settings / first WhatsApp). SCREENS.md is the screen spec, so I'll follow it —
flagging so it's a decision, not a silent pick.

### 2.8 `$35.88` yearly price
The fine print hard-codes "$35.88/year" in EN and AR. Google Play accepts
arbitrary prices; Apple's price points may not offer exactly $35.88. Worth
confirming in App Store Connect before the copy ships, since changing it means
changing both translations.

### 2.9 Onboarding (screen 04) is dead in v1
"Reachable but first-run skips it… keep for Revisit setup in a future version."
Build it unused, or leave it out?

### 2.10 `app-content.js` is not the complete copy source
README.md calls it "**All copy (EN+AR)** … extracted verbatim. Use as the
string/icon source of truth." It is not: 51 English/Arabic pairs exist only
inline in `source/app-logic.js` — the whole first-run card ("FIRST THING", its
question, placeholder, Set, "Or pick one", "Later — just show me my day", its
toast), both greetings, the notification rows and the country-picker strings.
Anyone building from `app-content.js` alone would silently ship those in one
language. `scripts/extract-inline-copy.js` pulls them out mechanically and
fails loudly if the handoff is ever revised. I first found 22 of them; §2.16 is
how the other 29 came to light.

### 2.11 The consent checkbox renders 25 px, not the 22 the spec states
SCREENS.md § 01 says "Checkbox 22 × 22 radius 7". The prototype draws it as a
22 px box *plus* two 1.5 px borders — 25 px — because the page has no
`box-sizing: border-box`. React Native always measures borders inside the box,
so it gives the spec's 22. The 3 px matters: it is exactly what makes the
prototype wrap "…and Privacy / Policy." onto a second line where the build
keeps it on one. **Following the written spec (22), not the prototype.** Say
if you want the prototype's 25 instead and the wrap back.

### 2.12 README's line-height column describes the intent, not the artefact
README § Typography gives a line height for every token — 1.45 for body, 1.4
for micro, 1 for eyebrow and tab, 1.2 for h1. The prototype sets almost none
of them: of roughly 300 sized elements in it, fewer than 30 declare a
`line-height` at all. Everything else takes the font's own metrics.

So the real rule is the font, and it is not a flat 1.5 either. IBM Plex Sans
Arabic's typo metrics are ascender 1085 and descender −415 per 1000 em with no
line gap; a browser rounds each to whole pixels and adds them:

| Size | README | Font's own |
|---|---|---|
| 10.5 (tab) | 10.5 | **15** |
| 11 (eyebrow) | 11 | **17** |
| 13 (caption) | 18.85 | **19** |
| 15 (body) | 21.75 | **22** |
| 17 (title) | 22.1 | **25** |
| 28 (h1) | 33.6 | **42** |

`naturalLineHeight()` in `src/design/tokens.ts` is that formula, checked
against Chromium at all seventeen sizes in the scale. Every token but
`display` now takes it, and the handful of elements that do set a line height
pass `lh` to `<Text>` and name what they are matching.

This was worth chasing: treating an eyebrow as 1.0 left it 6 pt short, and the
error compounds. Before the fix the Tasks screen differed from the prototype
by 12.5 % of its pixels and up to 21 pt of drift; after it, 0.47 % and 1 pt.
**Following the prototype**, since the screenshots show the prototype and
ACCEPTANCE.md's ±2 pt is written against them.

### 2.13 `text-wrap: balance` has no React Native equivalent
README § Typography asks for balanced wrapping on big titles. CSS does it for
free; React Native has nothing. `src/ui/BalancedText.tsx` emulates it by
measuring and narrowing to the point just before a line is added. Raising it
rather than quietly dropping it, as the handoff asks.

## 3. Things that must come from you (not buildable)

- Apple Developer / App Store Connect and Google Play Console accounts; bundle
  IDs; the IAP products (`pro_monthly`, `pro_yearly` + 7-day trial, 3 tips).
- `theonething.app` domain + DNS. Three public pages are **required** by both
  stores: Privacy, Terms, and `/delete`. That small marketing/legal site is in
  nobody's scope yet.
- Legal review of the Terms/Privacy text. What's in `ACC` is short, plain-English
  summary copy — good UX text, not a policy that satisfies Saudi PDPL or GDPR.
- Brand assets: app icon, splash, store screenshots. The logo today is a CSS
  circle/ring/dot; there are no asset files in the handoff.
- Admin identity provider for "company SSO + mandatory TOTP".
- An AI provider key — the prototype's `parse()` is a regex stub. Capture, Brain
  dump and Assistant all need a real model, a prompt contract, and the 10/day
  meter on Free.
- Backend hosting + **data region** (PDPL matters here; most users in the seed
  data are Saudi/Gulf).
- Analytics vendor for the pseudonymised event list in DATA_MODEL.

## 4. Notes on scope

The handoff is three products, not one: the bilingual mobile app (21 screens),
the admin panel (13 screens, incl. store-webhook ingestion so subscriptions
reflect within 1 min), and the public legal/marketing site. The app alone is the
large majority of the work.

The "nothing is ever sent automatically" rule is the spine of this product and
touches Compose, Follow-ups, the Assistant and notifications. It is also what
keeps the app out of messaging-automation territory for review. I'll treat it as
non-negotiable.

### 2.14 Arabic must be mirrored exactly once
This started as a note about the tab bar and turned out to be the whole app's
problem, so it is worth stating as a rule.

Set the writing direction once, on each root a screen owns, and lay everything
inside out with a plain `row`. Yoga and CSS both run a `row` from the writing
direction's start edge, and both resolve `paddingStart` / `paddingEnd` and a
column's `flex-start` / `flex-end` the same way. Adding `row-reverse` on top of
that mirrors a second time and puts the row back where it started.

The first version did exactly that: `Screen` set `direction: 'rtl'` *and* every
row asked for `row-reverse`. The Arabic screens came out mirrored — the Today
greeting on the left with its buttons on the right, the check circle on the
wrong side of every task row — while the quick-action grid, which used a plain
`row`, was right. A pixel diff did not shout about it (2.9 % on Today, mostly
white space), and the drift check could not see it at all, because that
measures vertical position. **It took putting the Arabic screenshots side by
side.** Worth remembering: neither automated check catches a horizontal flip.

Fixing it took Arabic Today from 2.87 % of pixels differing to 0.57 %.

`useDirection().row` is now always `'row'`, kept as a helper so a row that
should follow the writing direction still says so, with the rule written at its
definition. Mirroring a *glyph* is separate and still explicit (`scaleX` on the
back chevron); gestures convert the other way, physical to logical.

### 2.15 The reminder sheet draws a hairline inside its bottom corner
Every option row in the prototype's reminder sheet carries a bottom border,
including the last one, inside a container with `border-radius: 16px` and
`overflow: hidden`. The last border therefore shows as a hairline just above
the rounded edge. Recreated as-is rather than tidied — say if you want it
dropped.

### 2.16 The handoff's own inline copy was only half readable
§2.10 recorded that `app-content.js` is not the complete copy source and that
22 EN/AR pairs live in `app-logic.js`. There are more than that: the extractor
only matched one of the two shapes the file uses (`ar ? '…' : '…'`), and missed
every `lang === 'ar' ? '…' : '…'` — another 29 pairs, including "Overdue",
"Snoozed", "See all", "Tmw " and the " min" / "h " / "m" suffixes on every
relative time.

I had typed several of those by hand, which is the thing mechanical
transcription exists to prevent. `scripts/extract-inline-copy.js` now reads
both shapes, and every pair must be named — as copy, or in an explicit
not-copy list with a reason (locale ids, icon names, demo names, a layout
offset). A new one upstream fails the script rather than being dropped.

51 pairs now come out, against 22 before.

### 2.17 One status colour in the tokens came from the admin panel
`#6C44A4` was in the token file as the Snoozed pill. It is `oklch(0.48 0.15
300)`, which appears only in `source/admin-logic.js` — it is the admin panel's
reminder colour. The app's Snoozed pill is `oklch(0.5 0.14 300)` = `#714CA6`.
Corrected. Flagging it because the two source files use the same palette with
different values, and the app is what we are building.

Also added: `#B02A2D` for the Overdue pill. README gives danger-fg as a range,
`oklch(0.5–0.55 0.17 25)`, and the prototype spends the darker end on that pill
and the lighter one on the Now line — so both ends are tokens now.

### 2.18 The demo day is pinned to October 2026
The prototype's seed data is written against `BASE = new Date(2026, 9, 9)` and
its later tasks carry absolute dates — `z2026-10-10` for tomorrow, `z2026-10-13`
for the following Monday. Run it on any other day and its "Tomorrow" group is
wrong.

`src/content/demo.ts` reads those as offsets from that base and re-applies them
to whatever today is, so the demo keeps its shape — twelve today, three
tomorrow, three later — on any date. It matters beyond tidiness: the comparison
harness seeds this data, and on 10 October 2026 the untranslated seed would put
the prototype's "tomorrow" tasks into today's groups and make the two screens
disagree for a reason that has nothing to do with the build.

## 5. Decisions taken

Agreed with the product owner on 10 Oct 2026: React Native (Expo) for the app,
Supabase for the backend, mobile app before admin panel and public pages, and
the Claude API behind the backend for capture, brain dump and the assistant.

Taken here, under the stated assumptions, and reversible in one file each:

- **Pro gating** is permissive except the one documented limit (10 assistant
  requests a day on Free). `src/policy/entitlements.ts` is the only place a
  gate exists — see §2.1.
- **Weekly recap** is off for everyone, so nothing routes to a screen that does
  not exist — see §2.2.
- **Account setup** is one screen with no phone field, following SCREENS.md,
  the screenshot and the prototype's own render against the audit's prose —
  see §2.7.
- **Writing direction** is carried in React context and applied per layout
  rather than through `I18nManager.forceRTL`, which only takes effect after an
  app restart. Settings switches language with an inline pill, so it has to
  apply immediately.

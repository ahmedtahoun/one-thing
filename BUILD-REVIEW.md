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

### 2.11 Every bordered box in the prototype is bigger than its stated size
SCREENS.md § 01 says "Checkbox 22 × 22 radius 7". The prototype draws it as a
22 px box *plus* two 1.5 px borders — 25 px — because the page has no
`box-sizing: border-box`. React Native always measures borders inside the box,
so it gives the spec's 22. The 3 px matters: it is exactly what makes the
prototype wrap "…and Privacy / Policy." onto a second line where the build
keeps it on one. **Following the written spec (22), not the prototype.** Say
if you want the prototype's 25 instead and the wrap back.

This is not one element. The page has no `box-sizing: border-box` anywhere, so
**every** box whose height is stated alongside a border renders that much
taller: the Morning priority input is 54 in SCREENS.md § 05 and 56 in the
prototype, and the same goes for the 52 pt form fields and the 56 pt title
field on the event form. React Native always measures borders inside the box,
so it gives the written number.

The gap is 2–3 pt per element and it is why a few probes sit at the tolerance
line rather than at zero. The written sizes are being followed throughout. If
you would rather match the prototype exactly, it is one change — add the
border to each stated height — but then the spec's numbers stop describing
the build, so it needs to be your call.

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

`RELEASE.md` sequences this list into the order the steps unblock each other,
with the three irreversible decisions (bundle ID, product IDs, data region)
first. What follows is the inventory.

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

### 2.19 Settings, People and Follow-ups: where the build departs from the prototype
All three screens sit within 1 pt of the prototype on every probe except the
first item below. These are the places the build does not copy the
prototype. Each was decided here, and each can be reversed in one place.

- **People's search field is 48 pt, not the prototype's 24.** SCREENS.md § 10
  says 48, and so does the prototype's own CSS (`height: 48px`). But the field
  sits in a scrolling flex column whose content overflows, and without
  `flex: none` it shrinks to the height of its input. The handoff's screenshot
  shows the squashed field too. Settings' cards carry `flex: none` for exactly
  this reason, so 48 is the intent, and 44 is the minimum tap target anyway.
  Everything below the field sits 24 pt lower than in the prototype, listed in
  `KNOWN_DEVIATIONS`.
- **Arabic forward chevrons point left.** The prototype picks its *back*
  icon for Arabic chevrons, then its icon helper mirrors every back icon in
  Arabic a second time, so the rendered prototype's chevrons point right. The
  handoff's own Arabic screenshot (`28-ar-settings.png`) shows them pointing
  left. This is the double mirroring of §2.14 in miniature. Following the
  screenshot.
- **The Follow-ups channel badge is 20 pt, as SCREENS.md § 14 says.** The
  prototype draws 20 plus two 2 px borders outside it (no `box-sizing`), so
  24. Same call as the checkbox in §2.11.
- **Settings shows only what the account holds.** With no job title, the
  prototype falls back to its demo user's ("Founder · Qahwa House"), and with
  no name to the initial "K". A real account without a job title shows no
  role line.
- **Initials come from the contact's own name.** The prototype's demo
  contacts carry an English and an Arabic name, and People takes initials from
  the English one in both languages ("MA" beside "محمد السعدي"). A real
  contact has one name, so an Arabic name gives Arabic initials: "مس" for
  محمد السعدي, and "ال" for a name that starts with the article. The
  prototype's own Follow-ups does the same. **Decide** whether Arabic names
  should take one letter, or skip "ال".
- **"Remind me" on a waiting follow-up does what Nudge does.** In the
  prototype both buttons call the same handler: write a follow-up task with
  a draft and open Compose. SCREENS.md gives "Remind me" a grey style and a
  bell but no behaviour of its own. Built as the prototype behaves. **Say if
  it should schedule a reminder instead.**
- **A task started from People or by Nudge is due now.** The prototype stamps
  09:30, ten minutes after its frozen 09:20 clock, so on a real day it would
  start out overdue.
- **The "Follow-ups" tab label wraps in the prototype**, onto "Follow- / ups",
  and does not in the app. This is the tab bar built with Today and is
  unchanged here. The drift check probes Follow-ups by its other labels,
  because a probe on "Follow-ups" lands on the tab label.

What Settings cannot do yet, and shows as a toast: Restore purchases, Manage
subscription (it also opens the store's subscriptions page on a device), the
three coffee tips (consumable in-app purchases, never a payment link) and
Download my data. Delete account erases everything on the device except the
language and returns to Sign in. DATA_MODEL.md's server-side hard delete needs
the backend, and `src/lib/account.ts` is where it goes.

### 2.20 Two more places the copy lived, and a collision
`scripts/extract-inline-copy.js` now also reads Settings' three reminder-style
descriptions and the follow-up Nudge's task: its title, goal, talking points
and draft. The task is built by concatenating copy around the follow-up's own
fields, so it comes out as templates with `{what}` and `{n}`. Each has a
pattern written for its line and fails if upstream rewrites it.

Building Settings also turned up a fault in the extractor. Three lines share
the English " min", but their Arabic differs. The collapsed Reminders row
says " د"; relative times say " دقيقة". All three were named `minSuffix`, so
whichever came last won, and Settings would have read "45 دقيقة" where the
prototype has "45 د". The Reminders row now has its own name, and a name that
comes back with different copy now fails the run.

### 2.21 Compose: where the build departs from the prototype
Every probe sits within 1.1 pt of the prototype. Pixel difference is 2–3 %,
most of it the first item below.

- **The Send button is 56 pt; the prototype renders it 26.** It is the same
  flex-shrink artefact as People's search field (§2.19). The screen's column
  overflows by a few points, and the button, with no `flex: none`, absorbs
  it. README gives primary buttons 56 h, so that is what is drawn.
- **A saved number or address is filled in.** The prototype only fills the
  recipient when the task was started from People. Otherwise it starts empty,
  even for a contact whose number it holds, and after "Saved for next time"
  it does not use the number next time either. The build fills it in from the
  task's contact: the linked one, or else the one whose name the task carries,
  matched on the first word as the prototype's "Last time" row does. That is
  what "Add their number once — I'll remember it" promises.
- **"Send email" opens the phone's own mail sheet.** In the prototype it
  only raises "Sent to {address}", which no real app can do without sending
  mail from a server. Nothing in DATA_MODEL does that, and README rules out
  sending without the user. So "Send email" opens the system mail composer,
  already filled in, over the app, and the user taps send there. "Sent to …"
  is shown only when the composer reports that it sent. "Open in Mail app
  instead" opens the Mail app through `mailto:`. Without a mail account, and
  on the web build, "Send email" falls back to that. **Say if you meant
  something else by the two buttons.**
- **"Draft copied" is true.** The toast after "Open in Mail app" says the
  draft was copied, and the prototype does not copy it; the build does. A long
  body can be cut short in a `mailto:` link.
- **The country button's chevron points down in Arabic too.** The prototype
  rotates its back chevron to point down, but in Arabic its icon helper has
  already mirrored it, so the chevron points up. This is the double mirroring
  again (§2.14, §2.19). So is "Last time"'s chevron, which follows Settings.
- **Call now dials the contact's number** when the app has one. The
  prototype shows "Calling…" and dials nothing.
- **Answering "Did you send it?" returns to Today**, as the prototype does,
  whichever screen Compose was opened from.
- **The "Last time" row reads the contact's history**, newest first, and
  falls back to their People line ("Emailed · Sunday") when there is none.
  The history store and its demo data are new here. The contact profile (11)
  will write to them.

### 2.22 Contact profile
Every probe sits at 0 pt. The pixel difference, 0.05 %, is the history's day
headings: the demo history is dated back from today, and the prototype's from
its frozen 9 October.

- **The back button here is 34 pt, not Settings' 40.** It is the same
  button, but in the prototype this one is `display: flex`, which takes the
  icon out of the line box. Matched, not tidied.
- **The action tiles are inert without a number or address.** People's round
  buttons stay tappable when dimmed and Compose then asks for the number;
  these tiles do nothing. That is how the prototype has it, and it is kept.
  **Say if the two should behave alike.**
- **Meeting goes to the event form with the attendee filled in**
  (`/new?type=meeting&contact=…`). That form (09) is not built yet.
- **Closed follow-ups are read into the history, not copied into it.** DATA_MODEL
  has a `followup_closed` history kind. The prototype derives these moments
  from the follow-ups instead, with a tick and no time, so reopening a
  follow-up takes its moment away again. Built the same way.
- **The note and the quick log are stored** on the contact and in the
  history. In the prototype they last only until the page reloads.

### 2.23 Contact form
Every probe sits at 0 pt, with 0.1 % of pixels differing. That needed the
name and role rows at 55 pt: the prototype's 54 pt inputs carry their 1 pt
rule outside the box. Where the build goes beyond the prototype, it is to
meet SCREENS.md § 12 or ACCEPTANCE.md:

- **The country list can be searched.** ACCEPTANCE asks for "country picker
  search", and SCREENS.md for "searchable list of all countries", but the
  prototype's form list has no search row. The search row is the one the
  prototype draws on its other picker (account setup), using the extracted
  "Search country or code" / "No country found" copy. It matches names in
  either language, and dial codes. Compose's picker stays as drawn, without
  one.
- **A phone number, if given, needs seven digits.** SCREENS.md says so; the
  prototype never checks it. A short number blocks Save and, once Save has
  been tried, marks the details card red, as the prototype does for a bad
  email. Neither has a message of its own in the handoff. **Say if they
  should.**
- **Delete asks first and can be undone.** Its confirm is the prototype's
  ("Delete this contact? Their history goes too."): the browser's own on the
  web, a system alert on a phone. Deleting removes the contact and their
  history, and the toast's Undo puts both back. The prototype's toast offers
  Undo too, but its snapshot holds only tasks and follow-ups, so it cannot
  restore the contact.
- **Cancel, Save and Delete all go to People**, as in the prototype, even
  when the form was opened from a profile. **Say if Cancel should go back to
  the profile instead.**
- **The notes are the contact's "Remember for next time"**: one field, the
  same one the profile edits.

### 2.24 Quiet hours: what "respect" means is not stated
SCREENS.md § Notifications ends "Respect Quiet hours and the Quiet style
(badge only)". The Quiet *style* is spelled out in § 21–23 — no sound, no
vibration, badge and list only. Quiet *hours* are not: a reminder that falls
due at 03:00 could fire silently, or be held until 08:00.

The build **fires on time, silently**, for two reasons. A held reminder would
arrive after the thing it was for, which is the one failure this app exists to
prevent; and the handoff's own "Morning of" offset already fires at 08:00,
which is exactly quiet-hours-end — so the design has a way of saying "wait
until morning" and does not use it here. Say if you want the other behaviour.

### 2.25 Three of the five notifications have no Arabic
SCREENS.md § Notifications gives the wording for each row, in English only.
Two of the five can be composed from copy that exists in both languages: the
task reminder is `{Type} · {title}` / `{who}`, and the Firm repeat is the same
again. The other three have nothing:

| Row | SCREENS.md | What is shipped instead |
|---|---|---|
| Follow-up due | "{who} hasn't replied" | "Needs a nudge" / "يحتاج متابعة" (the status the Follow-ups screen already shows for that state), with the person as the body |
| Evening | "Close the day?" | "Close the day" / "سكّر يومك" + "Takes a minute" — Today's own card, minus the question mark |
| Focus end | "Focus session done" | "Focus session · 45 min" / "جلسة تركيز · 45 دقيقة" + "Close the day" |

These are stand-ins, not translations: `src/lib/notifications/copy.ts` is the
one file to change when the real strings arrive. **Please supply all three in
both languages** — a notification is often the only part of the app someone
reads that day.

There is also no wording for notifications being **off**. The design's
Settings row shows its value as "On" and never considers the other case, so
the build shows that value until the user actually refuses, and then shows
none rather than inventing an "Off". Same for the green "On" badge inside the
section.

### 2.26 Notification delivery is unverified
The rules are tested — 20 cases in `src/lib/notifications/plan.test.ts` cover
the offsets, the Firm repeats, quiet hours wrapping midnight, the follow-up
and evening rows, and the pending cap. What cannot be tested in this
environment is delivery: the permission prompt, the Done / Snooze / Open
buttons, whether a snooze from the lock screen really moves the task, and
whether iOS's 64-notification limit behaves as assumed.

**That needs a device**, once there is an Apple Developer account to build
with. Until then, treat the notification layer as written-but-unproven, and
`npm run smoke` says nothing about it.

### 2.27 The Morning priority eyebrow has a name baked into it
`pr_k` is shipped as "GOOD MORNING, KHALID" — the demo user's name, inside the
string, in both languages. SCREENS.md § 05 writes it "GOOD MORNING, {NAME}".

It is composed from the greeting and the account instead
(`inline.goodMorning` + the first name, uppercased), which reproduces the
handoff's own string exactly for that user and works for everyone else. The
prototype does the same thing a few lines away — `'GOOD MORNING, ' +
first.toUpperCase()` — so the baked-in `pr_k` looks like a leftover.

### 2.28 Focus: two prototype slips, and one timing disagreement
- **The mic icon on "Park it" is invisible.** The prototype draws a white
  circle and puts a white icon in it (`ic.mic` is `this.ic('mic', 22,
  '#fff')`), so nothing shows. The circle's own `color` is ink, which is what
  the icon was meant to inherit, so it is drawn in ink here.
- **"{n} promises are safe until later" counts every open task**, not today's.
  Followed as-is: during a session what is on your mind is the whole list, and
  that is what the sentence answers.
- **The screen dims after 4 s in SCREENS.md § 15 and 3.5 s in the
  prototype.** Following the written 4, which is what `motion.focusIdleDim`
  already carried. Half a second, but it is the kind of thing nobody notices
  until they are asked to review it.

### 2.29 The evening review collects decisions and throws them away
SCREENS.md § 20 gives each open promise three answers — Kept · Tomorrow · ✕
Not needed — plus a "Rest → tomorrow" bulk link, and says **"Nothing moves
automatically."**

In the prototype nothing moves at all: the marks go into `s.review`, and
`closeDay` only sets `closed: true`. Press "Close the day" and every task is
exactly where it was.

Read as a prototype shortcut rather than a design. "Nothing moves
automatically" means nothing moves *without being asked*, and the marks are
the asking — so here "Close the day" applies them: Kept completes the task,
Tomorrow moves it on a day, Not needed cancels it. Nothing happens until that
button, which is the part the rule is actually about.

The answers themselves are also kept, in `review` and `review_item` (§2.48).

Also: the prototype's "{a} of {b} promises kept" counts **every** task in the
list, including the six on later days — 18 rather than today's 12. An evening
review that counts next week's tasks is reporting on the wrong day, so this
one counts today's.

### 2.30 "Plan tomorrow →" does not exist in either language
SCREENS.md § 20 ends the closed state with a "Plan tomorrow →" button. There
is no such string in the handoff, and the prototype renders `t.pr_k + ' →'`
there — the Morning priority eyebrow — which comes out as "GOOD MORNING,
KHALID →".

The button goes to Morning priority, which is plainly the intent. Its label is
the nearest copy that exists in both languages, `t.tomorrow` ("Tomorrow" /
"لبكرة") plus the arrow. **Please supply the real string**, like the three in
§2.25.

### 2.31 Reschedule has no screen number
Swipe-left on a task, the clock on Up next, and the reminder sheet's "Pick a
date & time" all open the same thing, and SCREENS.md never numbers it — § 07
mentions its calendar in passing as part of the reminder sheet. It is built as
its own route, `/reschedule`, because three screens open it and it has two
modes: `move` changes when the task is due, `remind` sets a custom reminder
and leaves the task alone. The title and the button say which.

Its quick chips come from `rQuick`, whose day offsets are relative to the
prototype's frozen 9 October — "Monday" is `+4`. They are applied relative to
today instead, so "Monday" keeps its offset but not its name. Worth a look
when the demo data is refreshed.

### 2.32 The task store dropped every write but the last
Not a handoff question — a bug in this build, found by the first behavioural
test written against the evening review, and worth recording because the shape
of it will come back.

Every mutation read `tasks` from the closure and wrote the result:
`persistTasks(tasks.map(…))`. Two calls in the same event therefore both
started from the list as it was *before* either ran, and the second overwrote
the first. So:

- **The evening review applied one mark in three.** "Close the day" ran Kept,
  then Tomorrow, then Not needed; only Not needed survived.
- **A saved event lost itself.** The event form added the task and then wrote
  its reminder instant; the second write mapped over the list without the new
  task in it, and deleted it again.

Both looked correct on screen, because the screen re-rendered from the one
write that did land.

The store now takes an updater — `persistTasks(current => …)` — so calls in
the same event compose, and `addTask` works out a reminder's instant itself
rather than leaving every caller to make a second write. `npm run smoke`
covers both paths.

The general lesson for this codebase: **anything that changes the task list
more than once in a single handler must go through one updater**, or the
earlier changes are silently lost.

### 2.33 One measurement that is not a layout error
The drift check compares the tightest box around each labelled piece of text
on both sides. The prototype's template wraps every interpolation in an inline
`<span>`, React Native renders its own box around the same text, and those two
line up — text box against text box, which is why the numbers have been
trustworthy.

The Focus title is the exception. At 22 pt on a 1.3 line-height its glyph box
is taller than the line box it sits in, so the prototype's span reports about
5 pt above where the text is actually laid out. **Both sides put the title at
exactly 126** — the layout agrees; only the measurement does not. It is in
`KNOWN_DEVIATIONS` with that reason rather than papered over.

Recorded because the obvious fix is wrong. Skipping the prototype's inline
span looks like removing noise and instead falls back to the enclosing
button, which is 15 pt taller — every button label on every screen. Tried
once: two failures became sixteen, across five screens nobody had touched.

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

### 2.34 Quick capture, Brain dump, the Assistant and the Paywall
Every probe on the four screens sits at 0 pt, in both languages. Pixel
difference is 0.03–0.78 %.

**Decided by the product owner, 10 Oct 2026**, in answer to §2.1 and §2.2:

- **Free loses only the assistant meter**: 10 Assistant requests a day, and
  every other paid feature stays open. `src/policy/entitlements.ts` is
  unchanged; the meter that uses it is new (`src/lib/assistant-meter.ts`).
  Every message sent to the Assistant spends one, chips included. Capture and
  Brain dump spend none. The server will enforce the same count when there is
  one; the device's copy is what lets the Assistant answer without a round
  trip.
- **Weekly recap stays on the paywall**, all six features as designed. It must
  be designed, or the line removed, **before store submission**: selling a
  feature that does not exist is a review risk. Nothing routes to a recap;
  `can(plan, 'weeklyRecap')` is still false for everyone.

**Free text.** `parse()` in app-logic.js is a stub. It knows two names,
reads the first number as an hour, and cuts titles at 46 characters. It
was not copied. `src/lib/parse/` is the seam: one contract (`TextParser`,
text in, `{type, title, who, contactId, when}` out), one on-device
implementation that is good enough to build against, and `index.ts`, the one
place the backend call goes. The local rules start from the prototype's
keywords, 17:00 default and brain-dump splitting, and match people from
People rather than two hard-coded names. 17 tests hold them to the
handoff's own sample sentences in both languages. Because the local
parser does better, a card does not always read as the prototype's would.
"Remind me tomorrow at 10 to send Mohammed the price quote" is captured as
"Send Mohammed the price quote and follow up", tomorrow at 10:00, not as
the whole sentence cut at 46 characters.

**The Assistant's scope** is tasks, contacts, reminders and follow-ups, and it
cannot say anything else. Its replies are typed: a task card, the day's plan,
or the follow-up count, each with the handoff's own line above it. There is
no type for a free-text answer. A question outside that scope ("What is the
capital of France?") comes back the way the prototype handles any sentence:
as a task card the person can keep or ignore. The handoff has **no line for
"I can only help with tasks"**. Supply one if a refusal should be said rather
than shown.

**Where the build departs from the prototype**:

- **"Who am I waiting on?" answers with the real count.** `botFu` is the
  prototype's demo sentence, "Three threads are open. Noura is the oldest —
  3 days.", true only of its seed data. The reply uses the Follow-ups
  screen's own summary instead ("1 need a nudge · 2 waiting on a reply"),
  which says the same thing from the person's follow-ups.
- **The eleventh request on Free opens the paywall.** There is no designed
  state for reaching the limit. The message is not sent and not counted, and
  stays in the box. The paywall's first line explains the limit ("Free plan:
  10 requests a day."). **Say if a line in the chat should come first**; it
  would need copy.
- **Quick capture confirms with "Save & back to focus"**, not SCREENS.md's
  "Looks right" / "Edit". The prototype shows what was heard in an editable
  box, the parsed card under it (updating as the text is edited), and that
  one button. Its render is followed.
- **Send buttons are 50 × 50**, as their own style says. Capture's and the
  Assistant's text fields have no `min-width: 0`, so the prototype's row
  overflows and squeezes the button into a 30-wide oval. This is the same
  flex-shrink artefact as §2.19 and §2.21. The fields are 52 tall (50 plus
  the border the content-box adds).
- **"Talk instead" has a visible mic.** The prototype passes its white mic
  icon to a white button, so it renders invisible. It is drawn in ink, in the
  same space.
- **Brain dump only sorts what was written.** With an empty box the prototype
  sorts its own sample paragraph, and "Talk instead" fills that sample in.
  Here an empty box sorts nothing, talking adds what was heard (§2.35), and
  "Save 0" saves nothing and does not say "0 things saved".
- **Starting the trial does nothing yet.** In the prototype it makes the
  person Pro and says "Welcome to Pro 🎉". With no store accounts there is no
  product to buy (§3), so `src/features/paywall/purchases.ts` answers
  "unavailable", the plan stays Free, and nothing is claimed. When the stores
  exist, their own sheet takes over and Pro arrives with the receipt. Restore
  behaves as in Settings: with no store, "No previous purchases found." is
  the true answer. **The same care is owed in Settings**: its tip jar thanks
  the person ("Thank you so much ☕") for a purchase that never happened. That
  screen is not part of this change, so it is noted here rather than edited.
- **The paywall is measured without a name.** Its title takes the first name
  (", Khalid" / " يا خالد"), and the prototype's demo account has none, so
  with one the Arabic title wraps to a third line. The drift probe and the
  compared screenshot use a nameless session. A named one is captured as
  `24-paywall-named`.
- **The plan puts the One Thing at 09:00**, as the prototype does whatever
  the time ("Your One Thing goes first, while your head is fresh").

### 2.35 Speech-to-text has not been chosen
Quick capture's mic and Brain dump's "Talk instead" only pretend in the
prototype: each produces its own sample sentence after a delay. There is no
recogniser in this build. Two decisions are needed: on-device recognition,
or the audio sent to the backend with the text request; and the permission
strings both stores require (`NSMicrophoneUsageDescription`,
`NSSpeechRecognitionUsageDescription`, `RECORD_AUDIO` — DATA_MODEL
§ Integrations).

Until then, `src/lib/speech.ts` uses the platform's own recogniser where there
is one, which is a browser with the Web Speech API. Everywhere else the mic
puts the cursor in the text field, since both screens already accept typing.
Nothing that was not said is ever shown as heard.

### 2.36 Syncing with the server
The stores (tasks, the One Thing, contacts, history, follow-ups, settings,
the profile) now sync with the Supabase schema. Screens still read and write
only the device's stores, so nothing waits on the network and the app works
offline. `src/lib/sync/SyncProvider.tsx` runs a sync 2 seconds after a
change, when the app comes back to the foreground, every 5 minutes while it
is open, and when consent is recorded.

**It is dormant in every build so far.** A sync needs a Supabase session.
Sign-in is still the local stub (§3), so nothing ever makes one, and the
provider does nothing. It is tested against Postgres with the real migrations
and row-level security (`npm run test:db`), but **not against a hosted
Supabase project**, which does not exist yet. The PostgREST adapter
(`src/lib/sync/remote.ts`) has not made a real request. When sign-in calls
`supabase().auth.signInWithIdToken`, sync starts by itself.

How it decides (`src/lib/sync/reconcile.ts`). Each list is compared three
ways: the device, the server, and what the server held when this device
last finished a sync. A change made on one side only goes to the other. A
deletion travels both ways. When both sides changed the same row, the device
syncing now wins. An edit beats a deletion. Whole tables are read each time:
the schema keeps no edit times, and one person's data is small. The cost is
reading everything on each sync. If that ever matters, the fix is an
`updated_at` column with a trigger, and tombstones for deletes.

What the schema needed (`supabase/migrations/0002_sync.sql`):
- **Columns the app keeps and DATA_MODEL left out:** the task's "who" line,
  the contact's last-interaction line and when they were last contacted (the
  order of People), and the follow-up card's who / since text and its
  creation time.
- **Follow-ups outlive their contact.** On the device, deleting a contact
  removes their history but not the follow-ups. 0001's cascade would have
  deleted them on the server, so `contact_id` is now nullable and set to
  null. `next_at` is nullable too, as the app allows.
- **Users could make themselves Pro.** Row-level security limits which rows
  a user can write, not which columns, so under 0001 any signed-in user could
  set their own `plan`, clear `suspended`, or claim another account's Apple
  or Google subject. Those columns are now writable only by the service role.
  The test proves it.
- **`delete_my_account()`** deletes the auth user, and every row cascades
  from it. It records a completed, anonymous privacy request, so the admin
  panel can count deletions without knowing who asked.

Decisions that need the product owner:
1. **Sign-out while offline loses what was not yet synced.** Sign-out tries
   a last sync, then clears the device, because the data is on the server
   and the next person to sign in must not inherit it. If that last sync
   cannot reach the server, changes made since the previous sync are lost.
   The design has no "you have unsynced changes" warning. One is needed, or
   sign-out should wait for a connection.
2. **A failed account deletion is retried silently.** If the server cannot
   be reached, the device is wiped as asked, and the server-side deletion is
   remembered and finished on the next launch that has a connection. The
   design has no "could not delete" state, and DATA_MODEL allows 30 days.
   Store subscriptions are not cancelled by deleting the account. Apple
   expects the app to say so, and the delete sheet does not.
3. **On a true conflict, the device that syncs last wins.** This is rare for
   one person's data, but possible with a phone and a tablet both edited
   offline. Field-level merging would cost an edit time per field.
4. **A new device takes the server's settings and name**, not its own
   defaults. A name typed again during Account setup on a second device is
   therefore replaced by the one on the server.
5. ~~**Tips are writable by the user.**~~ Fixed in
   `0003_tips_from_the_store.sql`: like `subscription`, a tip is now written
   only by the store webhooks, and its owner can only read it.

What changed on the device:
- **New rows get UUIDs** (`src/lib/ids.ts`), because the keys are uuid
  columns.
- **Rows from before sync are given UUIDs on the first sync**, with every
  reference moved with them (`src/lib/sync/adopt.ts`).
- **Consent waits in a queue** on the device until a sync has written it
  (`src/lib/consent.ts`). Before this, a failed write at sign-up was dropped
  despite the comment saying it was kept. Delete account clears the queue,
  so one account's consent is never sent as the next account's.
- **Plan comes only from the server**, which the store webhooks will write.

### 2.37 The admin panel
All 13 screens in ADMIN.md are built, as a separate Next.js app in
`admin/`. In demo mode, run on the prototype's own seed data, they match the
prototype: all 56 probed elements are within 2 px of it, and pixel
difference is 0–0.22 % (`npm run fidelity`). Every remaining pixel
difference is explained below. Live, the panel reads the app's real tables
over a server-only Postgres connection, and signs the team in with Supabase
Auth (password, then TOTP).

**What it enforces**
- **Sign-in:** an @theonething.app address; Supabase at assurance level 2
  (password and TOTP); and a row in `admin_member`. All three, or no access.
  Five failures in 15 minutes lock that email for 15 minutes.
- **Roles, checked on the server for every page and action**
  (`admin/src/auth/permissions.ts`):
  - Owner: everything.
  - Support: users, subscriptions, support, privacy requests, trial
    extensions, replies and exports. It cannot delete, suspend, grant Pro,
    read the audit log or manage the team.
  - Analyst: Overview, Growth and the pseudonymised export only.

  Where the handoff is silent, the narrower reading was taken ("give each
  person the least access they need"): Grant Pro, Suspend, offer codes and
  the audit log are the Owner's. The sidebar leaves out what a role cannot
  open. The prototype shows every item to everyone, because it has only one
  admin.
- **Every view is logged.** A user's record reaches the browser only
  through the action that writes "Opened user record", and each drawer tab
  writes "Viewed …". Actions use the prototype's wording.
- **The audit log is append-only in the database itself** (a trigger in
  `0004_admin.sql`). This holds even for the panel's own connection, which
  owns the table.
- **Suspend sets Supabase Auth's ban.** The suspended user cannot sign in or
  refresh a session; one already open lasts until its token expires (an
  hour at most).
- **The analytics export is pseudonymised:**
  - each user gets a stable ID derived with a secret key (`DATASET_KEY`);
  - phone numbers and emails are SHA-256 hashed;
  - no names or message text are included.

  The database test checks that no name, email, phone or account ID appears
  in it.

**What the app now reports, for the panel** (`0004_admin.sql`): its app
version and notification permission when they change; and, once a day, that
the user was active (`last_seen_at`, and one `active_day` row). Active
users and Retention are counted from those rows. They hold a date, nothing
about what was done.

**Shown live as designed, but with nothing behind it yet.** Each of these
needs a service that does not exist yet. Until then the button does
nothing, writes no log line, and says "Not connected yet — …" (stand-in
wording). Demo mode behaves as the prototype does.
- **Emails** — Send how-to, Export their data, Send export, and the
  confirmation email after a deletion. They need an email provider.
- **Store APIs** — Re-check receipt; Extend trial and Grant Pro (the trial
  and promotional offers belong to the stores); offer codes; replying to
  store reviews; importing reviews at all.
- **Force re-sync** needs push notifications sent from the server.
- **In-app replies** need somewhere in the app to read them. The app has no
  "Contact us" or support inbox, so no in-app ticket can arrive yet either.
- **Figures with no source are left out rather than invented:**
  - Downloads (the funnel starts at "Signed in");
  - crash counts (the Crashes check is omitted);
  - store-review counts;
  - trial conversion and the change in cancellations (they need history the
    tables do not keep).

  Revenue is an estimate from list prices with a 15 % store fee, until the
  stores report the real figures.
- **The activity timeline is built from what the tables record:**
  - sign-up;
  - One Things set;
  - messages confirmed sent;
  - meetings and visits added;
  - follow-ups closed;
  - the subscription starting.

  Moments the app does not store (a focus session ending, a brain dump)
  cannot appear until there is an event log. DATA_MODEL's analytics events
  list is that log; it is not built.

**Where the prototype is wrong, and the panel is not**
- **The Overview's date line** is hard-coded "Friday, 10 October 2026". 10
  October 2026 is a Saturday. The panel writes the real date.
- **Growth's insight line** names "Added 3+ tasks → Started trial (−58%)"
  as the biggest drop. By the prototype's own numbers it is Started trial →
  Became Pro (−59%). The panel works it out from the funnel. The suggestion
  that follows is the prototype's own words and is shown only on demo data.
- **The sign-up chart's day labels** are a fixed "Mon…Sun" twice. The panel
  labels each bar with its real weekday; the demo uses dates that read the
  same way.

**Other decisions**
1. **Missing copy.** The prototype accepts any password and any code, so it
   has no words for these. Stand-ins are used; please supply real copy.
   - a wrong password: "That email and password don't match."
   - a wrong code: "That code didn't work. Try the newest one."
   - a locked account: "Too many attempts. Try again in 15 minutes."
   - an admin with no authenticator: "Your 2-step verification isn't set up.
     Ask the Owner."
   - an action whose service isn't connected yet: "Not connected yet — …"
2. **Adding an admin has no screen.** Team & roles lists the team but adds
   nobody, and a TOTP factor can only be enrolled by the person themselves.
   Until a screen is designed, `admin/scripts/add-admin.ts` does it from the
   command line, with the new admin present to scan the code. It has not
   been run against a real project, since none exists. Resetting a lost
   authenticator ("Ask the Owner") is likewise done in the Supabase
   dashboard.
3. **The "why do you need to see this?" panel is not built.** The prototype
   wires a reason-and-ticket prompt with "Unlock for 10 min", but nothing in
   the final design opens it: contact data is always shown, and the role
   cards' "Reveal contact data" lines describe it. It comes back if contact
   data is to be masked by default.
4. **Dates are written in Asia/Riyadh time** (`NEXT_PUBLIC_ADMIN_TIME_ZONE`),
   on the server and in the browser alike.
5. **Two task kinds borrow colours.** The prototype colours six kinds; the
   app has eight, so Webinar uses Meeting's colours and Course uses Remind's.

### 2.38 The Assistant backend
Quick capture, Brain dump and the Assistant now read notes with Claude,
through the `assist` edge function, whenever there is a Supabase project
and a signed-in session. Until then — which is every build so far — the
on-device rules answer, as before. The screens are unchanged.

**How it works** (`supabase/functions/assist/`)
- **One request, one structured answer.** The function asks Claude for JSON
  in a fixed schema: one task, a list of tasks, or the Assistant's
  task / plan / follow-ups. There is no shape that carries free text, so
  the Assistant still cannot say anything the design did not write.
- **Checked twice.** Every answer is read through one shared contract
  (`supabase/functions/_shared/assist-contract.ts`), on the server and
  again in the app. A contact ID that is not one of the person's own is
  dropped.
- **The person's text is data.** Their note and their contact names are
  fenced in tags and marked as their own data, never instructions.
- **Model:** Claude Opus 5.5 at low effort; reading a note is light work.
  Server-side fallback (`fallbacks: "default"`) is on, so a request Claude
  declines is retried on Anthropic's recommended fallback model rather than
  coming back empty. If the model is changed, the prompt and the effort
  should be re-checked with `scripts/try-assist.ts`.
- **The meter is the server's** (`0005_assist.sql`). Free users get 10
  Assistant requests a day, counted in their own time zone; Pro and trial
  have no limit. The functions that count can be called only by the edge
  function's service role, for the user it has verified. A user's own
  session can read its count but not change it, so it cannot give itself
  requests back. A request that produces no answer is refunded.
- **Falling back.** The app keeps its own count too, so the eleventh
  request opens the paywall without a round trip. If the server says
  "limit" first (another device used the requests), the Assistant does
  exactly what the eleventh request does. Any other failure — no project,
  not signed in, offline, Claude unavailable — falls back to the on-device
  rules without a word, since a proposal is always shown for confirmation
  first.

**Not yet run against Claude.** There was no API key in this environment.
Everything around the call is tested:
- the contract, the handler and the client, with stand-ins (`npm test`);
- the meter in Postgres (`npm run test:db`);
- the function code, type-checked against the real SDK.

Two pieces have not run at all:
- **`index.ts`**, the thin Deno entry that connects all of this to Supabase:
  checking the token, the two database clients, CORS. It runs only on
  Supabase. Reading it again found one bug, fixed: it checked the user
  without passing their token.
- **The prompt itself.** `scripts/try-assist.ts` runs
the real function code on the handoff's sample sentences in both languages,
including the out-of-scope question. A run is 14 requests, about 20 cents,
so it is not in CI.

**Decisions for the product owner**
1. **A guard on Quick capture and Brain dump.** Both are open on every plan
   (§2.34). The server still stops one account at 200 a day, to cap the
   Claude bill. Nobody is told; past it, the on-device rules answer. Change
   the number in `0005_assist.sql` and the contract together; a test checks
   they agree.
2. **The day turns over in the person's own time zone.** Someone who keeps
   changing their phone's zone could stretch a day's allowance a little.
   Counting in one fixed zone would stop that, but the limit would then
   reset in the middle of some people's day.
3. **Cost.** Every note sent from these screens is a Claude request. On
   Claude Opus 5.5 ($4 in / $20 out per million tokens) a note is about
   800 tokens in and a few hundred out, counting its reasoning: roughly one
   to two cents each.
   - A Free user at the Assistant limit, plus ten captures a day, costs
     about 20–40 cents a day.
   - Pro is $2.99 a month and has no Assistant limit.
   - Claude Haiku 5.5 would cost a small fraction of that. Whether its
     reading is good enough should be measured, not assumed:
     `scripts/try-assist.ts` with the model changed in `claude.ts`.

   This decision is yours; the code uses Opus 5.5 until you say otherwise.
### 2.39 Analytics: seventeen events, one table, and no way to send a phone number
`DATA_MODEL.md` § Analytics events lists the taxonomy and two rules —
"Phone/email SHA-256 hashed; never send message text" — and nothing in the
handoff says where the events go or who reads them. `ADMIN.md` then builds
KPI cards, a seven-step funnel and weekly retention cohorts out of them. So
the events were specified, demanded by another product, and implemented by
nobody. Four decisions were needed:

**Where they go.** An `analytics_event` table in the same Postgres
(`0006_events.sql` — numbered after the admin panel's and the assist
function's migrations, which landed on `main` while this was being written),
not a vendor. The admin panel meanwhile derives its funnel and cohorts from
the entity tables (§2.37), which for those particular numbers is the better
source — state cannot be lost in transit. These events are for what leaves no
row behind: which capture route a task came in by, which channel Compose
opened, a nudge that brought someone back, a focus session, a paywall seen. A vendor would mean an SDK on the device,
a privacy-manifest entry, a Data safety answer and a second place user data
lives — all before the first dashboard. The admin panel already reads this
database through the service role, so a table it can `group by` is the
shortest path to the screens that need it. If a vendor is wanted later, this
table is the thing to replay into it.

**The name is an enum, not text.** A typo in a client is then a rejected
insert rather than a silent extra row in someone's funnel. Properties are
`jsonb`, so `task_created`'s `{type, via}` stays queryable without a column
per event.

**No hashing, because there is nothing to hash.** The union in
`src/lib/analytics/events.ts` is the whole surface, and no event in it carries
a phone, an email or any free text. That is a stronger guarantee than hashing
would have been: there is no field to put a message body in, and adding one
fails a test that pins the six allowed property names. Hashing a value the
app never sends would have been ceremony.

**`account_deleted` is the server's to send.** By the time it happens the
account's rows are gone and the session with them, so an insert from the
device would either fail row-level security or resurrect a `user_id` the hard
delete just removed. `delete_my_account()` records it instead, with no
`user_id` — which is also how `privacy_request` already counted deletions
without keeping who asked. Every other event's `user_id` is
`on delete set null` for the same reason: the funnel keeps its shape, and the
rows stop being personal data, so DATA_MODEL's hard delete stays a hard
delete.

Two smaller calls. Events ride along with whatever syncs next rather than
triggering a sync each — a sync per tap is a sync per tap — while an export
request syncs at once, because it carries a promise with a clock on it. And
`task_done` is tracked in `toggleDone` and in the review's bulk close, not
centrally in `persistTasks`, which would have been tidier and wrong: a task
another device finished arrives through `applySync`, and that is not this
device's event to report.

The queue caps at 500 events, dropping the oldest. A device offline for a
month must not grow without bound, and a count short by its oldest rows beats
a queue that never drains.

### 2.40 "Download my data" was a toast and nothing else
The row is in the design — Settings → Privacy & data, with the toast "We'll
email your data within 24 hours." The build showed the toast and kept no
record, so the Privacy Policy's own sentence ("Download or delete your data
and account from Settings", in both languages) rested on a request that had
never been made. `privacy_request` was waiting for it the whole time:
`type` is `('delete', 'export')`, `source` is `('app', 'web')`, and
`deadline_at` defaults to 30 days out — the countdown ADMIN.md § 11 draws.

The request now queues on the device and goes up as that row. It is
deliberately not deduplicated: asking again tomorrow is a second request with
its own deadline, and two rows an hour apart tell support more than one row
would.

Writing it turned up an integrity hole next door. `0001` gave
`privacy_request` the same owner-only policy as every other table carrying a
`user_id`, which let a user delete their own deletion or export request — the
one row that proves a request was made, and the row the 30-day clock is
counted from. `0003` revokes update and delete, as `admin_audit_log` already
did: insert and read, nothing else. A test in `scripts/test-sync-db.ts` holds
that line for both tables.

The export itself — read every table for one user, email the result inside 24
hours — is a server job, and is not written. Nothing on the device can do it,
and nothing pretends to.

### 2.41 Real Apple and Google sign-in, and the two states the design never drew
The sign-in screen recorded which button was tapped and opened Account setup;
`src/lib/session.tsx` then held the whole account on the device. Meanwhile the
sync layer waits on `db.auth.getSession()`, so several thousand tested lines
did nothing. This is the keystone, and it is now written. It has still never
run: both flows need a real build, the client IDs, and the providers
configured in Supabase (RELEASE.md § 2–3).

**Which modules.** `expo-apple-authentication` for Apple, and
`@react-native-google-signin/google-signin` for Google. I started with
`expo-auth-session`'s Google provider, which would have worked on web too —
tempting, since the whole verification harness is web — and then found its
`GoogleAuthRequestConfig` carries an `@deprecated` tag pointing at the native
module. Building a brand-new integration on a deprecated API to gain test
coverage we cannot trust anyway was the wrong trade, so it came back out.
`expo-crypto` went in and came out with it: it was there for a nonce that
neither provider's documented flow uses.

**No nonce.** Supabase's own native examples pass the identity token to
`signInWithIdToken` without one, and Apple's token is already bound to the
bundle ID. Inventing a nonce protocol that the provider and Supabase were not
documented to agree on, in code nobody can run yet, would be the worst kind of
guess: invisible until it fails on a device.

**Anything but `ready` falls back to the local session.**
`src/lib/auth/availability.ts` decides, before a native module is touched,
whether a provider can really sign anyone in: no backend, no client IDs, or
the wrong platform. Web is always "wrong platform", so the harness keeps
rendering the first-run flow exactly as before, and a build without a Supabase
project keeps working for whoever is testing the UI. It is the same shape dev 2
used for the backend itself, and it is tested, which the native calls cannot be.

**Two states the handoff has no copy for.** A cancelled sign-in and a failed
one. Apple and Google both show their own sheet and their own error before
returning, so the screen does nothing on either rather than inventing a
message — SCREENS.md § 01 has no error state but the Terms one. If a
"couldn't sign you in" line is wanted, it needs copy in both languages; it is
on the list with the other four missing strings.

**Apple says the name once.** `fullName` and the real email come back on the
*first* authorisation and never again, so they are carried through the sign-up
draft and prefill Account setup's name field — still editable, because Apple's
spelling of someone's name is not always the one they use. The email is stored
as given, relay address and all (RELEASE.md § 9.8).

**`app.config.js`, not more `app.json`.** Google's iOS side needs a URL scheme
built from the reversed iOS client ID, and there is no honest placeholder for
it: a made-up scheme builds and then fails on a device. So the config became a
function that adds the plugin only once `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is
set, with `app.json` still the readable base Expo passes in. `usesAppleSignIn`
is turned on there too, since adding the capability later means a new
provisioning profile.

**What this turned up in the tests.** The first-run flow had no behavioural
coverage at all — sign-in and setup were only ever screenshot-compared — so
`scripts/smoke-analytics.js` now drives it. Writing that found nothing wrong
with the app and one thing worth knowing: the consent row is a single
pressable whose *centre* is the "Terms of Service" link, so a click aimed at
the middle of the row opens Legal rather than ticking the box. That is the
design — the links are meant to be reachable — but it is worth knowing that
the box itself is the 22 × 22 at the start of the row, and that is where the
test aims.

### 2.42 The store webhooks: the only thing that makes anyone Pro
`subscription` and `tip` have been waiting since `0001`, and
`0003_tips_from_the_store.sql` closed the last user-writable path into them.
Nothing on a device may write `app_user.plan` either — `0002_sync.sql` revoked
that column. So until this, a purchase could complete in the store and change
nothing at all in the app, and the admin panel's Subscriptions screen had no
source. `supabase/functions/app-store` and `supabase/functions/play-rtdn` are
that source.

**All the deciding is in one pure file.** `_shared/store-contract.ts` maps
both stores' taxonomies — 23 Apple notification types, 14 Google ones, and
Google's eight subscription states — onto the six values `sub_status` allows
and the four `plan_kind` allows. It touches neither store nor database, so
every case is tested exhaustively (46 of the 150 unit tests) without an
account, a certificate or a network. The webhooks themselves are shells:
verify, look up, call one SQL function.

**The rule the mapping follows is never guess.** An unknown notification type,
a product we do not sell, a payload with no account on it — each comes back as
`ignored` with a reason, and the webhook records the reason rather than
writing a subscription nobody bought. A type Apple adds after today lands
there too, rather than being silently dropped.

**Three places the obvious mapping would have been wrong:**

- **Cancelled is not over.** Turning auto-renew off does not end a paid year.
  `DID_CHANGE_RENEWAL_STATUS / AUTO_RENEW_DISABLED` and Google's
  `SUBSCRIPTION_STATE_CANCELED` both keep Pro until `ends_at`, and so does a
  grace period. `planFor` takes `now` and decides from the date, which also
  means a lost `EXPIRED` notification cannot leave someone on Pro forever.
- **A renewal is never still a trial.** The offer fields can still be set on a
  renewing transaction, so `DID_RENEW` is `active` regardless of them.
- **Google has no "in trial" state at all.** The 7-day free trial is an
  *offer* on the base plan, so an `offerId` on the current line item is what a
  trial looks like. That holds because these base plans carry exactly one
  offer (DATA_MODEL § Integrations). If a second is ever configured, that is
  the line to revisit, and it is marked.

**Idempotency is the property money depends on.** Both stores redeliver
deliberately, and Apple retries anything that is not 2xx five times.
`store_notification` claims each notification by `(store, external_id)` —
Apple's `notificationUUID`, Google's Pub/Sub `messageId` — before anything
else happens, so a replay returns false and writes nothing. A tip gets a
second belt: `tip` had no stable handle at all, so `0007` adds
`transaction_id` and a unique index, in case one purchase ever arrives under
two notification ids. Both are tested against Postgres
(`scripts/test-store-db.ts`), including that a replay cannot walk a
subscription backwards.

**The status codes are part of the design.** A notification we understood
answers 200, including one we chose not to act on. A failed write answers 500,
because a 200 would mean the store never sends it again — a purchase lost for
good. An unverified payload answers 401 and writes nothing, not even a notice:
it is not the store's traffic to record.

**What verifies them.** Apple signs every notification, and its own library
checks the chain — against Apple's root certificate, which the operator
supplies as a secret. No root is invented here and there is no default; with
none configured the function answers 503 and writes nothing, the way `assist`
does with no API key. Google signs nothing, so the Pub/Sub push must carry an
OIDC token from the service account the push subscription runs as, and that is
verified instead. Both URLs are public (`--no-verify-jwt`), because neither
store sends a Supabase token; the signature is the authentication.

**The safety net.** `lapse_expired_subscriptions()` moves anyone whose paid
period has passed off Pro without waiting to be told. Stores retry, so a lost
notification is unlikely — but a user keeping Pro for free is the expensive
direction to be wrong in. It runs hourly on pg_cron since `0009_schedules.sql`
(§2.47).

**The one thing the app still has to do.** A purchase has to carry the
Supabase user id — `appAccountToken` on StoreKit, `setObfuscatedAccountId` on
Play Billing. It is the only part of a purchase that cannot be recovered
afterwards, and the webhooks refuse to guess from an email or a receipt. A
purchase made without it is money taken for a Pro account nobody gets. That
note now sits on `startTrial` in `src/features/paywall/purchases.ts`, which is
where purchases will be written.

**Neither has run.** No store account, no certificate, no service account, no
Supabase project. What is proven is the mapping, the status codes, the
idempotency and the grants; what is not is a single real delivery.

### 2.43 The domain moved to `onlyonething.app`
The product owner's decision, after the handoff was written, so it overrides
the handoff's copy rather than departing from it. Twenty-eight references
moved in the app, the admin panel and their checks:

- The app's six user-facing strings, two of them Arabic:
  `privacy@onlyonething.app` and `onlyonething.app/delete`. **Both have to
  resolve** — a reviewer clicks them, and the delete sheet's own copy promises
  the second one (RELEASE.md § 7).
- The admin panel's email domain, which is a sign-in rule and not decoration:
  only an `@onlyonething.app` address can reach it. `ADMIN_EMAIL_DOMAIN` is
  the one place it lives, and the rejection message now reads from it rather
  than repeating it. `scripts/add-admin.ts` repeats the literal because
  `src/config.ts` is `server-only` and that is a CLI script; the comment says
  so.
- The team's seed data, so demo mode and the sign-in rule agree. Without that
  the demo users could no longer sign in to the demo.

This is the first place the build deliberately says something the prototype
does not, in text the prototype's own screenshots show — so the admin panel's
fidelity check needed a way to express it. A probe can now be
`{ app, prototype }`: the same cell's position is still compared, and the two
wordings are recorded rather than the probe being deleted. Still 56 probes,
none failing; the sign-in screen's pixel difference moves from 0 % to 0.05 %
because the placeholder is three characters longer.

The handoff's own files keep `theonething.app`. They are the record of what
was asked for, not configuration.

### 2.44 The data export, and the list that cannot go stale
§2.40 made "Download my data" leave a record; this answers it.
`supabase/functions/export` claims the oldest unanswered request, reads every
table holding that person's rows, writes one JSON document to a private
Storage bucket, and marks the request done. `0008_export.sql` is the
claim/complete/release around it.

**The hard part is not the reading, it is staying complete.** A year from now
somebody adds a table and nobody remembers the export; the promise quietly
stops being true, and the only way to find out is a regulator asking. So the
list is not maintained by hand and trusted — `scripts/test-export-db.ts` asks
Postgres which tables carry a `user_id` and holds the export to that answer.
A new one fails the test until it is either exported or written into
`EXCLUDED` **with a reason**, and the test checks the reason is long enough to
be one. I added a table that nobody exports to prove the test fails, then
took it out again; a check that cannot fail is not a check.

Two tables are excluded, both deliberately: `admin_member`, which is a team
membership rather than anyone's use of the app, and `store_notification`,
which is the store's delivery traffic — what was actually bought is exported,
through `subscription` and `tips`.

**Three smaller decisions.**

- **Every section appears, empty or not.** A missing key reads like something
  withheld; an empty list is an answer. The document also carries its own
  table of contents and the omissions with their reasons, so a reader can see
  the shape of it rather than having to trust it.
- **The file first, then the request.** A request marked answered with no file
  is a promise broken silently; a file with the request still open is
  repeated work and nothing worse. A failure anywhere hands the request back
  (`release_export_request`), because left claimed it would sit there until
  the 30 days ran out with nobody told.
- **One at a time, `for update skip locked`.** Two runs on a schedule step
  over each other rather than both answering the same request.

**What it does not do is send the email**, and that is on purpose. The copy
promises "we'll email your data within 24 hours", and an email provider is a
decision about who processes a file containing someone's entire account — the
product owner's to make, not mine (RELEASE.md § 9.3). Until one is chosen the
file is written, the request is marked answered with its path, and the admin
panel's Privacy requests screen is where someone hands over a signed link. A
signed URL is made when the link is handed over rather than stored, so it
expires; the bucket stays private.

Never run, like the rest: there is no project and no bucket. The schedule is
§2.47.

### 2.45 Every icon in the project was Expo's placeholder
Making the store screenshots turned this up, and it had been true since the
first commit: `assets/icon.png`, `android-icon-foreground.png`,
`splash-icon.png` and `favicon.png` were all the scaffold's blue chevron —
the one with the construction guides drawn on it. Nobody noticed, and §2.11's
fix made it worse by correcting the adaptive-icon *paths* so that they pointed
reliably at placeholder art.

`scripts/make-icons.js` renders them from the logo the design already has:
`LogoMark` in `src/design/BrandMarks.tsx`, a ring inside a ring around a dot,
in `ink.base` on white, with the proportions taken from the component (ring
36/64, dot 11/64, stroke 1.5/64 of the mark). This is not a new logo; it is
the one the sign-in screen is built around, at the sizes the OSes and the
stores need. A designer may still want to replace it — what it replaces was
not a design at all.

The Android foreground sits at 42 % of its canvas rather than 60 %, because an
adaptive icon is masked and may be cropped to a circle; the monochrome layer
is the same shape in solid black, for Android's themed icons.

**And the store screenshots themselves** (`scripts/capture-store.js`,
`npm run capture:store`), rendered from the running app in both languages:

- **Apple** takes one iPhone set now — the 6.9-inch class — and scales it
  down. 1320 × 2868 is that class's native size, so the app is rendered at
  440 × 956 points at 3x: a real device's logical size, not a stretch.
- **Google will not take the shape this app is.** Play's rule is that the long
  side may be at most twice the short side; the design is 402 × 874, which is
  1 : 2.17. The Play set is rendered at 432 × 864 at 2.5x — exactly
  1080 × 2160, exactly 1:2, and within 30 points of the design frame.
- The obvious first try, 360 × 720 at 3x, was wrong, and only looking at it
  showed why: at 360 points the greeting truncates to "Good morning, …" and
  the tab bar covers the top of the task list. **Both are true of the app on a
  narrow Android phone**, which is worth knowing before the first build goes
  on hardware — the design was specified at 402 and nothing has ever rendered
  it narrower.
- Both sets are flattened to 24-bit RGB. A screenshot carries an alpha channel
  even when nothing in it is transparent, and Play asks for PNGs without one.
- Play's **feature graphic** is its one required piece of artwork that is not
  a screenshot, and the handoff has no design for it. What is produced is the
  app's own sign-in lockup — mark, name, tagline, in the app's colours and
  type — at 1024 × 500, in both languages. The name stays "The One Thing" in
  the Arabic one: there is no Arabic brand name anywhere in the handoff, and
  inventing one is the product owner's decision, not a typesetting choice.
  Tracked-out capitals are an English device, so only the English name is
  tracked; letter-spacing pulls Arabic's joined letters apart.

The output is checked for the exact pixel size and Play's 8 MB limit, and the
script fails if a screen logs an error while being shot.

### 2.46 Adding a contact from the phone
Added at the product owner's request; the handoff has no such feature.
- **Import**, beside "New" on People, opens the phone's own contact picker.
  The chosen contact fills in the New contact form.
- **Fill from phone**, under the avatar on New contact, does the same from
  inside the form.

Either way the person sees the filled-in form, with the usual checks and
duplicate warning, and nothing is saved until they press Save. One contact
per pick, chosen in the phone's own picker.

**Privacy.** The app never reads the address book: the picker hands back
only the contact chosen.
- **iOS** asks for no permission at all. Apple's picker returns that one
  contact. This is why the code uses `expo-contacts/legacy`: the newer API
  returns only an ID and reads the details through the address book, which
  needs full access.
- **Android** cannot read the chosen contact's numbers without the contacts
  permission, so it is asked for once, the first time. Writing to contacts
  is blocked in `app.json`; the app never needs it.

**What it fills.**
- The name, or the company when there is no name.
- "Company or role": both, as "Job · Company", when the phone has both.
- One number: the primary, else a mobile, else the first. It is split into
  country and number by its international prefix; a local number keeps the
  form's country, unless the phone knows it.
- One email: the primary, else the first.

`src/lib/phone-contacts/draft.ts` holds these rules, and
`draft.test.ts` checks them.

**Phones only.** The web build has no picker, so neither button appears
there. That is also why the screenshot and drift checks, which run on the
web, still match the design exactly. Neither button has been tried on a
device; that needs a native build.

**Decisions for the product owner**
1. **Wording.** The new copy is in `src/content/additions.ts`, the one
   place for copy the handoff never had:
   - "Import" / "استيراد";
   - "Fill from phone" / "تعبئة من جهات الاتصال";
   - the iOS permission text in `app.json` ("Used only when you choose a
     contact to add to People…"). iOS shows it only if the app ever asks
     for address-book access, which this feature does not. It is also in
     `src/content/locale-en.json` and, newly written in Arabic, in
     `locale-ar.json`, so an Arabic phone does not fall back to English.
2. **The Privacy Policy** should mention that people can be added from the
   phone's contacts, one at a time, by the user's choice. SCREENS.md's list
   for it already covers "people you add".
3. **One at a time.** Importing many contacts at once would need full
   address-book access. It was considered and not chosen.

### 2.47 The two jobs nothing was calling
`lapse_expired_subscriptions()` (§2.42) and the export function (§2.44) were
both written with "needs a schedule" beside them. `0009_schedules.sql` is
that schedule, on pg_cron, which every Supabase project has:
- **The lapse sweep runs hourly**, at :17. A subscriber whose store notice
  was lost keeps Pro for at most an hour past what they paid for.
- **The export sweep runs every ten minutes**, and calls the export function
  over pg_net once per waiting request, ten at most per run. When nothing is
  waiting, which is nearly always, it calls nothing, so an idle project
  costs no invocations. The copy promises "within 24 hours"; this leaves
  room to spare.
- **A claim left by a run that died** (a timeout, a deploy mid-run) is freed
  after an hour, by the same sweep. Before this, such a request stayed
  claimed for good and missed its 30-day deadline without anyone seeing it.

The export sweep reaches the function with the service role key, kept in
Supabase Vault rather than in the migration. Two secrets have to be set once,
in the SQL editor; the migration's header has the two lines. Until they are,
the sweep writes a warning to the Postgres log and calls nothing.

`scripts/test-schedules-db.ts` checks all of this against Postgres, with
pg_net and Vault stood in for. pg_cron is not installed there, which also
shows the migration applying without it. **Never run on Supabase.**

### 2.48 Focus sessions and the evening review now reach the server
`focus_session`, `review` and `review_item` were in the schema from the
start and nothing wrote them. The admin panel reads `focus_session` twice,
for a user's focus minutes in the drawer and for "used Focus this week" on
Growth, so both read zero for everyone.

The device writes them now, through the same kind of outbox as analytics
events (`src/lib/activity.ts`), because they are things that already
happened rather than state to merge. Nothing in the app shows them back, so
the device keeps no copy once they are sent.
- **A focus session** is recorded from the moment the screen opens. It is
  marked completed when Finish is pressed, and not completed when the screen
  is left. A session the app was killed during is not recorded; its
  `focus_started` event still is.
- **A closed review** records the day, the answer about the One Thing, and
  each task the user marked: Kept, Tomorrow or Not needed (`drop` in the
  database). Tasks that were already done get no row, because nothing was
  decided about them.
- An answer about a task that was deleted on another device before the
  review went up is dropped. Sending it would fail the task's foreign key,
  and with it the whole sync.
- Both are sent by key, so a sync that fails after sending them and sends
  them again writes nothing twice.

Checked: the engine test (one send, no doubles on a resend, the deleted
task's answer dropped), the Postgres test (the rows fit the tables, row-level
security holds, and Delete my account removes them) and the day smoke test
(Finish and Close the day each queue exactly one record).

### 2.49 Growth's first two funnel steps were the same number
ADMIN.md's funnel goes Signed in → Finished setup → … The panel showed the
same count for both, with a comment explaining why: it counted from
`app_user`, and that row is written by the first sync, which only a
finished setup starts.

Signing in does leave its own record, the auth user, which Supabase creates
at the moment of sign-in. So "Signed in" now counts auth users from the last
30 days, leaving out admin accounts, which are auth users too. "Finished
setup" counts `app_user` rows. The gap between the two is the people who
left during setup, which is the step the panel could not see.

"Added 3+ tasks" also counts `task_created` events now, so someone who added
three tasks and then deleted them still passed the step.

Not done: a "Saw the paywall" step. `paywall_viewed` is recorded (§2.39), but
ADMIN.md's funnel has no step for it, and adding one is a design change.
**Do you want it between "Added 3+ tasks" and "Started trial"?**

`admin/scripts/test-admin-db.ts` checks both: someone who left at setup, and
a user whose events remember three tasks after two were deleted.

### 2.50 Purchases are written, and they make nobody Pro on their own
`src/features/paywall/store.ts` holds the rules and `purchases.ts` binds them
to expo-iap (5.8) and the Supabase session. The paywall's trial, the three
tips, Restore (on the paywall and in Settings) and Manage subscription all go
to the store now.
- **Every purchase carries the Supabase user id**, as `appAccountToken` on
  StoreKit 2 and `obfuscatedAccountId` on Play. The webhooks need it to know
  whose purchase a notification is about, and it cannot be added afterwards.
  So without a backend session nothing is sold, and no store sheet opens.
- **The plan still comes only from the webhooks.** A finished purchase means
  the store took the money, nothing more. Pro arrives with the next sync,
  once the store's notification has reached the server.
- **Every transaction is finished**, including ones replayed from an earlier
  launch. The app connects to the store at startup for this, because Play
  refunds a purchase left unacknowledged for three days. Tips are consumed,
  so the same tip can be bought again. A payment still pending with the bank
  is left alone until the store reports it complete.
- **The tip jar thanks people only once the store has taken the money.**
  Before, it said "Thank you so much ☕" for a purchase that never happened
  (§2.34).
- **Manage subscription** opens the store's own subscriptions screen, and its
  web page where there is no store connection.

`store.test.ts` checks all of this against a pretend store: the id on both
stores, Play's free-trial offer chosen over the plain base plan, cancel
versus failure versus pending, a store sheet that never answers, consuming
tips, finishing a replayed purchase, and Restore ignoring tips.
**Never run against a real store.** That needs the products in both
consoles and a build on a device.

**Decisions this needed, all yours to change:**
1. **The Play subscription's product id is `pro`**, with base plans `yearly`
   and `monthly` (the webhook already reads those). RELEASE.md §1.2 named
   the base plans but not the product. Product ids are permanent once
   created, so create it with exactly this id, or tell me the one you want.
2. **Two new lines of copy**, in `src/content/additions.ts`:
   - Restore found a subscription: "Purchases restored." / "رجّعنا
     مشترياتك." The handoff has only "No previous purchases found."
   - The store refused for a reason other than Cancel: "The store couldn’t
     complete the purchase. Please try again." / "المتجر ما قدر يكمّل الشراء.
     جرّب مرة ثانية."
   Cancel says nothing, because the store's own sheet has already said it.
   A payment pending with the bank also says nothing, because there is no
   designed state for it.
3. **The paywall shows the handoff's prices as written** ($35.88/year,
   $4.99/month). Apple and Google set the local price in each country, so in
   Saudi Riyals, for example, the card and the store sheet will show
   different numbers. Showing the store's own price on the card is a design
   change, so it is raised here and not made. Apple's review checks that
   the price shown matches the price charged.

### 2.51 The silence after the sheet closes, and the file that would have eaten it

Two findings, and the second is the one that matters.

**Sign-in could fail and say nothing.** `app/sign-in.tsx` deliberately showed
no error, and the comment gave a reason: *"a failure has already been
explained by Apple's or Google's own sheet."* That is true for a failure
raised while the sheet is up. It is not true for the two that happen after it
closes successfully — `signInWithIdToken` being rejected by Supabase, and a
provider returning no token at all. Those are the realistic ones: a client ID
the project does not know, a paused project, no network, a build made without
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. The user taps, authenticates, the sheet
closes, and the screen sits there having apparently done nothing.

So `outcome.kind === 'failed'` now raises a toast, and only that kind.
A cancel is still the user's answer and still says nothing. The toast is
vague on purpose: the underlying message is diagnostic (*"Unacceptable
audience in id_token"*), unlocalised, and not the user's problem. It can
occasionally repeat something the sheet already said, which is a much smaller
harm than silence.

**`src/content/strings.ts` is generated, and says so in its own header.**
`scripts/port-content.js` transcribes the handoff mechanically, with no
override mechanism — so anything hand-edited into it is reverted, silently,
the next time anyone runs `npm run content:port`.

That had already happened to something load-bearing. The six places that say
`onlyonething.app` were a hand-edit; the handoff still says
`theonething.app`. A re-run would have restored a dead mailbox and a
`/delete` route that does not resolve — the two things RELEASE.md §7 says a
reviewer clicks, and Play requires. Nothing would have failed. No test covers
the contents of a string, and the only signal would have been a rejected
submission.

The generator now has an explicit overrides step: `SUBSTITUTIONS` for text
replaced throughout, `ADDITIONS` for keys the handoff never wrote. Each
carries its reason in the file, and each asserts it still applies — a
substitution that matches nothing throws and prints why it existed, rather
than producing a file that has quietly lost the change. Confirmed by pointing
the rule at a domain that does not appear and watching it refuse to write.

Re-running the generator now reproduces the committed `strings.ts` exactly
except for the new key, which is the useful part of the result: it proves
those six replacements were the *only* divergence. There were no other hand
edits hiding in a 1,700-line generated file, and now there is a place to put
the next one.

### 2.52 The browser suites were testing a bundle from three hours earlier

Two checks in `smoke-day.js` were failing — a finished focus session and a
closed evening review not reaching their outboxes. Both are developer 2's
work (§2.48), both looked like a real regression, and neither was.

`dist/` was three and a half hours older than `src/lib/activity.ts`. The
browser suites read the exported web bundle, and nothing rebuilds it for
them: `npm run smoke` runs the six scripts directly. Rebuilding and
re-running turned 262 checks into 264, all passing. The code was always
correct; the bundle had never contained it.

**That is worse than a failing test, because it fails in both directions.**
Here it reported working features as broken, which wastes an afternoon. The
other direction is the one that matters: a suite that reports green on code
that is not in the tree, which is how a regression reaches a store.

It is also how it reached me. After merging developer 2's four commits I ran
`npm test`, both typechecks and the migrations, and did not run the browser
suites — so the first time they ran against that merge was hours later, by
which point the failure looked like something I had just done.

CI never had this problem: the fidelity job runs `capture:app`, which
exports first, and a fresh runner has no `dist/` at all. So the fix does not
belong in the npm script — rebuilding on every smoke run would cost minutes
locally and export twice in CI, to prevent something CI cannot do.

`scripts/dist-fresh.js` instead refuses to start: it compares the newest
mtime under `dist/` against the newest under what `expo export` actually
reads (`app/`, `src/`, `assets/`, `app.json`, `app.config.js`,
`package.json` — not `scripts/`, `supabase/` or `admin/`, which cannot
change the bundle), and throws naming the gap and the command to fix it.
All six smoke scripts call it, and so do `capture-screens.js` and
`capture-store.js`, which have the same exposure whenever they are run
directly rather than through their npm scripts.

Verified by touching a source file and watching `smoke-day.js` refuse to
run.

### 2.53 A comment is not a safeguard, and three names that went missing

Two unrelated findings from reviewing build 9, except that both are about a
rule that was written down and then not kept.

**The generator would have withdrawn the privacy policy.** `strings.ts` is
generated from the handoff and its banner has said "do not hand-edit" since
the first version. It was hand-edited anyway. Between 9 and 14 October it
gained a **Pictures and files** section in both languages — the one
disclosing the business-card scan, imported spreadsheets and PDFs, and stored
photos — an expanded account of what a contact record holds, and the Arabic
Children and Health sections. None of it is in the handoff, so the next
`npm run content:port` would have reverted all of it. The app would then ship
a policy that understates what it collects, which is a PDPL and GDPR problem
before it is a store problem, and nothing would have failed: no test asserts
on the contents of a string.

§2.51 added `SUBSTITUTIONS` and `ADDITIONS` for exactly this, and they were
not used — which is the useful part of the finding. A mechanism nobody
reaches for is worth no more than the comment it replaced. So the generator
now refuses to overwrite a generated file that differs from its own output.
It cannot tell a revised handoff from a hand edit, and does not try: it
names the files, prints the `git diff` that answers the question, and stops.
`--force` after reading the diff is a decision; the silent revert is no
longer reachable by accident.

**Three names the parser could not see**, each confirmed by probe before the
fix and covered now by `names.test.ts`, which fails 3 of 7 against the old
code:

- *"Email the quote to Sara"* found nobody. `candidateName` read only the
  first match of each rule, and `MARKED` fires at "the" long before it
  reaches "to Sara"; rejecting "the" skipped to the next **rule** rather than
  the next match. Every match is read now.
- *"كلم علي"* found nobody. `normalizeArabic` folds ى to ي, so على (the
  preposition) and علي (Ali) are one word, and the preposition was in the
  stop list. The calling rules already consume a leading على before the name,
  so an علي that survives to be captured is the person. *"رن على نورة"* still
  reads نورة.
- `soundsAlike('Ali', 'علي')` was false, so even once the name was found the
  cross-script question never came. Both reduce to `"l"` — ع has no Latin
  consonant and the vowels drop — and the key had a two-letter floor. The
  floor stays except where both names are four characters or fewer, which is
  the narrowest rule that admits Ali. The cost of a wrong guess is one
  "did you mean …?".

Ali is among the commonest names in this app's first market, and two separate
rules had to be wrong for it to disappear. Worth remembering when the next
sound-alike rule is written: the test that matters is a name somebody is
actually called.

### 2.54 The behavioural suites, rewritten for the screens that exist

Build 9 redesigned most of the app — a Home with two views, People as
threads, the Next queue, email through a chooser, a quieter end to sending —
and the six browser suites still drove the screens it replaced. They did not
fail honestly: `smoke-tasks` died on a 30-second timeout before printing
anything, so 262 behavioural checks were not running at all, and CI's
fidelity job runs `npm run smoke`.

Nothing here changed what the app does. Each suite now drives the screen as
it is, and every assertion that moved says why:

- **The list is a view, not a route.** `/tasks` redirects to Today, where
  "All" is component state — so a reload drops back and the suite has to ask
  for it again. Two reloads were silently testing the wrong screen.
- **A person is one row.** The three per-row buttons became a press and
  hold, and the red follow-up dot shares the row's testID prefix, so counting
  by prefix counted everyone waiting twice.
- **Adding a person is a menu**: by hand, from a card, from a file, or from
  the phone. The form is two taps away.
- **Someone already reachable is shown, not typed.** `compose-phone` and
  `compose-email` only exist while the recipient is unknown; otherwise it is
  a row with their name, the number, and Change.
- **Coming back from WhatsApp or Mail asks once, quietly.** The old sheet of
  options is a row with "I sent it" and "Not yet", and the chase interval
  comes from the person's own setting rather than being picked each time.
  "Not yet" says nothing at all now, so the toast assertion went with it.
- **Mail is a choice of app**, so opening it is two taps.
- **Where, how long and the link are behind "More"** on the event form.
  These checks used `isVisible()`, which returns false without throwing — so
  they had been failing quietly, under a timeout further down.
- **The evening review ends on a confirmation**, not a "plan tomorrow"
  button. It had no testID; `app/review.tsx` gained one, which is the only
  change to the app in this commit.
- **Times read as people say them**: "3:00 PM", not "15:00".
- **The assistant asks rather than guesses.** A note with no "when" now
  brings back the question, so counting cards was counting the old design.

Two of these were worth the detour. `Pro is not metered` was failing in a
way that looked like paying users hitting the paywall; instrumenting it
showed `url=/assistant cards=0` — not metered, just answered with a question
instead of a card. And `un-finishing it records nothing` looked like
`task_done` firing twice on one task. It was not: a finished card leaves the
queue, `.first()` then found the next card and finished that one too. The
check now holds the card's own id, confirms it leaves, and takes the finish
back through the toast's Undo — which is how the UI actually offers it.

264 checks, all passing. The lesson is the same one §2.52 and §2.53 keep
teaching: a check that cannot run, and a rule nobody reaches for, both read
exactly like success.

### 2.55 The imported number that was wrong and looked right

Reviewing build 9's new surfaces, worst consequence first: the chain from a
spreadsheet to a bulk send, because a parsing slip there reaches real
strangers at scale.

`columns.ts` knew that "Excel turns long numbers into 9.66501E+11" and
expanded the scientific form with `Number(v).toFixed(0)`. The expansion is
only honest while the mantissa still holds every digit, and Excel's default
is **six significant figures**. So 966501234567 is written 9.66501E+11 and
comes back as **966501000000** — the right length, the right country, the
right operator prefix, the wrong person. No issue was flagged, because
nothing about the result looks wrong: it passes the digit count, it splits
into a plausible `+966 50...`, and the import screen shows it as an ordinary
Saudi mobile for the person to tick.

What it costs is the point. A contact imported that way is then called,
messaged or WhatsApped — and `app/bulk.tsx` walks a column of them one tap
at a time. The existing test covered `9.66501234567E+11`, which carries all
twelve digits and expands correctly; the rounded form nobody had tried.

The expansion is now trusted only where the mantissa's significant digits
cover the whole number. Where they do not, the cell comes back empty, which
is what makes `build` flag the row `bad-phone` — so the person sees a number
that could not be read rather than one that was invented. `5.0E+8` is
refused on the same rule: digits two through nine are unknowable, and
guessing zeros is the same mistake in a smaller coat.

My first attempt at the rule was wrong in the other direction — it compared
both sides with trailing zeros stripped, which makes them equal by
construction, so it passed the lossy case and rejected the safe one. The
test caught it, which is the argument for writing the test against real
Excel output rather than against the fix.

Also found, not fixed: **`app/import.tsx` reads the whole file into memory**
(`new Uint8Array(await (await fetch(uri)).arrayBuffer())`) with no size
guard. A large workbook or PDF can take the app down on a phone. Picking
the limit is a judgement about real files on real devices, so it is raised
here rather than guessed at.

Looked at and found sound: `plan.ts` never sends anything itself — every
channel opens the person's own app with the message written, which bounds
what any parsing mistake can do; `bccMailto` keeps a shared email's
addresses hidden from each other; the PDF reader's loops are all bounded
`matchAll` passes over the input, with no unbounded `while` and no obvious
catastrophic backtracking.

### 2.56 Unselling the feature that does not exist, and the guard catching its author

The paywall sold six things. `can()` returns `false` for `weeklyRecap` on
every plan, Pro included — so somebody pays $35.88 and gets nothing at all
for one of the six bullets they were shown. Unfinished is survivable;
charged-for and absent is a 3.1.2 rejection and a refund. The bullet is now
off the card in both languages. The capability stays in `entitlements.ts`:
the feature is unsold, not cancelled, and the row goes back the day the
screen exists.

Getting there took a detour worth writing down.

The copy is generated, so the removal belongs in `port-content.js` rather
than in `strings.ts`. It needed a third kind of override — `PRUNINGS`,
which drops a row from a list the handoff wrote and throws if the row is
not there. Then the guard from §2.53 refused the write, correctly, because
`strings.ts` still held the hand-edited privacy policy. **So I passed
`--force`** — and it reverted the "Pictures and files" section in both
languages, the fuller account of what a contact record holds, and the two
Arabic sections, exactly as §2.53 predicted. Restored from git.

The guard did its job and said to read the diff first. I read it after.
Worth stating plainly, because the lesson is not "be careful with
`--force`": it is that the escape hatch gets used by whoever is in a hurry,
including the person who built the hatch, so the thing worth protecting
must not depend on nobody using it.

So the privacy copy is no longer a hand edit. `REPLACEMENTS` carries it in
the generator, extracted from the file rather than retyped, and
regenerating now reproduces it. `--force` is no longer load-bearing for
anything true about the app. The resulting diff is two list entries in two
languages and nothing else.

One real bug surfaced on the way: `handoffDir(process.argv[2])` read
`--force` as a path to the handoff. The flag is now skipped when looking
for one.

**What this does not settle** is whether `strings.ts` should be generated
at all. The product has outgrown the prototype — the policy now describes
a card scanner and a spreadsheet importer the handoff never had — and each
such divergence adds a row to `REPLACEMENTS`. That is sustainable for a
few and silly for twenty. RELEASE.md §9.5.1 is the matching product
question; this is the engineering one, and it is worth answering
deliberately rather than when the list gets long.

### 2.57 strings.ts stops being generated, and the gates go in

Two decisions from RELEASE.md §9.5.1, approved and applied.

**`src/content/strings.ts` is a normal source file now.** It was generated
from the design handoff, and the tell that the arrangement had ended was
`REPLACEMENTS` (§2.56): to make regeneration safe I had copied the real
privacy copy *into* the generator so the generator could reproduce it — a
generator generating from itself. The handoff describes a prototype with no
card scanner and no spreadsheet importer, nobody is updating it, and the
file it produced now carries text that has to be legally true.

The property worth keeping survives: EN/AR key parity comes from
`const ACC_ar: typeof ACC_en` in the emitted code, not from the generator,
so a missing translation is still a compile error. `port-content.js` keeps
porting `icon-paths.ts`, `countries.ts` and `seed.ts`, which really are the
designer's and which nobody edits, and keeps the refusal guard for those.

**The gating matrix is settled** in `entitlements.ts`, with a meter
preferred to a lock wherever the choice existed:

- assistant — 10 a day, unchanged
- brain dumps — 3 a day, metered at *sorting* rather than typing, so
  rewording and sorting again does not cost two. `useBrainDumpMeter` is the
  assistant's meter with a different key; running out opens the paywall the
  same way the eleventh request does.
- client history — **off the card, left open.** It is the person's own
  notes about their own contacts; a window on your own data is the lock most
  likely to produce a support ticket and the hardest to draw well. Dropping
  a bullet costs one line of copy; building that lock costs design time.
- weekly recap — off the card already (§2.56), still off for everyone.

The paywall is four bullets now, from six.

**Two premises did not survive the code, and are left undone.**

*Webinars and courses cannot be created anywhere.* The event form supports
all four types — the field table, lesson tracking, the tests — but every
route into it passes `meeting` (from a contact, from People) or a type from
`AddSheet`, which offers only call, email, WhatsApp and reminder since Today
was trimmed from eight tiles to four. So "Meetings, webinars & courses"
sells two things with no door, which is the Weekly recap problem again. The
work is small — the feature is built and lost its entry point — but putting
tiles back into a sheet the designer deliberately trimmed is a design
decision, not a gate.

*The follow-up cap has four creation points*, three of which are
mid-batch: Quick capture, Brain dump and the Assistant each turn a parsed
list into tasks and waiting items at once. Interrupting a batch with a
paywall is the wrong answer, and quietly dropping the waiting ones is
worse. What should happen when a Free account's fourth follow-up arrives
inside a batch of nine is a product question, so `canAddFollowUp` exists in
the policy and nothing calls it yet.

### 2.58 Follow-ups: the cap was the wrong shape, and "Auto" was the answer

§2.57 left two gates undone because their premises did not survive the
code. Both are settled, and the paywall is three bullets.

**"Meetings, webinars & courses" is off the card.** The feature is built —
field table, lesson tracking, tests — and has no door: every route into the
event form passes `meeting` since Today went from eight tiles to four. The
honest options were to put the tiles back or to stop selling it, and with
no launch date riding on webinars, stopping selling it is the one that can
be undone cheaply.

**The follow-up cap is gone, and that is the more interesting one.** The
first design was three waiting follow-ups on Free. Writing it down made the
mismatch obvious: nobody *adds* a follow-up. They accumulate, as a side
effect of sending things. So a count cap means the fourth message quietly
goes unchased — invisible when it happens, and failing exactly where the
feature is supposed to help. The batch problem (Quick capture, Brain dump
and the Assistant each turn one parsed list into several waiting items at
once) was a symptom of that, not the difficulty itself.

The card already said what Pro is: ***Auto*** follow-ups. The word is the
feature. So the number is not limited at all — `canAutoChase(plan)` gates
whether the chase starts *on its own* after a send. A Free account can
still have anyone waiting on it and can still set a chase by hand from the
Sent row's Change; it just has to ask. One condition in `compose.tsx`, no
batch problem, no new screen: the Sent row already handled "no chase" and
now reads "Sent. Pro follows up for you." instead of "Sent".

That is the second time in this round that reading the card's own wording
settled a question — "Unlimited" meant a meter, "Auto" means automation —
and both times it beat the number I had reached for first.

**The compose suite was asserting against seed data.** Its session is Free,
so once the chase stopped starting by itself, `followups[0]` was a *demo*
follow-up rather than one the test created: the failure detail read
"Sent Sunday · follow up Tue", which no part of that test wrote. It now
seeds a plan explicitly, checks the Free path (nothing chases, the row says
Pro would, Change is still offered) and re-runs the send as Pro for the
chase itself. 44 checks became 48.

### 2.59 What a share actually carries, and what the Lock Screen shows

Continuing through build 9's new surfaces, outward-facing ones first.

**An Android share was promising a file it could not send.** The "Zoho,
Spark or another app" row hands the draft to the share sheet, and its
sub-label read *"Takes the subject, the message and a file."* on both
platforms. React Native's `Share` takes `url` on iOS only, and
`expo-sharing` is not a dependency — so on Android the share carried the
text alone and said nothing. `compose.tsx` had no `Platform` import at all.

The row now tells the truth per platform, and where a file is left behind
(always on Android, and from the second file on iOS, since a share carries
one) the toast says attachments need "Send email" instead of only naming
the address to paste. An attachment that silently does not arrive is worse
than one the person was told to send another way — the recipient has no
idea either.

**The privacy policy's two hardest claims are true.** Worth checking rather
than assuming, because build 9 wrote them:

- *"A photo of a business card is read on your phone and not kept."*
  `scan-card.tsx` holds the image in component state for the preview and
  saves no image reference on the contact — only the fields the person
  confirms.
- *"A picture you choose for a person … stays on your phone; it is not
  uploaded."* `src/lib/photos.ts` keeps pictures in the app's own folder
  with only the file name in storage, deliberately outside sync, and
  `clearPhotos()` runs through `people.reset()` → `wipeDevice()` on both
  sign-out and account deletion. So "deletion removes everything" covers
  them too.

**The Lock Screen bar is on by default** (`src/lib/today-bar.ts`:
`let on = true`, turned off only by a stored `'off'`). It puts today's task
titles, 40 characters each, on a screen anyone can read without unlocking
the phone — and this app's titles are "Call the lawyer", "Chase the loan",
client names. Not a legal problem: nothing leaves the device, so neither
privacy form covers it, and iOS has its own system-wide switch.

It is a judgement call with an asymmetry worth naming. Default off costs
discoverability of a feature people would like. Default on costs the one
person whose screen was read over their shoulder, and that person writes
the review. **Recommend defaulting it off and offering it after the first
focus session**; it is one line either way, and it is a product decision,
so it is raised here rather than changed.

### 2.60 An address that steers the link it goes into

`mailtoUrl` interpolates the recipient without encoding it:
`mailto:${to}?subject=…&body=…`. `?`, `&` and `#` are exactly what separate
a mailto's parameters, so an address carrying one appends its own.

```
emailValid('omar@x.sa?body=hello')  →  true
mailtoUrl(…)  →  mailto:omar@x.sa?body=hello?subject=Hi&body=Body
```

The mail app reads the first `body`, so the message sent is not the message
the app showed. That matters more here than in most apps, because the whole
promise of Compose is that the person presses send themselves — and they
would be pressing send on text they never saw, from their own account.

**The obvious attack was already blocked, for the wrong reason.**
`?bcc=someone@else.com` fails only because the pattern refuses a second
`@`. Nothing was defending the parameter separators; an injection without
an `@` in it walked through. A defence that holds by coincidence is worth
no more than the coincidence.

Addresses are not the person's own typing: build 9 taught the app to read
them from spreadsheets, PDFs and photographed business cards, which is
exactly the kind of file a partner hands you. So the pattern now refuses
`?`, `&` and `#`, in `features/compose/recipient.ts` and again in the
importer, where the row is flagged `bad-email` on the review screen rather
than stored as a contact that cannot be used safely. Ordinary addresses —
`a.b+tag@sub.example.co.uk` among them — are unaffected.

Tightening the pattern beats encoding the recipient: `encodeURIComponent`
would turn `@` into `%40`, which RFC 6068 allows and some mail clients
still mishandle. The addresses worth sending to do not contain these
characters.

`maps.ts` was checked at the same time and is clean — fixed https scheme,
the address properly encoded. `whatsAppUrl` strips everything but digits
from the number, so it has nothing to steer.

### 2.61 A note that rewrote every contact, once per character

`app/contact.tsx` bound the "Remember for next time" note straight to the
store: `onChangeText={saveNote}` → `updateContact` → `setContacts`, and a
contact write serialises the **whole contact list** to storage. So each
character re-wrote every contact on the phone — and build 9's headline
feature is importing a few hundred prospects from a spreadsheet, which is
exactly the person this costs most.

The right pattern was already in the same file, 116 lines down: the quick
log types into local state and writes on a deliberate action. The note has
no Save button, so the deliberate action is a pause — 600 ms — with two
further guards, because a pause is the only thing between a typed note and
a note that was never kept: leaving the field commits it, and so does
leaving the screen.

**The test for this was asserting the behaviour, not the promise.** It read
"the note saves as it is typed" and checked storage 200 ms later, which
only a per-keystroke write can satisfy. What the person is owed is that
the note keeps itself without a Save button, which is what it checks now.

A new check covers typing and leaving at once, and it failed the first
time — usefully. `open()` in the browser suites is `page.goto`, a full page
load, and a page load never runs a React unmount, so the on-the-way-out
flush could not fire there. On a device the screen really does unmount and
it does. The blur guard is what makes the case safe in both, and the test
says which of the two it is exercising rather than implying the unmount
path is covered.

### 2.62 The Next queue, and a name spelled the other way

`src/features/next/build.ts` is the best-tested thing in build 9 and holds
up: the ranking is explainable, `followUpStates` really does only cover
people with an open follow-up (so "going quiet" cards do appear), and a
task hidden under "Later" still suppresses its person's quiet card — you
put it off, you do not then get nudged about them.

One real gap. `personFor` matched a task's `who` to a contact by plain
lower-cased comparison, and `nameKey` in `people/filters.ts` did the same,
so محمّد never found the contact saved as محمد. The parser has folded
Arabic spellings since §2.53 (`normalizeArabic`); these two paths, which
decide who a card is *about*, had never been told.

What it cost: a task spoken with diacritics came back with no `contactId`,
so it did not fold into that person's other cards, and it did not stop
them being listed as having gone quiet — the app would show a card about
calling Mohammed and, below it, a card saying Mohammed has gone quiet.
`nameKey` now folds Arabic and is shared by both, which also makes the
follow-up matching in `followUpStates` tolerant of the same thing.

Also corrected, a doc rather than a defect: the tab badge's comment said
it counts "how many of those [cards]" are urgent. It counts them *before*
the fold, which is right — three late tasks with one person are one card
saying "+2 more" and three on the badge, because three things are waiting.
The comment now says so, and a test pins it, because the next person to
read that line would have "fixed" it.

### 2.63 The bilingual copy, checked rather than trusted

`additions.ts` is 907 lines of copy, and copy has no logic to review — so
the question is not whether it is correct but whether anything is missing,
in the language neither reviewer reads fluently enough to notice by eye.

TypeScript already covers half of it: each `_ar` block is declared `typeof`
its `_en` block, so a missing *key* is a compile error. What the compiler
cannot see is inside the strings. Two things can go wrong there and ship —
an Arabic line left blank, and one that lost the `{n}` or `{to}` the code
substitutes into, which renders the braces to the person reading it.

**All 964 pairs pass.** Nothing blank, and every placeholder present on
both sides. Four pairs differ deliberately — `{name}` against `{الاسم}` —
and both substitutions accept either spelling, which was worth confirming
rather than assuming: `saved.ts` and `bulk/plan.ts` each carry
`/\{(?:name|الاسم)\}/gi`.

Also checked and not a problem: 40 pairs are identical in both languages,
all of them internal keys ("gentle", "whatsapp"), times, icon names, brand
names (Zoom, Coursera) and the privacy address. No untranslated sentence
anywhere.

The useful part is that this is now `src/content/copy.test.ts` rather than
a throwaway script. A string added in English only, or an Arabic line that
loses its placeholder in a later edit, now fails before it reaches a store
reviewer. Confirmed by removing one `{to}` and watching it fail.

Two other things read closely and found sound: `toSaved` escapes a
person's name before building a `RegExp` from it, so a contact called
"Sara (Acme)" cannot break the saved-message round trip; and "Send later"
really does schedule — `remind: 'at'` derives the fire time from the
`dueAt` it sets, and the evening option correctly disappears once 18:00 is
less than two hours away.

### 2.64 The admin panel, and one sentence the policy cannot support

The panel had never been reviewed from this side. It holds every user's
name, phone, email, tasks and contacts, and it reaches Postgres through
`DATABASE_URL` — a direct connection, so row-level security protects
nothing here. The code *is* the boundary. It holds up:

- **Three independent conditions to be an admin**, all server-side: a
  Supabase session at assurance level 2 (password *and* TOTP), an
  `@onlyonething.app` address, and a row in `admin_member`. Any one missing
  and `currentAdmin()` returns null.
- **The configuration fails closed.** `mode()` throws when neither
  `DATABASE_URL` nor `ADMIN_DEMO=1` is set, throws when both are, and
  throws when live is set without the Supabase auth variables. A deployment
  cannot drift into demo mode, where the whole of auth is a cookie.
- **Nineteen server actions, nineteen `authorise()` calls.** Every page
  under `(panel)` calls `requireAdmin()`, and so does the layout above
  them. The three unguarded actions are sign-in, the code step and
  sign-out, which is right.
- **Least privilege where the handoff was silent.** An Analyst has
  `overview` and the pseudonymised `dataset` and nothing else — no route to
  a named person. Support cannot delete, suspend, grant Pro, issue codes,
  read the audit log or change the team.
- **The one-time /setup page** is gated on live mode, on
  `ADMIN_SETUP_SECRET` being set *and* typed (compared with
  `timingSafeEqual`), and on the team being empty — re-checked at both
  steps, with the insert itself conditional on an empty table.

**The gap is in the privacy policy, not the code.** It tells users:
*"Every time a team member opens your data it is recorded."*

Opening a user's **record** is recorded — the drawer's only route is
`openUser`, which authorises and writes an audit line before returning
anything. But the Users **list** is not. `userSelect` returns
`name, email, phone_dial, phone_number, job_title, country` for every user,
and the search box queries email and phone directly — so a Support account
can browse everyone's contact details, and confirm whether a given phone
number belongs to a user, without leaving a trace.

Read strictly, the sentence is not true. Three ways to make it true, and
the choice is the product owner's because it is a promise to users:

1. **Narrow the sentence** — "every time a team member opens your record".
   One line, accurate immediately, and a weaker promise than the one
   currently made.
2. **Show less in the list** — name, plan and country, with email and phone
   only in the audited drawer. The best answer for the user, and a design
   change.
3. **Audit list views too.** Honest, and it would bury the log that matters
   under a row per page load and per keystroke of a search.

Recommend 2, with 1 until it is built. What should not happen is leaving a
promise in the policy that the panel does not keep.
